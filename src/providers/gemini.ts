import { EmbeddingCache } from './cache.js';
import { realSleep } from './types.js';
import type { EmbeddingProvider, Sleep } from './types.js';

export interface GeminiOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  cache?: EmbeddingCache;
  /** Pause between requests, to stay polite on the free tier. */
  delayMs?: number;
  sleep?: Sleep;
  log?: (message: string) => void;
}

interface GeminiResponse {
  embedding?: { values: number[] };
  embeddings?: { values: number[] }[];
}

type Kind = 'document' | 'query';

/**
 * gemini-embedding-001 takes a taskType (RETRIEVAL_DOCUMENT / RETRIEVAL_QUERY).
 * gemini-embedding-2 does NOT accept a task type: the task is written into the text instead
 * ("task: search result | query: ..." for queries, "title: ... | text: ..." for documents).
 */
const usesTaskTypeField = (model: string): boolean => model.includes('embedding-001');

export class GeminiProvider implements EmbeddingProvider {
  readonly id: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly cache: EmbeddingCache;
  private readonly delayMs: number;
  private readonly sleep: Sleep;
  private readonly log: (message: string) => void;

  constructor(private readonly o: GeminiOptions) {
    this.id = `gemini:${o.model}`;
    this.baseUrl = (o.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    this.fetchImpl = o.fetchImpl ?? fetch;
    this.cache = o.cache ?? new EmbeddingCache(null);
    this.delayMs = o.delayMs ?? 700;
    this.sleep = o.sleep ?? realSleep;
    this.log = o.log ?? (() => undefined);
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts, 'document');
  }

  embedQueries(texts: string[]): Promise<number[][]> {
    return this.embed(texts, 'query');
  }

  private async embed(texts: string[], kind: Kind): Promise<number[][]> {
    const out: number[][] = [];
    for (const text of texts) {
      const key = EmbeddingCache.key(this.id, kind, text);
      const cached = this.cache.get(key);
      if (cached) {
        out.push(cached);
        continue;
      }
      const vector = await this.request(text, kind);
      this.cache.set(key, vector);
      this.cache.save();
      out.push(vector);
      await this.sleep(this.delayMs);
    }
    return out;
  }

  private body(text: string, kind: Kind): Record<string, unknown> {
    const model = `models/${this.o.model}`;
    if (usesTaskTypeField(this.o.model)) {
      return {
        model,
        content: { parts: [{ text }] },
        taskType: kind === 'document' ? 'RETRIEVAL_DOCUMENT' : 'RETRIEVAL_QUERY',
      };
    }
    const prepared =
      kind === 'document' ? `title: none | text: ${text}` : `task: search result | query: ${text}`;
    return { model, content: { parts: [{ text: prepared }] } };
  }

  private async request(text: string, kind: Kind): Promise<number[]> {
    for (let attempt = 0; ; attempt++) {
      const res = await this.fetchImpl(`${this.baseUrl}/models/${this.o.model}:embedContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': this.o.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(this.body(text, kind)),
      });

      if (res.ok) {
        const data = (await res.json()) as GeminiResponse;
        const values = data.embedding?.values ?? data.embeddings?.[0]?.values;
        if (!values) throw new Error(`Gemini ${this.o.model}: response had no embedding values`);
        return values;
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= 5) {
        const body = await res.text().catch(() => '');
        throw new Error(`Gemini ${this.o.model}: HTTP ${res.status} ${body.slice(0, 300)}`);
      }
      const retryAfter = Number(res.headers.get('retry-after'));
      const wait = retryAfter > 0 ? retryAfter * 1000 : 5000 * 2 ** attempt;
      this.log(`  Gemini answered ${res.status}, waiting ${Math.round(wait / 1000)}s (retry ${attempt + 1}/5)`);
      await this.sleep(wait);
    }
  }
}
