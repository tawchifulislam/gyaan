export interface Article {
  /** Stable identifier (the MongoDB _id of the post). Slugs change when a title is edited, ids do not. */
  id: string;
  slug: string;
  title: string;
  language: string;
  publishedAt?: string | null;
  excerpt?: string;
  /** HTML as written in the blog editor */
  content: string;
}

export interface MergedHeading {
  heading: string;
  headingId: string;
}

export interface Chunk {
  chunkId: string;
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  language: string;
  index: number;
  heading: string;
  headingId: string;
  mergedHeadings: MergedHeading[];
  /** Clean text: shown to readers and given to the LLM as a source */
  text: string;
  /** "Title > heading path" + text: what actually gets embedded */
  embedText: string;
  wordCount: number;
  /** Hash of embedText, so unchanged chunks are never re-embedded */
  contentHash: string;
}

export interface ChunkOptions {
  /** Split sections longer than this many words */
  maxWords: number;
  /** Merge chunks shorter than this into the previous one */
  minWords: number;
  /** 'ascii' converts Bengali digits in embedText (a benchmark variable) */
  digits: 'keep' | 'ascii';
}

export const EVAL_CATEGORIES = [
  'direct',
  'cross-lingual',
  'mixed',
  'multi-article',
  'digits',
  'out-of-scope',
] as const;
export type EvalCategory = (typeof EVAL_CATEGORIES)[number];

export const EVAL_LANGUAGES = ['bn', 'en', 'mixed'] as const;
export type EvalLanguage = (typeof EVAL_LANGUAGES)[number];

export interface EvalCase {
  id: string;
  question: string;
  language: EvalLanguage;
  category: EvalCategory;
  answerable?: boolean;
  expectedArticles?: string[];
  expectedSections?: { slug: string; headingId: string }[];
  notes?: string;
}
