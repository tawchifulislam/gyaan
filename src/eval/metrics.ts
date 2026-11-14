// Pure retrieval metrics. No network, no I/O, fully unit-tested.

export const cosine = (a: number[], b: number[]): number => {
  if (a.length !== b.length) throw new Error(`vector length mismatch: ${a.length} vs ${b.length}`);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
};

export interface ChunkVector {
  articleSlug: string;
  chunkId: string;
  vector: number[];
}

export interface RankedArticle {
  slug: string;
  score: number;
  chunkId: string;
}

/** An article scores as high as its best-matching chunk. */
export const rankArticles = (query: number[], chunks: ChunkVector[]): RankedArticle[] => {
  const best = new Map<string, RankedArticle>();
  for (const c of chunks) {
    const score = cosine(query, c.vector);
    const current = best.get(c.articleSlug);
    if (!current || score > current.score) {
      best.set(c.articleSlug, { slug: c.articleSlug, score, chunkId: c.chunkId });
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
};

/** Share of the expected articles that appear in the top k. */
export const recallAtK = (ranked: string[], expected: string[], k: number): number => {
  if (expected.length === 0) return 0;
  const top = new Set(ranked.slice(0, k));
  return expected.filter(e => top.has(e)).length / expected.length;
};

/** 1 / rank of the first expected article (0 if none was retrieved). */
export const reciprocalRank = (ranked: string[], expected: string[]): number => {
  const want = new Set(expected);
  const i = ranked.findIndex(r => want.has(r));
  return i === -1 ? 0 : 1 / (i + 1);
};

export interface Separation {
  /** Chance that a random answerable question scores above a random out-of-scope one (1 = perfect, 0.5 = coin flip). */
  auc: number;
  /** "Answer only if the top score is at least this": the cut-off with the best balanced accuracy on this data. */
  threshold: number;
  accuracy: number;
  /** Answerable questions that stay answered at that threshold. */
  keepRate: number;
  /** Out-of-scope questions that get refused at that threshold. */
  refuseRate: number;
}

/** How well the top retrieval score separates answerable questions from out-of-scope ones. */
export const analyseSeparation = (positives: number[], negatives: number[]): Separation | null => {
  if (!positives.length || !negatives.length) return null;

  let wins = 0;
  for (const p of positives) for (const n of negatives) wins += p > n ? 1 : p === n ? 0.5 : 0;
  const auc = wins / (positives.length * negatives.length);

  const values = [...new Set([...positives, ...negatives])].sort((a, b) => a - b);
  const candidates = [
    (values[0] ?? 0) - 1e-6,
    ...values.slice(1).map((v, i) => (v + (values[i] ?? v)) / 2),
    (values[values.length - 1] ?? 0) + 1e-6,
  ];

  let best: Separation | null = null;
  let bestBalanced = -1;
  for (const t of candidates) {
    const keepRate = positives.filter(p => p >= t).length / positives.length;
    const refuseRate = negatives.filter(n => n < t).length / negatives.length;
    const accuracy =
      (positives.filter(p => p >= t).length + negatives.filter(n => n < t).length) /
      (positives.length + negatives.length);
    // Balanced accuracy, not plain accuracy: there are far more answerable questions than
    // out-of-scope ones, so plain accuracy would happily pick "answer everything".
    const balanced = (keepRate + refuseRate) / 2;
    if (!best || balanced > bestBalanced || (balanced === bestBalanced && accuracy > best.accuracy)) {
      best = { auc, threshold: t, accuracy, keepRate, refuseRate };
      bestBalanced = balanced;
    }
  }
  return best;
};
