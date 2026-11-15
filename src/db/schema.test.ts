import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from './db.js';
import { migrate } from './migrate.js';
import { createTestDb } from './testing.js';

let db: Db;
let close: () => Promise<void>;
beforeEach(async () => {
  ({ db, close } = await createTestDb());
  await migrate(db, path.resolve('migrations'));
  await db.query(
    `INSERT INTO articles (id, slug, title, language, content_hash) VALUES ('a1', 'one', 'One', 'bn', 'h1'), ('a2', 'two', 'Two', 'bn', 'h2')`,
  );
});
afterEach(async () => {
  await close();
});

const insertChunk = (articleId: string, position: number, extra = ''): Promise<unknown> =>
  db.query(
    `INSERT INTO chunks (article_id, position, text, embed_text, word_count, content_hash ${extra ? ', embedding, embedding_model, embedding_dim, embedded_at' : ''})
     VALUES ($1, $2, 't', 'e', 1, $3 ${extra})`,
    [articleId, position, `${articleId}-${position}`],
  );

describe('schema', () => {
  it('stores a chunk without an embedding (a pending chunk)', async () => {
    await insertChunk('a1', 0);
    const pending = await db.query('SELECT count(*)::int AS n FROM chunks WHERE embedding IS NULL');
    expect(pending.rows[0]).toMatchObject({ n: 1 });
  });

  it('stores an embedding together with its model and dimension', async () => {
    await insertChunk('a1', 0, `, '[1,2,3]', 'test-model', 3, now()`);
    const r = await db.query('SELECT embedding_dim, embedding_model FROM chunks');
    expect(r.rows[0]).toMatchObject({ embedding_dim: 3, embedding_model: 'test-model' });
  });

  it('rejects an inconsistent embedding (dimension does not match)', async () => {
    await expect(insertChunk('a1', 0, `, '[1,2,3]', 'm', 4, now()`)).rejects.toThrow(/chunks_embedding_consistent/);
  });

  it('rejects an embedding with no model name, and a model name with no embedding', async () => {
    await expect(insertChunk('a1', 0, `, '[1,2,3]', NULL, 3, now()`)).rejects.toThrow(/chunks_embedding_consistent/);
    await expect(insertChunk('a1', 1, `, NULL, 'm', NULL, NULL`)).rejects.toThrow(/chunks_embedding_consistent/);
  });

  it('keeps chunk positions unique within an article but not across articles', async () => {
    await insertChunk('a1', 0);
    await expect(insertChunk('a1', 0)).rejects.toThrow(/unique|duplicate/i);
    await expect(insertChunk('a2', 0)).resolves.toBeDefined();
  });

  it('deletes an article\'s chunks when the article is deleted', async () => {
    await insertChunk('a1', 0);
    await insertChunk('a1', 1);
    await insertChunk('a2', 0);
    await db.query("DELETE FROM articles WHERE id = 'a1'");
    const left = await db.query<{ article_id: string }>('SELECT article_id FROM chunks');
    expect(left.rows.map(r => r.article_id)).toEqual(['a2']);
  });

  it('refuses a chunk for an article that does not exist', async () => {
    await expect(insertChunk('ghost', 0)).rejects.toThrow(/foreign key|violates/i);
  });

  it('finds the nearest chunk by cosine distance', async () => {
    await insertChunk('a1', 0, `, '[1,0,0]', 'm', 3, now()`);
    await insertChunk('a1', 1, `, '[0,1,0]', 'm', 3, now()`);
    await insertChunk('a2', 0, `, '[0.9,0.1,0]', 'm', 3, now()`);
    const r = await db.query<{ article_id: string; position: number; sim: number }>(
      `SELECT article_id, position, 1 - (embedding <=> '[1,0,0]') AS sim
         FROM chunks WHERE embedding_model = 'm' ORDER BY embedding <=> '[1,0,0]' LIMIT 2`,
    );
    expect(r.rows.map(x => `${x.article_id}#${x.position}`)).toEqual(['a1#0', 'a2#0']);
    expect(r.rows[0]?.sim).toBeCloseTo(1);
  });
});
