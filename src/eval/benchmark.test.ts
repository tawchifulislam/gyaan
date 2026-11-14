import { describe, expect, it } from 'vitest';
import { chunkArticle } from '../core/chunker.js';
import type { Article, EvalCase } from '../core/types.js';
import type { EmbeddingProvider } from '../providers/types.js';
import { fingerprintInputs, prepareQuery, runBenchmark } from './benchmark.js';
import { buildReport } from './report.js';

const words = (n: number, p: string): string => Array.from({ length: n }, (_, i) => `${p}${i}`).join(' ');

const articles: Article[] = [
  { id: '1', slug: 'cats', title: 'Cats', language: 'en', content: `<p>cat feline purr ${words(40, 'cat')}</p>` },
  { id: '2', slug: 'ships', title: 'Ships', language: 'en', content: `<p>ship sea sail ${words(40, 'ship')}</p>` },
];

// A fake "embedding": counts of the topic words, so retrieval is deterministic.
const topicVector = (text: string): number[] => [
  (text.match(/cat|feline|purr/g) ?? []).length,
  (text.match(/ship|sea|sail/g) ?? []).length,
  1,
];
const fake: EmbeddingProvider = {
  id: 'fake:topic',
  embedDocuments: async texts => texts.map(topicVector),
  embedQueries: async texts => texts.map(topicVector),
};

const cases: EvalCase[] = [
  { id: 'a', question: 'feline purr', language: 'en', category: 'direct', answerable: true, expectedArticles: ['cats'] },
  { id: 'b', question: 'sail the sea', language: 'en', category: 'direct', answerable: true, expectedArticles: ['ships'] },
  { id: 'c', question: 'cat and ship', language: 'en', category: 'multi-article', answerable: true, expectedArticles: ['cats', 'ships'] },
  { id: 'x', question: 'quantum chromodynamics', language: 'en', category: 'out-of-scope', answerable: false, expectedArticles: [] },
];

describe('runBenchmark', () => {
  it('computes recall, MRR, per-category numbers and out-of-scope separation', async () => {
    const chunks = articles.flatMap(a => chunkArticle(a));
    const r = await runBenchmark({ provider: fake, chunks, cases, digits: 'keep', now: () => new Date('2026-01-01T00:00:00Z') });

    expect(r.model).toBe('fake:topic');
    expect(r.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(r.corpus).toEqual({ articles: 2, chunks: 2 });
    expect(r.summary.answerableCases).toBe(3);
    expect(r.summary.outOfScopeCases).toBe(1);
    expect(r.summary.recall['1']).toBeCloseTo((1 + 1 + 0.5) / 3);
    expect(r.summary.recall['3']).toBe(1);
    expect(r.summary.mrr).toBe(1);
    expect(r.summary.rPrecision).toBe(1); // the two-article question has both articles in its top 2
    expect(r.cases.find(c => c.id === 'c')?.rPrecision).toBe(1);
    expect(r.cases.find(c => c.id === 'c')?.recall['1']).toBe(0.5); // recall@1 caps at 50% there
    expect(r.cases.find(c => c.id === 'a')?.margin).toBeGreaterThan(0);
    expect(r.summary.margin?.min).toBeGreaterThan(0);
    expect(r.summary.byCategory.direct).toMatchObject({ n: 2, recall1: 1 });
    expect(r.summary.separation?.auc).toBe(1);
    expect(r.cases.find(c => c.id === 'a')?.top[0]?.slug).toBe('cats');
  });

  it('fingerprints the questions and chunk texts, so mismatched runs can be spotted', () => {
    const chunks = articles.flatMap(a => chunkArticle(a));
    const a = fingerprintInputs(chunks, cases);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(fingerprintInputs(chunks, cases)).toBe(a);
    const changed = cases.map(c => (c.id === 'a' ? { ...c, question: 'something else' } : c));
    expect(fingerprintInputs(chunks, changed)).not.toBe(a);
    // the digit mode changes embedText but not the fingerprint
    const ascii = articles.flatMap(x => chunkArticle(x, { digits: 'ascii' }));
    expect(fingerprintInputs(ascii, cases)).toBe(a);
  });

  it('prepares queries the same way as documents (digits option)', () => {
    expect(prepareQuery('  ৭৮১  বছর ', 'ascii')).toBe('781 বছর');
    expect(prepareQuery('৭৮১ বছর', 'keep')).toBe('৭৮১ বছর');
  });
});

describe('buildReport', () => {
  it('renders the comparison tables for several models', async () => {
    const chunks = articles.flatMap(a => chunkArticle(a));
    const r1 = await runBenchmark({ provider: fake, chunks, cases, digits: 'keep' });
    const r2 = { ...r1, model: 'fake:other', summary: { ...r1.summary, mrr: 0.5 } };
    const md = buildReport([r2, r1]);
    expect(md).toContain('# Embedding benchmark');
    expect(md.indexOf('fake:topic')).toBeLessThan(md.indexOf('fake:other')); // best MRR first
    expect(md).toContain('recall@1');
    expect(md).toContain('R-precision');
    expect(md).toContain('margin');
    expect(md).toContain('AUC');
  });
  it('warns when results come from different inputs', async () => {
    const chunks = articles.flatMap(a => chunkArticle(a));
    const r1 = await runBenchmark({ provider: fake, chunks, cases, digits: 'keep' });
    const same = buildReport([r1, { ...r1, model: 'fake:two' }]);
    expect(same).not.toContain('**Warning:**');
    const mixed = buildReport([r1, { ...r1, model: 'fake:old', inputsHash: 'deadbeef' }]);
    expect(mixed).toContain('**Warning:**');
    const { inputsHash: _omit, ...legacy } = r1;
    expect(buildReport([r1, { ...legacy, model: 'fake:legacy' }])).toContain('**Warning:**');
  });

  it('handles no results', () => {
    expect(buildReport([])).toContain('No results yet');
  });
});
