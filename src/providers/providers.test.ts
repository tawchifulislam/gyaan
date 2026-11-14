import { describe, expect, it, vi } from 'vitest';
import { EmbeddingCache } from './cache.js';
import { GeminiProvider } from './gemini.js';
import { createProvider, missingKey } from './index.js';
import { RateLimiter } from './rateLimiter.js';
import { VoyageProvider } from './voyage.js';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const noSleep = async (): Promise<void> => undefined;

describe('RateLimiter', () => {
  it('lets 3 requests through, then makes the 4th wait for the window to clear', async () => {
    let clock = 0;
    const sleeps: number[] = [];
    const limiter = new RateLimiter(3, 10_000, () => clock, async ms => {
      sleeps.push(ms);
      clock += ms;
    });
    for (let i = 0; i < 3; i++) await limiter.acquire(100);
    expect(sleeps).toEqual([]);
    await limiter.acquire(100);
    expect(sleeps.reduce((s, x) => s + x, 0)).toBeGreaterThanOrEqual(60_000);
  });

  it('also respects the token budget', async () => {
    let clock = 0;
    let slept = 0;
    const limiter = new RateLimiter(100, 1000, () => clock, async ms => {
      slept += ms;
      clock += ms;
    });
    await limiter.acquire(800);
    await limiter.acquire(800);
    expect(slept).toBeGreaterThanOrEqual(60_000);
  });

  it('lets one oversized request through on its own', async () => {
    const limiter = new RateLimiter(3, 1000, () => 0, noSleep);
    await expect(limiter.acquire(50_000)).resolves.toBeUndefined();
  });
});

describe('EmbeddingCache', () => {
  it('gives different keys for different inputs and the same key for the same input', () => {
    expect(EmbeddingCache.key('m', 'query', 'a')).toBe(EmbeddingCache.key('m', 'query', 'a'));
    expect(EmbeddingCache.key('m', 'query', 'a')).not.toBe(EmbeddingCache.key('m', 'document', 'a'));
  });
});

describe('VoyageProvider', () => {
  const embeddingsFor = (input: string[]) => ({
    data: input.map((t, index) => ({ index, embedding: [t.length, 1] })).reverse(), // out of order on purpose
  });

  it('sends the documented request and restores input order', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return json(embeddingsFor(JSON.parse(String(init.body)).input as string[]));
    }) as unknown as typeof fetch;

    const p = new VoyageProvider({
      apiKey: 'k',
      model: 'voyage-4',
      fetchImpl,
      limiter: new RateLimiter(100, 1e9, () => 0, noSleep),
    });
    const out = await p.embedDocuments(['a', 'bbb', 'cc']);

    expect(out).toEqual([[1, 1], [3, 1], [2, 1]]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://api.voyageai.com/v1/embeddings');
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer k');
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      model: 'voyage-4',
      input_type: 'document',
      input: ['a', 'bbb', 'cc'],
    });
  });

  it('uses input_type "query" for queries', async () => {
    const fetchImpl = vi.fn(async (_u: string, init: RequestInit) =>
      json(embeddingsFor(JSON.parse(String(init.body)).input as string[])),
    ) as unknown as typeof fetch;
    const p = new VoyageProvider({ apiKey: 'k', model: 'voyage-4', fetchImpl, limiter: new RateLimiter(100, 1e9, () => 0, noSleep) });
    await p.embedQueries(['q']);
    const body = JSON.parse(String((fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]?.[1].body));
    expect(body.input_type).toBe('query');
  });

  it('splits work into several requests when the token budget is small', async () => {
    const sizes: number[] = [];
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      const input = JSON.parse(String(init.body)).input as string[];
      sizes.push(input.length);
      return json(embeddingsFor(input));
    }) as unknown as typeof fetch;
    const p = new VoyageProvider({
      apiKey: 'k',
      model: 'voyage-4',
      fetchImpl,
      limiter: new RateLimiter(100, 1e9, () => 0, noSleep),
      maxBatchTokens: 100,
    });
    await p.embedDocuments(['x'.repeat(90), 'x'.repeat(90), 'x'.repeat(90)]); // ~60 tokens each
    expect(sizes).toEqual([1, 1, 1]);
  });

  it('waits and retries after a 429, then succeeds', async () => {
    let n = 0;
    const waits: number[] = [];
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      n++;
      return n === 1 ? new Response('slow down', { status: 429 }) : json(embeddingsFor(JSON.parse(String(init.body)).input as string[]));
    }) as unknown as typeof fetch;
    const p = new VoyageProvider({
      apiKey: 'k',
      model: 'voyage-4',
      fetchImpl,
      limiter: new RateLimiter(100, 1e9, () => 0, noSleep),
      sleep: async ms => {
        waits.push(ms);
      },
    });
    await expect(p.embedQueries(['q'])).resolves.toHaveLength(1);
    expect(waits).toEqual([61_000]);
  });

  it('does not retry a 401 and never puts the key in the error', async () => {
    const fetchImpl = (async () => new Response('invalid key', { status: 401 })) as unknown as typeof fetch;
    const p = new VoyageProvider({ apiKey: 'secret-key', model: 'voyage-4', fetchImpl, limiter: new RateLimiter(100, 1e9, () => 0, noSleep) });
    const err = await p.embedQueries(['q']).catch((e: Error) => e);
    expect((err as Error).message).toContain('401');
    expect((err as Error).message).not.toContain('secret-key');
  });

  it('serves repeated texts from the cache without calling the API', async () => {
    const fetchImpl = vi.fn(async (_u: string, init: RequestInit) =>
      json(embeddingsFor(JSON.parse(String(init.body)).input as string[])),
    ) as unknown as typeof fetch;
    const cache = new EmbeddingCache(null);
    const p = new VoyageProvider({ apiKey: 'k', model: 'voyage-4', fetchImpl, cache, limiter: new RateLimiter(100, 1e9, () => 0, noSleep) });
    await p.embedQueries(['same']);
    await p.embedQueries(['same']);
    expect((fetchImpl as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1);
  });
});

