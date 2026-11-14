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
  reciprocalRank: number;
  top1Score: number;
}

export interface CategorySummary {
  n: number;
  recall1: number;
  mrr: number;
}

export interface BenchmarkResult {
  model: string;
  digits: 'keep' | 'ascii';
  createdAt: string;
  corpus: { articles: number; chunks: number };
  ks: number[];
  summary: {
    answerableCases: number;
    outOfScopeCases: number;
    recall: Record<string, number>;
    mrr: number;
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

/** The query goes through the same normalisation as the documents did. */
export const prepareQuery = (question: string, digits: 'keep' | 'ascii'): string => {
  const q = normalizeText(question);
  return digits === 'ascii' ? bnDigitsToAscii(q) : q;
};

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
    return {
      id: c.id,
      category: c.category,
      answerable: c.answerable !== false,
      expected,
      top: ranked.slice(0, 5).map(r => ({ slug: r.slug, score: r.score })),
      recall: Object.fromEntries(ks.map(k => [String(k), recallAtK(slugs, expected, k)])),
      reciprocalRank: reciprocalRank(slugs, expected),
      top1Score: ranked[0]?.score ?? 0,
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
      mrr: mean(rs.map(r => r.reciprocalRank)),
    };
  }

  return {
    model: provider.id,
    digits,
    createdAt: (input.now?.() ?? new Date()).toISOString(),
    corpus: { articles: new Set(chunks.map(c => c.articleSlug)).size, chunks: chunks.length },
    ks,
    summary: {
      answerableCases: answerable.length,
      outOfScopeCases: outOfScope.length,
      recall: Object.fromEntries(ks.map(k => [String(k), mean(answerable.map(r => r.recall[String(k)] ?? 0))])),
      mrr: mean(answerable.map(r => r.reciprocalRank)),
      byCategory,
      separation: analyseSeparation(
        answerable.map(r => r.top1Score),
        outOfScope.map(r => r.top1Score),
      ),
    },
    cases: results,
  };
};
