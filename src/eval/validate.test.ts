import { describe, expect, it } from 'vitest';
import type { Article } from '../core/types.js';
import { validateCases } from './validate.js';

const words = (n: number, p = 'শব্দ'): string =>
  Array.from({ length: n }, (_, i) => `${p}${i}`).join(' ');

const articles: Article[] = [
  {
    id: '1',
    slug: 'tariq',
    title: 'তারিক বিন জিয়াদ',
    language: 'bn',
    content: `<h2>নৌকা পোড়ানো</h2><p>${words(60)}</p><h2>পরিণতি</h2><p>${words(60, 'ফল')}</p>`,
  },
  {
    id: '2',
    slug: 'andalus',
    title: 'আন্দালুস',
    language: 'bn',
    content: `<h2>পতন</h2><p>${words(60, 'পত')}</p>`,
  },
];

describe('validateCases', () => {
  it('accepts a well-formed case', () => {
    const r = validateCases(articles, [
      {
        id: 'q1',
        question: 'স্পেনে নৌকা কেন পোড়ানো হলো?',
        language: 'bn',
        category: 'direct',
        answerable: true,
        expectedArticles: ['tariq'],
        expectedSections: [{ slug: 'tariq', headingId: 'নৌকা-পোড়ানো' }],
      },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.byCategory).toEqual({ direct: 1 });
  });

  it('reports unknown slugs, unknown headings, bad enums and duplicate ids', () => {
    const r = validateCases(articles, [
      { id: 'q1', question: 'ক', language: 'bn', category: 'direct', expectedArticles: ['nope'] },
      {
        id: 'q1',
        question: 'খ',
        language: 'zz' as never,
        category: 'direct',
        expectedArticles: ['tariq'],
        expectedSections: [{ slug: 'tariq', headingId: 'missing' }],
      },
    ]);
    expect(r.errors.join('\n')).toContain('unknown article slug: nope');
    expect(r.errors.join('\n')).toContain('duplicate id');
    expect(r.errors.join('\n')).toContain('language must be one of');
    expect(r.errors.join('\n')).toContain('no heading "missing"');
  });

  it('checks the answerable and category rules', () => {
    const r = validateCases(articles, [
      { id: 'a', question: 'ক', language: 'bn', category: 'out-of-scope', answerable: false, expectedArticles: ['tariq'] },
      { id: 'b', question: 'খ', language: 'bn', category: 'multi-article', expectedArticles: ['tariq'] },
      { id: 'c', question: 'গ', language: 'bn', category: 'direct' },
    ]);
    const text = r.errors.join('\n');
    expect(text).toContain('[a] answerable=false but expectedArticles is not empty');
    expect(text).toContain('[b] multi-article needs 2+');
    expect(text).toContain('[c] answerable cases need expectedArticles');
  });

  it('warns when a question repeats four words from the article', () => {
    const r = validateCases(articles, [
      {
        id: 'leak',
        question: 'শব্দ3 শব্দ4 শব্দ5 শব্দ6 নিয়ে কী বলা হয়েছে',
        language: 'bn',
        category: 'direct',
        answerable: true,
        expectedArticles: ['tariq'],
      },
    ]);
    expect(r.warnings.join('\n')).toContain('shares the phrase');
  });

  it('is quiet about an empty set', () => {
    const r = validateCases(articles, []);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});
