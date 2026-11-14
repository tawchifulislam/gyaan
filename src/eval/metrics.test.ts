import { describe, expect, it } from 'vitest';
import { analyseSeparation, cosine, rankArticles, recallAtK, reciprocalRank } from './metrics.js';

describe('cosine', () => {
  it('is 1 for identical direction, 0 for orthogonal, -1 for opposite', () => {
    expect(cosine([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([1, 0], [-1, 0])).toBeCloseTo(-1);
  });
  it('returns 0 for a zero vector and throws on a length mismatch', () => {
    expect(cosine([0, 0], [1, 1])).toBe(0);
    expect(() => cosine([1], [1, 2])).toThrow(/mismatch/);
  });
});

describe('rankArticles', () => {
  it('scores an article by its best chunk and sorts descending', () => {
    const chunks = [
      { articleSlug: 'a', chunkId: 'a#0', vector: [1, 0] },
      { articleSlug: 'a', chunkId: 'a#1', vector: [0, 1] },
      { articleSlug: 'b', chunkId: 'b#0', vector: [1, 1] },
    ];
    const ranked = rankArticles([0, 1], chunks);
    expect(ranked.map(r => r.slug)).toEqual(['a', 'b']);
    expect(ranked[0]).toMatchObject({ slug: 'a', chunkId: 'a#1' });
    expect(ranked[0]?.score).toBeCloseTo(1);
  });
});

describe('recall and reciprocal rank', () => {
  const ranked = ['x', 'y', 'z', 'w'];
  it('recall@k is the share of expected articles in the top k', () => {
    expect(recallAtK(ranked, ['y'], 1)).toBe(0);
    expect(recallAtK(ranked, ['y'], 2)).toBe(1);
    expect(recallAtK(ranked, ['x', 'w'], 3)).toBe(0.5);
    expect(recallAtK(ranked, [], 3)).toBe(0);
  });
  it('reciprocal rank uses the first expected article, 0 if absent', () => {
    expect(reciprocalRank(ranked, ['x'])).toBe(1);
    expect(reciprocalRank(ranked, ['z', 'y'])).toBe(0.5);
    expect(reciprocalRank(ranked, ['nope'])).toBe(0);
  });
});

describe('analyseSeparation', () => {
  it('finds a perfect split', () => {
    const s = analyseSeparation([0.8, 0.7, 0.9], [0.3, 0.4]);
    expect(s?.auc).toBe(1);
    expect(s?.accuracy).toBe(1);
    expect(s?.threshold).toBeGreaterThan(0.4);
    expect(s?.threshold).toBeLessThan(0.7);
    expect(s?.keepRate).toBe(1);
    expect(s?.refuseRate).toBe(1);
  });
  it('reports overlap honestly', () => {
    const s = analyseSeparation([0.5, 0.9], [0.6, 0.2]);
    expect(s?.auc).toBe(0.75);
    expect(s?.accuracy).toBeLessThan(1);
  });
  it('returns null when one side is empty', () => {
    expect(analyseSeparation([], [0.1])).toBeNull();
    expect(analyseSeparation([0.1], [])).toBeNull();
  });
});
