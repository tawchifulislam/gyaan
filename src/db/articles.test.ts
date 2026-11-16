import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { chunkArticle } from '../core/chunker.js';
import type { Article } from '../core/types.js';
import {
  countPending,
  hashArticle,
  pendingChunks,
  pruneMissing,
  saveEmbedding,
  searchChunks,
  upsertArticle,
} from './articles.js';
import type { Db } from './db.js';
import { migrate } from './migrate.js';
import { createTestDb } from './testing.js';

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
  publishedAt: '2026-09-01T00:00:00.000Z',
  content: `<h2>One</h2><p>${words(60, `${id}a`)}</p><h2>Two</h2><p>${words(60, `${id}b`)}</p>`,
  ...extra,
});
const store = (a: Article) => upsertArticle(db, a, chunkArticle(a));
const MODEL = 'test:model';

describe('upsertArticle', () => {
  it('adds an article with its chunks, all pending', async () => {
    const r = await store(article('1'));
    expect(r).toEqual({ status: 'added', chunks: 2, reused: 0 });
    expect(await countPending(db, MODEL)).toBe(2);
    const row = (await db.query<{ slug: string; language: string }>('SELECT slug, language FROM articles')).rows[0];
    expect(row).toMatchObject({ slug: 'slug-1', language: 'bn' });
  });

  it('does nothing when the article is unchanged', async () => {
    await store(article('1'));
    const first = (await db.query<{ synced_at: string }>('SELECT synced_at::text FROM articles')).rows[0];
    const r = await store(article('1'));
    expect(r.status).toBe('unchanged');
    const after = (await db.query<{ synced_at: string }>('SELECT synced_at::text FROM articles')).rows[0];
    expect(after).toEqual(first);
  });

  it('keeps embeddings of chunks whose text did not change and re-queues the ones that did', async () => {
    await store(article('1'));
    for (const c of await pendingChunks(db, MODEL, 10)) await saveEmbedding(db, c.id, [1, 0, 0], MODEL);
    expect(await countPending(db, MODEL)).toBe(0);

    // change only the second section
    const edited = article('1', {
      content: `<h2>One</h2><p>${words(60, '1a')}</p><h2>Two</h2><p>${words(60, 'CHANGED')}</p>`,
    });
    const r = await store(edited);
    expect(r).toEqual({ status: 'updated', chunks: 2, reused: 1 });
    expect(await countPending(db, MODEL)).toBe(1);
    const kept = (
      await db.query<{ position: number; embedding_model: string | null }>(
        'SELECT position, embedding_model FROM chunks ORDER BY position',
      )
    ).rows;
    expect(kept).toEqual([
      { position: 0, embedding_model: MODEL },
      { position: 1, embedding_model: null },
    ]);
  });

  it('re-embeds everything when the title changes (it is part of the embedded text)', async () => {
    await store(article('1'));
    for (const c of await pendingChunks(db, MODEL, 10)) await saveEmbedding(db, c.id, [1, 0, 0], MODEL);
    const r = await store(article('1', { title: 'A new title' }));
    expect(r.reused).toBe(0);
    expect(await countPending(db, MODEL)).toBe(2);
  });

  it('keeps the embeddings when only the slug changes', async () => {
    await store(article('1'));
    for (const c of await pendingChunks(db, MODEL, 10)) await saveEmbedding(db, c.id, [1, 0, 0], MODEL);
    const r = await store(article('1', { slug: 'renamed' }));
    expect(r).toMatchObject({ status: 'updated', reused: 2 });
    expect(await countPending(db, MODEL)).toBe(0);
    expect((await db.query<{ slug: string }>('SELECT slug FROM articles')).rows[0]?.slug).toBe('renamed');
  });

  it('drops chunks that no longer exist after an edit', async () => {
    await store(article('1'));
    await store(article('1', { content: `<h2>Only</h2><p>${words(60, 'x')}</p>` }));
    expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM chunks')).rows[0]?.n).toBe(1);
  });

  it('rolls back completely when a chunk cannot be stored', async () => {
    const a = article('1');
    const chunks = chunkArticle(a);
    const broken = chunks.map(c => ({ ...c, index: 0 })); // duplicate positions violate the unique key
    await expect(upsertArticle(db, a, broken)).rejects.toThrow();
    expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM articles')).rows[0]?.n).toBe(0);
  });

  it('hashes by content, slug, title and language', () => {
    const a = article('1');
    expect(hashArticle(a)).toBe(hashArticle({ ...a }));
    expect(hashArticle(a)).not.toBe(hashArticle({ ...a, title: 'x' }));
    expect(hashArticle(a)).not.toBe(hashArticle({ ...a, content: a.content + ' ' }));
  });
});

