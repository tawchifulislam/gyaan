import { describe, expect, it } from 'vitest';
import { chunkArticle } from './chunker.js';
import { bnDigitsToAscii, normalizeText, tokenize } from './normalize.js';
import { slugifyHeading } from './slug.js';
import type { Article } from './types.js';

const article = (content: string, extra: Partial<Article> = {}): Article => ({
  id: 'a1',
  slug: 'test-post',
  title: 'তারিক বিন জিয়াদ',
  language: 'bn',
  content,
  ...extra,
});

const words = (n: number): string =>
  Array.from({ length: n }, (_, i) => `শব্দ${i}`).join(' ');

describe('chunkArticle', () => {
  it('splits by headings and records heading ids', () => {
    const html = `<p>ভূমিকা অংশ</p><h2>স্পেন অভিযান</h2><p>${words(60)}</p><h2>পরিণতি</h2><p>${words(60)}</p>`;
    const chunks = chunkArticle(article(html));
    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.heading).toBe('');
    expect(chunks[1]?.heading).toBe('স্পেন অভিযান');
    expect(chunks[1]?.headingId).toBe('স্পেন-অভিযান');
    expect(chunks[2]?.heading).toBe('পরিণতি');
  });

  it('keys chunks by the stable article id, not the slug', () => {
    const [c] = chunkArticle(article(`<h2>ক</h2><p>${words(50)}</p>`));
    expect(c?.chunkId).toBe('a1#0');
    expect(c?.articleId).toBe('a1');
  });

  it('embedText carries the title and heading path, text stays clean', () => {
    const html = `<h2>প্রথম</h2><h3>উপ অংশ</h3><p>${words(50)}</p>`;
    const [c] = chunkArticle(article(html));
    expect(c?.embedText.startsWith('তারিক বিন জিয়াদ › প্রথম › উপ অংশ\n\n')).toBe(true);
    expect(c?.text.includes('›')).toBe(false);
    expect(c?.heading).toBe('উপ অংশ');
  });

  it('splits a long section at sentence ends under maxWords', () => {
    const sentence = `${words(30)}।`;
    const html = `<h2>বড় অংশ</h2><p>${Array(30).fill(sentence).join(' ')}</p>`;
    const chunks = chunkArticle(article(html), { maxWords: 100, minWords: 10 });
    expect(chunks.length).toBeGreaterThanOrEqual(9);
    for (const c of chunks) {
      expect(c.wordCount).toBeLessThanOrEqual(100);
      expect(c.text.trim().endsWith('।')).toBe(true);
    }
  });

  it('merges a tiny section into the previous chunk', () => {
    const html = `<h2>বড়</h2><p>${words(80)}</p><h2>ছোট</h2><p>${words(5)}</p>`;
    const chunks = chunkArticle(article(html));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toContain('ছোট');
    expect(chunks[0]?.mergedHeadings.map(h => h.heading)).toEqual(['ছোট']);
  });

  it('gives duplicate headings unique ids', () => {
    const html = `<h2>একই</h2><p>${words(50)}</p><h2>একই</h2><p>${words(50)}</p>`;
    expect(chunkArticle(article(html)).map(c => c.headingId)).toEqual(['একই', 'একই-2']);
  });

  it('handles lists, tables and wrapper divs', () => {
    const html = `<div><h2>তালিকা</h2><ul><li>এক</li><li>দুই</li></ul><table><tr><th>ক</th><td>খ</td></tr></table></div>`;
    const [c] = chunkArticle(article(html), { minWords: 1 });
    expect(c?.text).toContain('• এক\n• দুই');
    expect(c?.text).toContain('ক | খ');
  });

  it('digits option only changes embedText', () => {
    const html = `<h2>সাল</h2><p>৭৮১ বছর ${words(40)}</p>`;
    const [keep] = chunkArticle(article(html));
    const [ascii] = chunkArticle(article(html), { digits: 'ascii' });
    expect(keep?.embedText).toContain('৭৮১');
    expect(ascii?.embedText).toContain('781');
    expect(ascii?.text).toContain('৭৮১');
    expect(keep?.contentHash).not.toBe(ascii?.contentHash);
  });

  it('gives the same hash for the same input (idempotent ingestion)', () => {
    const html = `<h2>ক</h2><p>${words(50)}</p>`;
    expect(chunkArticle(article(html))[0]?.contentHash).toBe(
      chunkArticle(article(html))[0]?.contentHash,
    );
  });

  it('returns no chunks for empty content', () => {
    expect(chunkArticle(article(''))).toEqual([]);
    expect(chunkArticle(article('<p> </p>'))).toEqual([]);
  });
});

describe('text helpers', () => {
  it('normalizeText drops zero-width space but keeps ZWJ', () => {
    const out = normalizeText('র\u200D্যা\u200Bব');
    expect(out).toContain('\u200D');
    expect(out).not.toContain('\u200B');
  });

  it('converts Bengali digits and slugifies headings', () => {
    expect(bnDigitsToAscii('৭৮১ বছর')).toBe('781 বছর');
    expect(slugifyHeading('Hello, World!')).toBe('hello-world');
    expect(slugifyHeading('!!!')).toBe('section');
  });

  it('tokenizes Bengali and English words', () => {
    expect(tokenize('তারিক, Tariq! ৭৮১')).toEqual(['তারিক', 'tariq', '৭৮১']);
  });
});
