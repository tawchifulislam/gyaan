import { createHash } from 'node:crypto';
import { bnDigitsToAscii, normalizeText } from '../core/normalize.js';
import type { Chunk, EvalCase } from '../core/types.js';
import type { EmbeddingProvider } from '../providers/types.js';
import { analyseSeparation, rankArticles, recallAtK, reciprocalRank } from './metrics.js';
import type { Separation } from './metrics.js';

export const DEFAULT_KS = [1, 3, 5];

export interface CaseResult {
  id: string;
  category: string;
  answerable: boolean;
  expected: string[];
  /** Top 5 articles with their scores */
  top: { slug: string; score: number }[];
  recall: Record<string, number>;
  /** Share of the needed articles found in the top N, where N is how many are needed. For a one-article question this is "was the first result right?". */
  rPrecision: number;
  reciprocalRank: number;
  top1Score: number;
  /** Weakest needed article's score minus the best unneeded article's score. Positive = the right articles are clearly ahead. */
  margin: number | null;
}

export interface CategorySummary {
  n: number;
  recall1: number;
  rPrecision: number;
  mrr: number;
}

export interface BenchmarkResult {
  model: string;
  digits: 'keep' | 'ascii';
  createdAt: string;
  /** Fingerprint of the questions and chunk texts used. Results with different fingerprints must not be compared. */
  inputsHash?: string;
  corpus: { articles: number; chunks: number };
  ks: number[];
  summary: {
    answerableCases: number;
    outOfScopeCases: number;
    recall: Record<string, number>;
    rPrecision: number;
    mrr: number;
    margin: { min: number; median: number } | null;
    byCategory: Record<string, CategorySummary>;
    separation: Separation | null;
  };
  cases: CaseResult[];
}

export interface BenchmarkInput {
  provider: EmbeddingProvider;
  chunks: Chunk[];
  cases: EvalCase[];
  digits: 'keep' | 'ascii';
  ks?: number[];
  now?: () => Date;
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

const median = (xs: number[]): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (!sorted.length) return 0;
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

/** The query goes through the same normalisation as the documents did. */
export const prepareQuery = (question: string, digits: 'keep' | 'ascii'): string => {
  const q = normalizeText(question);
  return digits === 'ascii' ? bnDigitsToAscii(q) : q;
};

/** Short fingerprint of what was measured: the questions, their answers, and the chunk texts (not the digit mode). */
export const fingerprintInputs = (chunks: Chunk[], cases: EvalCase[]): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        cases: cases.map(c => [c.id, c.question, c.answerable !== false, c.expectedArticles ?? []]),
        chunks: chunks.map(c => [c.chunkId, c.text]),
      }),
    )
    .digest('hex')
    .slice(0, 8);

export const runBenchmark = async (input: BenchmarkInput): Promise<BenchmarkResult> => {
  const ks = input.ks ?? DEFAULT_KS;
  const { provider, chunks, cases, digits } = input;

  const docVectors = await provider.embedDocuments(chunks.map(c => c.embedText));
  const queryVectors = await provider.embedQueries(cases.map(c => prepareQuery(c.question, digits)));

  const chunkVectors = chunks.map((c, i) => ({
    articleSlug: c.articleSlug,
    chunkId: c.chunkId,
    vector: docVectors[i] ?? [],
  }));

  const results: CaseResult[] = cases.map((c, i) => {
    const ranked = rankArticles(queryVectors[i] ?? [], chunkVectors);
    const slugs = ranked.map(r => r.slug);
    const expected = c.expectedArticles ?? [];
    const needed = new Set(expected);
    const neededScores = ranked.filter(r => needed.has(r.slug)).map(r => r.score);
    const otherScores = ranked.filter(r => !needed.has(r.slug)).map(r => r.score);
    const margin =
      neededScores.length && otherScores.length
        ? Math.min(...neededScores) - Math.max(...otherScores)
        : null;
    return {
      id: c.id,
      category: c.category,
      answerable: c.answerable !== false,
      expected,
      top: ranked.slice(0, 5).map(r => ({ slug: r.slug, score: r.score })),
      recall: Object.fromEntries(ks.map(k => [String(k), recallAtK(slugs, expected, k)])),
      rPrecision: recallAtK(slugs, expected, expected.length),
      reciprocalRank: reciprocalRank(slugs, expected),
      top1Score: ranked[0]?.score ?? 0,
      margin,
    };
  });

  const answerable = results.filter(r => r.answerable);
  const outOfScope = results.filter(r => !r.answerable);

  const byCategory: Record<string, CategorySummary> = {};
  for (const cat of new Set(answerable.map(r => r.category))) {
    const rs = answerable.filter(r => r.category === cat);
    byCategory[cat] = {
      n: rs.length,
      recall1: mean(rs.map(r => r.recall['1'] ?? 0)),
      rPrecision: mean(rs.map(r => r.rPrecision)),
      mrr: mean(rs.map(r => r.reciprocalRank)),
    };
  }

  const margins = answerable.flatMap(r => (r.margin === null ? [] : [r.margin]));

  return {
    model: provider.id,
    digits,
    createdAt: (input.now?.() ?? new Date()).toISOString(),
    inputsHash: fingerprintInputs(chunks, cases),
    corpus: { articles: new Set(chunks.map(c => c.articleSlug)).size, chunks: chunks.length },
    ks,
    summary: {
      answerableCases: answerable.length,
      outOfScopeCases: outOfScope.length,
      recall: Object.fromEntries(ks.map(k => [String(k), mean(answerable.map(r => r.recall[String(k)] ?? 0))])),
      rPrecision: mean(answerable.map(r => r.rPrecision)),
      mrr: mean(answerable.map(r => r.reciprocalRank)),
      margin: margins.length ? { min: Math.min(...margins), median: median(margins) } : null,
      byCategory,
      separation: analyseSeparation(
        answerable.map(r => r.top1Score),
        outOfScope.map(r => r.top1Score),
      ),
    },
    cases: results,
  };
};