describe('GeminiProvider', () => {
  const capture = () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return json({ embedding: { values: [0.1, 0.2] } });
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  };

  it('gemini-embedding-001 uses the taskType field and the plain text', async () => {
    const { calls, fetchImpl } = capture();
    const p = new GeminiProvider({ apiKey: 'g', model: 'gemini-embedding-001', fetchImpl, sleep: noSleep });
    await p.embedDocuments(['doc text']);
    await p.embedQueries(['what?']);

    expect(calls[0]?.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent');
    expect((calls[0]?.init.headers as Record<string, string>)['x-goog-api-key']).toBe('g');
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      model: 'models/gemini-embedding-001',
      taskType: 'RETRIEVAL_DOCUMENT',
      content: { parts: [{ text: 'doc text' }] },
    });
    expect(JSON.parse(String(calls[1]?.init.body)).taskType).toBe('RETRIEVAL_QUERY');
  });

  it('gemini-embedding-2 has no taskType; the task goes into the text', async () => {
    const { calls, fetchImpl } = capture();
    const p = new GeminiProvider({ apiKey: 'g', model: 'gemini-embedding-2', fetchImpl, sleep: noSleep });
    await p.embedDocuments(['doc text']);
    await p.embedQueries(['what?']);

    const doc = JSON.parse(String(calls[0]?.init.body));
    const query = JSON.parse(String(calls[1]?.init.body));
    expect(doc.taskType).toBeUndefined();
    expect(doc.content.parts[0].text).toBe('title: none | text: doc text');
    expect(query.content.parts[0].text).toBe('task: search result | query: what?');
  });

  it('honours Retry-After on a 429', async () => {
    let n = 0;
    const waits: number[] = [];
    const fetchImpl = (async () => {
      n++;
      return n === 1 ? new Response('quota', { status: 429, headers: { 'retry-after': '7' } }) : json({ embedding: { values: [1] } });
    }) as unknown as typeof fetch;
    const p = new GeminiProvider({
      apiKey: 'g',
      model: 'gemini-embedding-001',
      fetchImpl,
      delayMs: 0,
      sleep: async ms => {
        waits.push(ms);
      },
    });
    await p.embedQueries(['q']);
    expect(waits[0]).toBe(7000);
  });

  it('also understands an "embeddings" array response', async () => {
    const fetchImpl = (async () => json({ embeddings: [{ values: [9, 9] }] })) as unknown as typeof fetch;
    const p = new GeminiProvider({ apiKey: 'g', model: 'gemini-embedding-001', fetchImpl, sleep: noSleep });
    expect(await p.embedQueries(['q'])).toEqual([[9, 9]]);
  });
});

describe('provider factory', () => {
  it('reports which key is missing', () => {
    expect(missingKey('voyage:voyage-4', {})).toBe('VOYAGE_API_KEY');
    expect(missingKey('gemini:gemini-embedding-001', {})).toBe('GEMINI_API_KEY');
    expect(missingKey('voyage:voyage-4', { VOYAGE_API_KEY: 'x' })).toBeNull();
  });
  it('rejects bad specs', () => {
    expect(() => createProvider('voyage', { VOYAGE_API_KEY: 'x' })).toThrow(/provider:model/);
    expect(() => createProvider('other:thing', {})).toThrow(/Unknown provider/);
  });
});
