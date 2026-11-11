// HTML article -> section-aware chunks.
//
// Why by heading: a citation can say "article X, section Y" and link to it, and a
// section is usually one coherent idea, which suits retrieval.
import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';
import { bnDigitsToAscii, countWords, normalizeText, splitSentences } from './normalize.js';
import { slugifyHeading } from './slug.js';
import type { Article, Chunk, ChunkOptions, MergedHeading } from './types.js';

export const DEFAULT_OPTIONS: ChunkOptions = {
  maxWords: 350,
  minWords: 40,
  digits: 'keep',
};

const WRAPPERS = new Set(['div', 'section', 'article', 'main']);

type Api = cheerio.CheerioAPI;
// The element type, derived from cheerio itself (it does not export it by name).
type Elem = ReturnType<ReturnType<Api['root']>['children']>[number];

const tagOf = (el: Elem | undefined): string | undefined => el?.tagName.toLowerCase();

interface Section {
  heading: string;
  headingId: string;
  headingPath: string[];
  blocks: string[];
}

const blockToText = ($: Api, el: Elem): string => {
  const tag = tagOf(el);
  if (tag === 'img' || tag === 'hr') return '';
  if (tag === 'ul' || tag === 'ol') {
    return $(el)
      .children('li')
      .toArray()
      .map(li => normalizeText($(li).text()))
      .filter(Boolean)
      .map(t => `• ${t}`)
      .join('\n');
  }
  if (tag === 'table') {
    return $(el)
      .find('tr')
      .toArray()
      .map(tr =>
        $(tr)
          .children('th,td')
          .toArray()
          .map(c => normalizeText($(c).text()))
          .join(' | '),
      )
      .join('\n');
  }
  return normalizeText($(el).text());
};

export const parseSections = (html: string | null | undefined): Section[] => {
  const $ = cheerio.load(html ?? '', null, false);
  let nodes: Elem[] = $.root().children().toArray();
  for (;;) {
    const only = nodes.length === 1 ? nodes[0] : undefined;
    if (!only || !WRAPPERS.has(tagOf(only) ?? '')) break;
    nodes = $(only).children().toArray();
  }

  const used = new Set<string>();
  const stack: { level: number; text: string }[] = []; // heading path, e.g. [h2, h3]
  const sections: Section[] = [];
  let current: Section = { heading: '', headingId: '', headingPath: [], blocks: [] };
  const flush = (): void => {
    if (current.blocks.length) sections.push(current);
  };

  for (const el of nodes) {
    const tag = tagOf(el);
    if (!tag) continue;

    const m = /^h([1-6])$/.exec(tag);
    if (m) {
      const text = normalizeText($(el).text());
      if (!text) continue;
      flush();
      const level = Number(m[1]);
      while (stack.length && (stack[stack.length - 1]?.level ?? 0) >= level) stack.pop();
      stack.push({ level, text });
      current = {
        heading: text,
        headingId: slugifyHeading(text, used),
        headingPath: stack.map(s => s.text),
        blocks: [],
      };
      continue;
    }

    const text = blockToText($, el);
    if (text) current.blocks.push(text);
  }
  flush();
  return sections;
};

// Pack paragraphs up to maxWords; a paragraph that is too long is cut at sentence ends.
const packBlocks = (blocks: string[], maxWords: number): string[] => {
  const pieces: string[] = [];
  for (const b of blocks) {
    if (countWords(b) <= maxWords) {
      pieces.push(b);
      continue;
    }
    let buf: string[] = [];
    let words = 0;
    for (const s of splitSentences(b)) {
      const w = countWords(s);
      if (buf.length && words + w > maxWords) {
        pieces.push(buf.join(' '));
        buf = [];
        words = 0;
      }
      buf.push(s);
      words += w; // a single sentence longer than maxWords stays whole
    }
    if (buf.length) pieces.push(buf.join(' '));
  }

  const out: string[] = [];
  let buf: string[] = [];
  let words = 0;
  for (const p of pieces) {
    const w = countWords(p);
    if (buf.length && words + w > maxWords) {
      out.push(buf.join('\n\n'));
      buf = [];
      words = 0;
    }
    buf.push(p);
    words += w;
  }
  if (buf.length) out.push(buf.join('\n\n'));
  return out;
};

interface RawChunk {
  heading: string;
  headingId: string;
  headingPath: string[];
  text: string;
  mergedHeadings: MergedHeading[];
}

export const chunkArticle = (article: Article, options: Partial<ChunkOptions> = {}): Chunk[] => {
  const opts: ChunkOptions = { ...DEFAULT_OPTIONS, ...options };
  const title = normalizeText(article.title);

  const raw: RawChunk[] = [];
  for (const section of parseSections(article.content)) {
    for (const text of packBlocks(section.blocks, opts.maxWords)) {
      raw.push({
        heading: section.heading,
        headingId: section.headingId,
        headingPath: section.headingPath,
        text,
        mergedHeadings: [],
      });
    }
  }

  // Merge tiny chunks into the previous one (keeps the previous chunk's heading as primary).
  const merged: RawChunk[] = [];
  for (const c of raw) {
    const prev = merged[merged.length - 1];
    const small = countWords(c.text) < opts.minWords;
    if (prev && small && countWords(prev.text) + countWords(c.text) <= opts.maxWords) {
      const label = c.heading && c.headingId !== prev.headingId ? `${c.heading}\n` : '';
      prev.text += `\n\n${label}${c.text}`;
      if (label) prev.mergedHeadings.push({ heading: c.heading, headingId: c.headingId });
    } else {
      merged.push(c);
    }
  }

  return merged.map((c, index): Chunk => {
    const prefix = [title, ...c.headingPath].filter(Boolean).join(' › ');
    let embedText = `${prefix}\n\n${c.text}`;
    if (opts.digits === 'ascii') embedText = bnDigitsToAscii(embedText);
    return {
      chunkId: `${article.id}#${index}`,
      articleId: article.id,
      articleSlug: article.slug,
      articleTitle: title,
      language: article.language,
      index,
      heading: c.heading,
      headingId: c.headingId,
      mergedHeadings: c.mergedHeadings,
      text: c.text,
      embedText,
      wordCount: countWords(c.text),
      contentHash: createHash('sha256').update(embedText).digest('hex'),
    };
  });
};
