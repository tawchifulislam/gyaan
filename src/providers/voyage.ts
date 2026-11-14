import { EmbeddingCache } from './cache.js';
import { RateLimiter } from './rateLimiter.js';
import { estimateTokens, realSleep } from './types.js';
import type { EmbeddingProvider, Sleep } from './types.js';

export interface VoyageOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  limiter?: RateLimiter;
  cache?: EmbeddingCache;
  /** Estimated tokens per request; keeps each call under the free-tier TPM budget. */
  maxBatchTokens?: number;
  sleep?: Sleep;
  log?: (message: string) => void;
}

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
}

type InputType = 'document' | 'query';

export class VoyageProvider implements EmbeddingProvider {
  readonly id: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly limiter: RateLimiter;
  private readonly cache: EmbeddingCache;
  private readonly maxBatchTokens: number;
  private readonly sleep: Sleep;
  private readonly log: (message: string) => void;

  constructor(private readonly o: VoyageOptions) {
    this.id = `voyage:${o.model}`;
    this.baseUrl = (o.baseUrl ?? 'https://api.voyageai.com/v1').replace(/\/+$/, '');
    this.fetchImpl = o.fetchImpl ?? fetch;
    this.limiter = o.limiter ?? new RateLimiter(3, 10_000);
    this.cache = o.cache ?? new EmbeddingCache(null);
    this.maxBatchTokens = o.maxBatchTokens ?? 6000;
    this.sleep = o.sleep ?? realSleep;
    this.log = o.log ?? (() => undefined);
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts, 'document');
  }

  embedQueries(texts: string[]): Promise<number[][]> {
    return this.embed(texts, 'query');
  }

  private async embed(texts: string[], inputType: InputType): Promise<number[][]> {
    const keys = texts.map(t => EmbeddingCache.key(this.id, inputType, t));
    const result: (number[] | undefined)[] = keys.map(k => this.cache.get(k));

    const missing = result.flatMap((v, i) => (v ? [] : [i]));
    for (const batch of this.batches(missing, texts)) {
      const input = batch.map(i => texts[i] ?? '');
      const vectors = await this.request(input, inputType);
      batch.forEach((textIndex, n) => {
        const vector = vectors[n];
        if (!vector) throw new Error('Voyage returned fewer embeddings than inputs');
        result[textIndex] = vector;
        this.cache.set(keys[textIndex] ?? '', vector);
      });
      this.cache.save();
    }

    return result.map(v => {
      if (!v) throw new Error('missing embedding');
      return v;
    });
  }

  private batches(indexes: number[], texts: string[]): number[][] {
    const out: number[][] = [];
    let current: number[] = [];
    let tokens = 0;
    for (const i of indexes) {
      const t = estimateTokens(texts[i] ?? '');
      if (current.length && tokens + t > this.maxBatchTokens) {
        out.push(current);
        current = [];
        tokens = 0;
      }
      current.push(i);
      tokens += t;
    }
    if (current.length) out.push(current);
    return out;
  }

  private async request(input: string[], inputType: InputType): Promise<number[][]> {
    const tokens = input.reduce((sum, t) => sum + estimateTokens(t), 0);
    for (let attempt = 0; ; attempt++) {
      await this.limiter.acquire(tokens);
      const res = await this.fetchImpl(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.o.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          model: this.o.model,
          input_type: inputType,
          truncation: true,
        }),
      });

      if (res.ok) {
        const body = (await res.json()) as VoyageResponse;
        return [...body.data].sort((a, b) => a.index - b.index).map(d => d.embedding);
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= 4) {
        const text = await res.text().catch(() => '');
        throw new Error(`Voyage ${this.o.model}: HTTP ${res.status} ${text.slice(0, 300)}`);
      }
      this.log(`  Voyage answered ${res.status}, waiting before retry ${attempt + 1}/4`);
      await this.sleep(61_000);
    }
  }
}
