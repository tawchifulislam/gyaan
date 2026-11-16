import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Article } from '../core/types.js';
import { countPending } from '../db/articles.js';
import type { Db } from '../db/db.js';
import { migrate } from '../db/migrate.js';
import { createTestDb } from '../db/testing.js';
import type { EmbeddingProvider } from '../providers/types.js';
import { embedPending, ingestArticles } from './ingest.js';

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await migrate(db, path.resolve('migrations'));
});
afterAll(async () => {
  await close();
});
beforeEach(async () => {
  await db.exec('TRUNCATE articles CASCADE');
});

const words = (n: number, p: string): string => Array.from({ length: n }, (_, i) => `${p}${i}`).join(' ');
const article = (id: string, extra: Partial<Article> = {}): Article => ({
  id,
  slug: `slug-${id}`,
  title: `Title ${id}`,
  language: 'bn',
  content: `<h2>One</h2><p>${words(60, `${id}a`)}</p><h2>Two</h2><p>${words(60, `${id}b`)}</p>`,
  ...extra,
});

const fakeProvider = (opts: { failOnCall?: number } = {}) => {
  const calls: string[][] = [];
  const provider: EmbeddingProvider = {
    id: 'fake:model',
    embedQueries: async texts => texts.map(() => [0, 0, 1]),
    embedDocuments: async texts => {
      calls.push(texts);
      if (opts.failOnCall === calls.length) throw new Error('quota exhausted');
      return texts.map(() => [1, 0, 0]);
    },
  };
  return { provider, calls };
};

describe('ingestArticles', () => {
  it('stores chunks and embeds them in batches', async () => {
    const { provider, calls } = fakeProvider();
    const s = await ingestArticles(db, [article('1'), article('2'), article('3')], { provider, batchSize: 4 });
    expect(s.articles).toEqual({ added: 3, updated: 0, unchanged: 0, removed: 0 });
    expect(s.chunks.total).toBe(6);
    expect(s.pendingBefore).toBe(6);
    expect(s.embedded).toBe(6);
    expect(s.pendingAfter).toBe(0);
    expect(calls.map(c => c.length)).toEqual([4, 2]);
    expect(s.error).toBeUndefined();
  });

  it('a second run with the same articles embeds nothing', async () => {
    const { provider, calls } = fakeProvider();
    await ingestArticles(db, [article('1')], { provider });
    const before = calls.length;
    const s = await ingestArticles(db, [article('1')], { provider });
    expect(s.articles.unchanged).toBe(1);
    expect(s.embedded).toBe(0);
    expect(calls.length).toBe(before);
  });

  it('only embeds the chunk that changed', async () => {
    const { provider, calls } = fakeProvider();
    await ingestArticles(db, [article('1')], { provider });
    calls.length = 0;
    const edited = article('1', {
      content: `<h2>One</h2><p>${words(60, '1a')}</p><h2>Two</h2><p>${words(60, 'NEW')}</p>`,
    });
    const s = await ingestArticles(db, [edited], { provider });
    expect(s.articles.updated).toBe(1);
    expect(s.chunks.reused).toBe(1);
    expect(s.embedded).toBe(1);
    expect(calls.flat().length).toBe(1);
  });

  it('stores chunks without embedding when no provider is given', async () => {
    const s = await ingestArticles(db, [article('1')]);
    expect(s.embedded).toBe(0);
    expect(s.pendingAfter).toBe(2);
  });

  it('removes articles that left the source', async () => {
    await ingestArticles(db, [article('1'), article('2'), article('3'), article('4')]);
    const s = await ingestArticles(db, [article('1'), article('2'), article('3')]);
    expect(s.articles.removed).toBe(1);
  });

  it('keeps what was embedded before a failure, and finishes on the next run', async () => {
    const failing = fakeProvider({ failOnCall: 2 });
    const first = await ingestArticles(db, [article('1'), article('2'), article('3')], {
      provider: failing.provider,
      batchSize: 4,
    });
    expect(first.error).toMatch(/quota exhausted/);
    expect(first.embedded).toBe(4);
    expect(first.pendingAfter).toBe(2);

    const ok = fakeProvider();
    const second = await ingestArticles(db, [article('1'), article('2'), article('3')], { provider: ok.provider, batchSize: 4 });
    expect(second.error).toBeUndefined();
    expect(second.embedded).toBe(2);
    expect(second.pendingAfter).toBe(0);
  });

  it('re-embeds everything when the model changes', async () => {
    await ingestArticles(db, [article('1')], { provider: fakeProvider().provider });
    const other: EmbeddingProvider = { ...fakeProvider().provider, id: 'other:model' };
    expect(await countPending(db, other.id)).toBe(2);
    const r = await embedPending(db, other);
    expect(r.embedded).toBe(2);
    expect(await countPending(db, other.id)).toBe(0);
  });
});
