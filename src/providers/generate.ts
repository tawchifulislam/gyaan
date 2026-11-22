// Text generation through the Gemini API (generateContent).
import { RateLimiter } from './rateLimiter.js';
import { estimateTokens, realSleep } from './types.js';
import type { Sleep } from './types.js';

export interface GenerationRequest {
  system: string;
  user: string;
  maxOutputTokens?: number;
  temperature?: number;
  /** Ask for JSON that follows this schema */
  jsonSchema?: Record<string, unknown>;
}

export interface GenerationResult {
  text: string;
  inputTokens: number;
  /** Includes any "thinking" tokens, which are billed (and rate-limited) as output */
  outputTokens: number;
  finishReason: string | undefined;
}

export interface TextGenerator {
  readonly id: string;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

export interface GeminiGeneratorOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  limiter?: RateLimiter;
  sleep?: Sleep;
  log?: (message: string) => void;
  /** e.g. "minimal" or "low". Left out unless set: not every model accepts it. */
  thinkingLevel?: string;
}

interface Part {
  text?: string;
  thought?: boolean;
}
interface GenerateResponse {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
}

export class GeminiGenerator implements TextGenerator {
  readonly id: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly limiter: RateLimiter;
  private readonly sleep: Sleep;
  private readonly log: (message: string) => void;

  constructor(private readonly o: GeminiGeneratorOptions) {
    this.id = `gemini:${o.model}`;
    this.baseUrl = (o.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    this.fetchImpl = o.fetchImpl ?? fetch;
    // Free tier of gemini-3.1-flash-lite: 15 requests/min, 250K tokens/min. Stay a little under.
    this.limiter = o.limiter ?? new RateLimiter(12, 200_000);
    this.sleep = o.sleep ?? realSleep;
    this.log = o.log ?? (() => undefined);
  }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    let useSchema = Boolean(req.jsonSchema);
    let useThinking = Boolean(this.o.thinkingLevel);
    let degrades = 0;

    for (let attempt = 0; ; attempt++) {
      await this.limiter.acquire(estimateTokens(req.system) + estimateTokens(req.user) + (req.maxOutputTokens ?? 2048));

      const generationConfig: Record<string, unknown> = {
        temperature: req.temperature ?? 0.2,
        maxOutputTokens: req.maxOutputTokens ?? 2048,
      };
      if (req.jsonSchema) {
        generationConfig.responseMimeType = 'application/json';
        if (useSchema) generationConfig.responseSchema = req.jsonSchema;
      }
      if (useThinking) generationConfig.thinkingConfig = { thinkingLevel: this.o.thinkingLevel };

      const res = await this.fetchImpl(`${this.baseUrl}/models/${this.o.model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': this.o.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts: [{ text: req.user }] }],
          generationConfig,
        }),
      });

      if (res.ok) return this.read((await res.json()) as GenerateResponse);

      const body = await res.text().catch(() => '');
      // A 400 can mean this model rejects the schema or the thinking setting: drop it and try again.
      if (res.status === 400 && degrades < 2) {
        if (useSchema && /schema/i.test(body)) {
          useSchema = false;
          degrades++;
          this.log('  the model rejected the response schema, retrying without it');
          continue;
        }
        if (useThinking && /think/i.test(body)) {
          useThinking = false;
          degrades++;
          this.log('  the model rejected the thinking setting, retrying without it');
          continue;
        }
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= 5) {
        throw new Error(`Gemini ${this.o.model}: HTTP ${res.status} ${body.slice(0, 300)}`);
      }
      const retryAfter = Number(res.headers.get('retry-after'));
      const wait = retryAfter > 0 ? retryAfter * 1000 : 5000 * 2 ** attempt;
      this.log(`  Gemini answered ${res.status}, waiting ${Math.round(wait / 1000)}s (retry ${attempt + 1}/5)`);
      await this.sleep(wait);
    }
  }

  private read(data: GenerateResponse): GenerationResult {
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Gemini ${this.o.model}: the request was blocked (${data.promptFeedback.blockReason})`);
    }
    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .filter(p => !p.thought && typeof p.text === 'string')
      .map(p => p.text)
      .join('');
    const u = data.usageMetadata ?? {};
    return {
      text,
      inputTokens: u.promptTokenCount ?? 0,
      outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
      finishReason: candidate?.finishReason,
    };
  }
}
