import { describe, expect, it, vi } from 'vitest';
import { GeminiGenerator } from './generate.js';
import { RateLimiter } from './rateLimiter.js';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const ok = (text: string, usage = { promptTokenCount: 100, candidatesTokenCount: 20 }): unknown => ({
  candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
  usageMetadata: usage,
});

const limiter = (): RateLimiter => new RateLimiter(1000, 1e9, () => 0, async () => undefined);
const noSleep = async (): Promise<void> => undefined;

const make = (fetchImpl: typeof fetch, extra: Record<string, unknown> = {}): GeminiGenerator =>
  new GeminiGenerator({ apiKey: 'k', model: 'gemini-3.1-flash-lite', fetchImpl, limiter: limiter(), sleep: noSleep, ...extra });

describe('GeminiGenerator', () => {
  it('sends the documented request and reads text and token usage', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return json(ok('{"a":1}', { promptTokenCount: 120, candidatesTokenCount: 30, thoughtsTokenCount: 50 } as never));
    }) as unknown as typeof fetch;

    const r = await make(fetchImpl).generate({
      system: 'SYS',
      user: 'USER',
      jsonSchema: { type: 'OBJECT' },
      maxOutputTokens: 500,
      temperature: 0,
    });

    expect(calls[0]?.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
    expect((calls[0]?.init.headers as Record<string, string>)['x-goog-api-key']).toBe('k');
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'SYS' }] });
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'USER' }] }]);
    expect(body.generationConfig).toMatchObject({
      temperature: 0,
      maxOutputTokens: 500,
      responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT' },
    });
    expect(body.generationConfig.thinkingConfig).toBeUndefined();
    expect(r).toMatchObject({ text: '{"a":1}', inputTokens: 120, outputTokens: 80, finishReason: 'STOP' });
  });

  it('leaves out thinking parts and joins the rest', async () => {
    const fetchImpl = (async () =>
      json({
        candidates: [{ content: { parts: [{ text: 'hidden', thought: true }, { text: 'A' }, { text: 'B' }] } }],
      })) as unknown as typeof fetch;
    expect((await make(fetchImpl).generate({ system: 's', user: 'u' })).text).toBe('AB');
  });

  it('sends thinkingConfig only when asked to', async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return json(ok('x'));
    }) as unknown as typeof fetch;
    await make(fetchImpl, { thinkingLevel: 'minimal' }).generate({ system: 's', user: 'u' });
    expect((bodies[0]?.generationConfig as Record<string, unknown>).thinkingConfig).toEqual({ thinkingLevel: 'minimal' });
  });

  it('retries a 429 and honours Retry-After', async () => {
    let n = 0;
    const waits: number[] = [];
    const fetchImpl = (async () => {
      n++;
      return n === 1 ? new Response('quota', { status: 429, headers: { 'retry-after': '9' } }) : json(ok('fine'));
    }) as unknown as typeof fetch;
    const g = make(fetchImpl, { sleep: async (ms: number) => void waits.push(ms) });
    expect((await g.generate({ system: 's', user: 'u' })).text).toBe('fine');
    expect(waits).toEqual([9000]);
  });

  it('drops a rejected response schema and tries again, once', async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      bodies.push(body);
      return body.generationConfig.responseSchema
        ? new Response('Invalid responseSchema', { status: 400 })
        : json(ok('{"ok":true}'));
    }) as unknown as typeof fetch;
    const r = await make(fetchImpl).generate({ system: 's', user: 'u', jsonSchema: { type: 'OBJECT' } });
    expect(r.text).toBe('{"ok":true}');
    expect(bodies).toHaveLength(2);
    expect((bodies[1]?.generationConfig as Record<string, unknown>).responseMimeType).toBe('application/json');
  });

  it('drops a rejected thinking setting and tries again', async () => {
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return body.generationConfig.thinkingConfig ? new Response('thinking level not supported', { status: 400 }) : json(ok('fine'));
    }) as unknown as typeof fetch;
    expect((await make(fetchImpl, { thinkingLevel: 'low' }).generate({ system: 's', user: 'u' })).text).toBe('fine');
  });

  it('fails on a blocked request, and on other 4xx errors without leaking the key', async () => {
    const blocked = (async () => json({ promptFeedback: { blockReason: 'SAFETY' } })) as unknown as typeof fetch;
    await expect(make(blocked).generate({ system: 's', user: 'u' })).rejects.toThrow(/blocked \(SAFETY\)/);

    const denied = (async () => new Response('API key not valid', { status: 403 })) as unknown as typeof fetch;
    const err = await make(denied, { apiKey: 'super-secret' }).generate({ system: 's', user: 'u' }).catch((e: Error) => e);
    expect((err as Error).message).toContain('403');
    expect((err as Error).message).not.toContain('super-secret');
  });

  it('gives up after repeated 503s', async () => {
    const fetchImpl = vi.fn(async () => new Response('busy', { status: 503 })) as unknown as typeof fetch;
    await expect(make(fetchImpl).generate({ system: 's', user: 'u' })).rejects.toThrow(/503/);
    expect((fetchImpl as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(6);
  });

  it('returns empty text (not a crash) when the model produced nothing', async () => {
    const fetchImpl = (async () => json({ candidates: [{ finishReason: 'MAX_TOKENS' }] })) as unknown as typeof fetch;
    const r = await make(fetchImpl).generate({ system: 's', user: 'u' });
    expect(r).toMatchObject({ text: '', finishReason: 'MAX_TOKENS' });
  });
});
