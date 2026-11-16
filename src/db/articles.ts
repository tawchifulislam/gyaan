// Reading and writing articles, chunks and embeddings. Plain SQL, no ORM, so every query is visible.
import { createHash } from 'node:crypto';
import type { Article, Chunk } from '../core/types.js';
import type { Db } from './db.js';

/** Fingerprint of everything about a post that matters here. Unchanged hash = nothing to do. */
export const hashArticle = (a: Article): string =>
  createHash('sha256').update(JSON.stringify([a.slug, a.title, a.language, a.content])).digest('hex');

/** pgvector's text format: [0.1,0.2,0.3] */
export const toVector = (v: number[]): string => `[${v.join(',')}]`;

export interface UpsertResult {
  status: 'added' | 'updated' | 'unchanged';
  chunks: number;
  /** Chunks that kept their existing embedding because their text did not change */
  reused: number;
}

interface OldEmbedding {
  content_hash: string;
  embedding: string;
  embedding_model: string;
  embedding_dim: number;
  embedded_at: string;
}

/**
 * Stores an article and its chunks in one transaction.
 *  - same content as last time: nothing is touched
 *  - changed: the chunk rows are replaced, but any chunk whose text is identical to an old one
 *    keeps that old embedding, so only genuinely new text has to be embedded (and paid for in quota)
 */
export const upsertArticle = async (db: Db, article: Article, chunks: Chunk[]): Promise<UpsertResult> => {
  const hash = hashArticle(article);
  const existing = (await db.query<{ content_hash: string }>('SELECT content_hash FROM articles WHERE id = $1', [
    article.id,
  ])).rows[0];

  if (existing && existing.content_hash === hash) {
    const n = (await db.query<{ n: number }>('SELECT count(*)::int AS n FROM chunks WHERE article_id = $1', [article.id]))
      .rows[0]?.n ?? 0;
    return { status: 'unchanged', chunks: n, reused: n };
  }

  await db.exec('BEGIN');
  try {
    const old = new Map<string, OldEmbedding>();
    for (const row of (
      await db.query<OldEmbedding & Record<string, unknown>>(
        `SELECT content_hash, embedding::text AS embedding, embedding_model, embedding_dim, embedded_at::text AS embedded_at
           FROM chunks WHERE article_id = $1 AND embedding IS NOT NULL`,
        [article.id],
      )
    ).rows) {
      if (!old.has(row.content_hash)) old.set(row.content_hash, row);
    }

    await db.query(
      `INSERT INTO articles (id, slug, title, language, published_at, content_hash, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (id) DO UPDATE SET
         slug = EXCLUDED.slug, title = EXCLUDED.title, language = EXCLUDED.language,
         published_at = EXCLUDED.published_at, content_hash = EXCLUDED.content_hash, synced_at = now()`,
      [article.id, article.slug, article.title, article.language, article.publishedAt ?? null, hash],
    );

    await db.query('DELETE FROM chunks WHERE article_id = $1', [article.id]);

    let reused = 0;
    for (const c of chunks) {
      const kept = old.get(c.contentHash);
      if (kept) reused++;
      await db.query(
        `INSERT INTO chunks (article_id, position, heading, heading_id, text, embed_text, word_count, content_hash,
                             embedding, embedding_model, embedding_dim, embedded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, $10, $11, $12::timestamptz)`,
        [
          article.id,
          c.index,
          c.heading,
          c.headingId,
          c.text,
          c.embedText,
          c.wordCount,
          c.contentHash,
          kept?.embedding ?? null,
          kept?.embedding_model ?? null,
          kept?.embedding_dim ?? null,
          kept?.embedded_at ?? null,
        ],
      );
    }

    await db.exec('COMMIT');
    return { status: existing ? 'updated' : 'added', chunks: chunks.length, reused };
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
};

export const removeArticle = async (db: Db, id: string): Promise<void> => {
  await db.query('DELETE FROM articles WHERE id = $1', [id]);
};

/**
 * Removes articles that are no longer in the source (unpublished or deleted on the blog).
 * Safety rails, because a bad source response must not wipe the database:
 * an empty source, or a source that would remove more than half of what we have, is refused.
 */
export const pruneMissing = async (
  db: Db,
  keepIds: string[],
  options: { allowMass?: boolean } = {},
): Promise<string[]> => {
  const existing = (await db.query<{ id: string }>('SELECT id FROM articles')).rows.map(r => r.id);
  const keep = new Set(keepIds);
  const gone = existing.filter(id => !keep.has(id));
  if (!gone.length) return [];
  if (keepIds.length === 0) {
    throw new Error('refusing to remove every article because the source returned none');
  }
  if (!options.allowMass && existing.length >= 4 && gone.length > existing.length / 2) {
    throw new Error(
      `refusing to remove ${gone.length} of ${existing.length} articles at once (use --allow-mass-prune if that is really intended)`,
    );
  }
  for (const id of gone) await removeArticle(db, id);
  return gone;
};

export interface PendingChunk {
  id: string;
  embed_text: string;
}

/** Chunks with no embedding yet, or embedded by a different model than the one in use. */
export const pendingChunks = async (db: Db, model: string, limit: number): Promise<PendingChunk[]> =>
  (
    await db.query<PendingChunk & Record<string, unknown>>(
      `SELECT id::text AS id, embed_text FROM chunks
        WHERE embedding IS NULL OR embedding_model IS DISTINCT FROM $1
        ORDER BY id LIMIT $2`,
      [model, limit],
    )
  ).rows;

export const countPending = async (db: Db, model: string): Promise<number> =>
  (
    await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM chunks WHERE embedding IS NULL OR embedding_model IS DISTINCT FROM $1`,
      [model],
    )
  ).rows[0]?.n ?? 0;

export const saveEmbedding = async (db: Db, chunkId: string, vector: number[], model: string): Promise<void> => {
  await db.query(
    `UPDATE chunks SET embedding = $2::vector, embedding_model = $3, embedding_dim = $4, embedded_at = now()
      WHERE id = $1::bigint`,
    [chunkId, toVector(vector), model, vector.length],
  );
};

export interface SearchHit {
  chunkId: string;
  articleId: string;
  slug: string;
  title: string;
  position: number;
  heading: string;
  headingId: string;
  text: string;
  /** Cosine similarity, 1 = identical direction */
  score: number;
}

/** The k chunks nearest to the query, among chunks embedded with the given model. */
export const searchChunks = async (db: Db, vector: number[], model: string, k: number): Promise<SearchHit[]> => {
  const rows = (
    await db.query<Record<string, unknown>>(
      `SELECT c.id::text AS chunk_id, c.article_id, a.slug, a.title, c.position, c.heading, c.heading_id, c.text,
              1 - (c.embedding <=> $1::vector) AS score
         FROM chunks c JOIN articles a ON a.id = c.article_id
        WHERE c.embedding_model = $2
        ORDER BY c.embedding <=> $1::vector
        LIMIT $3`,
      [toVector(vector), model, k],
    )
  ).rows;
  return rows.map(r => ({
    chunkId: String(r.chunk_id),
    articleId: String(r.article_id),
    slug: String(r.slug),
    title: String(r.title),
    position: Number(r.position),
    heading: String(r.heading),
    headingId: String(r.heading_id),
    text: String(r.text),
    score: Number(r.score),
  }));
};