describe('pending chunks and models', () => {
  it('counts chunks embedded by another model as pending for the model now in use', async () => {
    await store(article('1'));
    for (const c of await pendingChunks(db, 'old:model', 10)) await saveEmbedding(db, c.id, [1, 0, 0], 'old:model');
    expect(await countPending(db, 'old:model')).toBe(0);
    expect(await countPending(db, 'new:model')).toBe(2);
  });
});

describe('searchChunks', () => {
  it('returns the nearest chunks first, only for the requested model', async () => {
    await store(article('1'));
    await store(article('2'));
    const chunks = (await db.query<{ id: string; article_id: string; position: number }>(
      'SELECT id::text AS id, article_id, position FROM chunks ORDER BY article_id, position',
    )).rows;
    const vectors: Record<string, number[]> = { '1#0': [1, 0, 0], '1#1': [0, 1, 0], '2#0': [0.9, 0.1, 0], '2#1': [0, 0, 1] };
    for (const c of chunks) await saveEmbedding(db, c.id, vectors[`${c.article_id}#${c.position}`] ?? [0, 0, 0], MODEL);
    // one chunk embedded by another model must be ignored
    await saveEmbedding(db, chunks[1]?.id ?? '', [1, 0, 0], 'other:model');

    const hits = await searchChunks(db, [1, 0, 0], MODEL, 2);
    expect(hits.map(h => `${h.articleId}#${h.position}`)).toEqual(['1#0', '2#0']);
    expect(hits[0]).toMatchObject({ slug: 'slug-1', title: 'Title 1' });
    expect(hits[0]?.score).toBeCloseTo(1);
    expect(hits[1]?.score).toBeLessThan(hits[0]?.score ?? 0);
  });
});

describe('pruneMissing', () => {
  const seed = async (n: number): Promise<string[]> => {
    const ids = Array.from({ length: n }, (_, i) => String(i + 1));
    for (const id of ids) await store(article(id));
    return ids;
  };
  const count = async (): Promise<number> =>
    (await db.query<{ n: number }>('SELECT count(*)::int AS n FROM articles')).rows[0]?.n ?? 0;

  it('removes articles that left the source and keeps the rest', async () => {
    await seed(5);
    expect(await pruneMissing(db, ['1', '2', '3', '4'])).toEqual(['5']);
    expect(await count()).toBe(4);
  });
  it('refuses to remove everything when the source is empty', async () => {
    await seed(3);
    await expect(pruneMissing(db, [])).rejects.toThrow(/returned none/);
    expect(await count()).toBe(3);
  });
  it('refuses to remove more than half at once, unless told to', async () => {
    await seed(6);
    await expect(pruneMissing(db, ['1', '2'])).rejects.toThrow(/refusing to remove 4 of 6/);
    expect(await count()).toBe(6);
    expect((await pruneMissing(db, ['1', '2'], { allowMass: true })).length).toBe(4);
    expect(await count()).toBe(2);
  });
  it('does nothing when nothing is missing', async () => {
    await seed(3);
    expect(await pruneMissing(db, ['1', '2', '3'])).toEqual([]);
  });
});
