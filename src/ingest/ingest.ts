import { chunkArticle } from '../core/chunker.js';
import type { Article } from '../core/types.js';
import { countPending, pendingChunks, pruneMissing, saveEmbedding, upsertArticle } from '../db/articles.js';
import type { Db } from '../db/db.js';
import type { EmbeddingProvider } from '../providers/types.js';

export interface EmbedResult {
  embedded: number;
  /** Set when the provider failed part-way. What was embedded before the failure is saved. */
  error?: string;
}

/**
 * Embeds every pending chunk, a few at a time, saving after each batch. If the provider fails
 * (a free-tier quota running out, say), the batches already done stay saved and a later run
 * picks up exactly where this one stopped.
 */
export const embedPending = async (
  db: Db,
  provider: EmbeddingProvider,
  options: { batchSize?: number; log?: (message: string) => void } = {},
): Promise<EmbedResult> => {
  const batchSize = options.batchSize ?? 5;
  const log = options.log ?? (() => undefined);
  let embedded = 0;
  try {
    for (;;) {
      const batch = await pendingChunks(db, provider.id, batchSize);
      if (!batch.length) break;
      const vectors = await provider.embedDocuments(batch.map(c => c.embed_text));
      if (vectors.length !== batch.length) throw new Error('provider returned the wrong number of embeddings');
      for (const [i, chunk] of batch.entries()) {
        await saveEmbedding(db, chunk.id, vectors[i] ?? [], provider.id);
      }
      embedded += batch.length;
      log(`  embedded ${embedded} chunk(s)...`);
    }
    return { embedded };
  } catch (err) {
    return { embedded, error: err instanceof Error ? err.message : String(err) };
  }
};

export interface IngestOptions {
  /** Omit to store chunks without embedding them (they stay pending). */
  provider?: EmbeddingProvider;
  prune?: boolean;
  allowMassPrune?: boolean;
  batchSize?: number;
  log?: (message: string) => void;
}

export interface IngestSummary {
  articles: { added: number; updated: number; unchanged: number; removed: number };
  chunks: { total: number; reused: number };
  pendingBefore: number;
  embedded: number;
  pendingAfter: number;
  error?: string;
}

export const ingestArticles = async (
  db: Db,
  articles: Article[],
  options: IngestOptions = {},
): Promise<IngestSummary> => {
  const log = options.log ?? (() => undefined);
  const summary: IngestSummary = {
    articles: { added: 0, updated: 0, unchanged: 0, removed: 0 },
    chunks: { total: 0, reused: 0 },
    pendingBefore: 0,
    embedded: 0,
    pendingAfter: 0,
  };

  for (const article of articles) {
    const result = await upsertArticle(db, article, chunkArticle(article));
    summary.articles[result.status]++;
    summary.chunks.total += result.chunks;
    summary.chunks.reused += result.reused;
    log(`  ${result.status.padEnd(9)} ${article.slug} (${result.chunks} chunk(s), ${result.reused} reused)`);
  }

  if (options.prune !== false) {
    const removed = await pruneMissing(
      db,
      articles.map(a => a.id),
      { allowMass: options.allowMassPrune ?? false },
    );
    summary.articles.removed = removed.length;
    for (const id of removed) log(`  removed   ${id} (no longer in the source)`);
  }

  const model = options.provider?.id ?? '';
  summary.pendingBefore = await countPending(db, model);
  if (options.provider) {
    const embed = await embedPending(db, options.provider, {
      ...(options.batchSize ? { batchSize: options.batchSize } : {}),
      log,
    });
    summary.embedded = embed.embedded;
    if (embed.error) summary.error = embed.error;
  }
  summary.pendingAfter = await countPending(db, model);
  return summary;
};
