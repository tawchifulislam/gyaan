// Checks eval cases against the corpus. Used by `npm run validate` and unit-tested.
import { chunkArticle } from '../core/chunker.js';
import { tokenize } from '../core/normalize.js';
import { EVAL_CATEGORIES, EVAL_LANGUAGES } from '../core/types.js';
import type { Article, EvalCase } from '../core/types.js';

export const TARGET_TOTAL = 25;
export const MIN_PER_CATEGORY = 3;
const LEAK_WINDOW = 4;

export type RawCase = Partial<EvalCase>;

export interface ValidationResult {
  total: number;
  byCategory: Record<string, number>;
  byLanguage: Record<string, number>;
  errors: string[];
  warnings: string[];
}

interface ArticleIndex {
  headingIds: Set<string>;
  text: string;
}

const indexArticles = (articles: Article[]): Map<string, ArticleIndex> => {
  const map = new Map<string, ArticleIndex>();
  for (const a of articles) {
    const chunks = chunkArticle(a);
    const headingIds = new Set(
      chunks.flatMap(c => [c.headingId, ...c.mergedHeadings.map(h => h.headingId)]).filter(Boolean),
    );
    const text = ` ${tokenize(`${a.title}\n${chunks.map(c => c.text).join('\n')}`).join(' ')} `;
    map.set(a.slug, { headingIds, text });
  }
  return map;
};

const count = (cases: RawCase[], key: 'category' | 'language'): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const c of cases) {
    const v = c[key];
    if (v) out[v] = (out[v] ?? 0) + 1;
  }
  return out;
};

export const validateCases = (articles: Article[], cases: RawCase[]): ValidationResult => {
  const index = indexArticles(articles);
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();

  for (const c of cases) {
    const where = `[${c.id ?? '?'}]`;

    if (!c.id) errors.push(`${where} missing id`);
    else if (ids.has(c.id)) errors.push(`${where} duplicate id`);
    if (c.id) ids.add(c.id);

    if (!c.question?.trim()) errors.push(`${where} empty question`);
    if (!c.category || !(EVAL_CATEGORIES as readonly string[]).includes(c.category)) {
      errors.push(`${where} category must be one of: ${EVAL_CATEGORIES.join(', ')}`);
    }
    if (!c.language || !(EVAL_LANGUAGES as readonly string[]).includes(c.language)) {
      errors.push(`${where} language must be one of: ${EVAL_LANGUAGES.join(', ')}`);
    }

    const expected = c.expectedArticles ?? [];
    if (c.answerable === false) {
      if (expected.length) errors.push(`${where} answerable=false but expectedArticles is not empty`);
      if (c.category !== 'out-of-scope') warnings.push(`${where} answerable=false but category is not out-of-scope`);
    } else {
      if (!expected.length) errors.push(`${where} answerable cases need expectedArticles`);
      if (c.category === 'out-of-scope') errors.push(`${where} out-of-scope cases must have answerable=false`);
    }
    if (c.category === 'multi-article' && expected.length < 2) {
      errors.push(`${where} multi-article needs 2+ expectedArticles`);
    }

    for (const slug of expected) {
      if (!index.has(slug)) errors.push(`${where} unknown article slug: ${slug}`);
    }
    for (const s of c.expectedSections ?? []) {
      const art = index.get(s.slug);
      if (!art) errors.push(`${where} expectedSections: unknown slug ${s.slug}`);
      else if (!art.headingIds.has(s.headingId)) {
        errors.push(`${where} expectedSections: no heading "${s.headingId}" in ${s.slug}`);
      }
    }

    // Leakage: repeating 4 consecutive words of the article tests string matching, not meaning.
    const q = tokenize(c.question);
    for (const slug of expected) {
      const art = index.get(slug);
      if (!art) continue;
      for (let i = 0; i + LEAK_WINDOW <= q.length; i++) {
        const win = q.slice(i, i + LEAK_WINDOW).join(' ');
        if (art.text.includes(` ${win} `)) {
          warnings.push(`${where} shares the phrase "${win}" with ${slug}. Reword it so the test measures meaning.`);
          break;
        }
      }
    }
  }

  if (cases.length && cases.length < TARGET_TOTAL) {
    warnings.push(`only ${cases.length} cases, aim for ${TARGET_TOTAL}+`);
  }
  if (cases.length) {
    for (const cat of EVAL_CATEGORIES) {
      const n = cases.filter(c => c.category === cat).length;
      if (n < MIN_PER_CATEGORY) warnings.push(`category "${cat}" has ${n} case(s), aim for ${MIN_PER_CATEGORY}+`);
    }
  }

  return {
    total: cases.length,
    byCategory: count(cases, 'category'),
    byLanguage: count(cases, 'language'),
    errors,
    warnings,
  };
};
