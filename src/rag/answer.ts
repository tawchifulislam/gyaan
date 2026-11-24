// Question in, cited answer out: embed the question, find the nearest chunks, ask the model to
// answer only from them, and map its source numbers back to real articles.
import { normalizeText } from '../core/normalize.js';
import { searchChunks } from '../db/articles.js';
import type { SearchHit } from '../db/articles.js';
import type { Db } from '../db/db.js';
import type { TextGenerator } from '../providers/generate.js';
import type { EmbeddingProvider } from '../providers/types.js';
import { errorMessage } from '../util/errors.js';
import { answerLanguageOk, detectQuestionLanguage } from './language.js';
import {
  ANSWER_SCHEMA,
  AnswerParseError,
  buildUserMessage,
  MAX_QUESTION_CHARS,
  parseModelAnswer,
  SYSTEM_PROMPT,
} from './prompt.js';

/**
 * Below this top similarity a question is treated as unrelated to the blog and the answer model
 * is never called (it saves quota). It is deliberately LOW: it only catches obviously unrelated
 * questions. Questions close to a real topic score well above it, and the model's own
 * "the sources do not contain this" rule has to catch those. Scores are specific to the embedding
 * model, so unknown models get no gate until one has been measured.
 */
export const DEFAULT_GATE: Record<string, number> = {
  'gemini:gemini-embedding-001': 0.6,
};
export const gateFor = (embeddingModelId: string): number => DEFAULT_GATE[embeddingModelId] ?? 0;

export type AnswerMode =
  /** An answer, with citations */
  | 'answered'
  /** Retrieval found nothing close enough: the model was not called */
  | 'unrelated'
  /** The model looked at the sources and said they do not contain the answer */
  | 'no_answer_in_sources'
  /** Something failed; `error` says what */
  | 'error';

export interface Citation {
  title: string;
  slug: string;
  articleId: string;
  /** 1-based part number of the article */
  part: number;
  headingId: string;
  score: number;
  snippet: string;
}

export interface AnswerResult {
  mode: AnswerMode;
  question: string;
  answer: string | null;
  /** The sources the answer actually relied on */
  citations: Citation[];
  /** Closest articles, one entry each, for "did you mean" suggestions when there is no answer */
  related: Citation[];
  /** Similarity of the best-matching chunk */
  topScore: number;
  /** Scores of every retrieved chunk, best first (for tuning the gate) */
  scores: number[];
  /** Did the answer come back in the language of the question? null when there is no answer. */
  languageOk: boolean | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  error?: string;
}

export interface AnswerOptions {
  /** Chunks to retrieve */
  k?: number;
  /** Chunks passed to the model */
  maxSources?: number;
  gate?: number;
  now?: () => number;
}

const toCitation = (h: SearchHit): Citation => ({
  title: h.title,
  slug: h.slug,
  articleId: h.articleId,
  part: h.position + 1,
  headingId: h.headingId,
  score: h.score,
  snippet: h.text.replace(/\s+/g, ' ').slice(0, 200),
});

const onePerArticle = (hits: SearchHit[], limit: number): Citation[] => {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const h of hits) {
    if (seen.has(h.articleId)) continue;
    seen.add(h.articleId);
    out.push(toCitation(h));
    if (out.length >= limit) break;
  }
  return out;
};

export const answerQuestion = async (
  db: Db,
  embedder: EmbeddingProvider,
  generator: TextGenerator,
  rawQuestion: string,
  options: AnswerOptions = {},
): Promise<AnswerResult> => {
  const now = options.now ?? Date.now;
  const started = now();
  const question = normalizeText(rawQuestion);
  const base: AnswerResult = {
    mode: 'error',
    question,
    answer: null,
    citations: [],
    related: [],
    topScore: 0,
    scores: [],
    languageOk: null,
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
  };
  const done = (patch: Partial<AnswerResult>): AnswerResult => ({ ...base, ...patch, latencyMs: now() - started });

  if (!question) return done({ error: 'the question is empty' });
  if (question.length > MAX_QUESTION_CHARS) {
    return done({ error: `the question is longer than ${MAX_QUESTION_CHARS} characters` });
  }

  let hits: SearchHit[];
  try {
    const [vector] = await embedder.embedQueries([question]);
    if (!vector) throw new Error('no embedding returned');
    hits = await searchChunks(db, vector, embedder.id, options.k ?? 6);
  } catch (err) {
    return done({ error: `retrieval failed: ${errorMessage(err)}` });
  }

  const scores = hits.map(h => h.score);
  const topScore = scores[0] ?? 0;
  const related = onePerArticle(hits, 3);
  const gate = options.gate ?? gateFor(embedder.id);

  if (!hits.length || topScore < gate) {
    return done({ mode: 'unrelated', topScore, scores, related });
  }

  const sources = hits.slice(0, options.maxSources ?? 5);
  const answerLanguage = detectQuestionLanguage(question);
  try {
    const generated = await generator.generate({
      system: SYSTEM_PROMPT,
      user: buildUserMessage(question, sources, answerLanguage),
      jsonSchema: ANSWER_SCHEMA as unknown as Record<string, unknown>,
    });
    const usage = { inputTokens: generated.inputTokens, outputTokens: generated.outputTokens };
    const parsed = parseModelAnswer(generated.text, sources.length);

    if (!parsed.answerable || !parsed.answer) {
      return done({ mode: 'no_answer_in_sources', topScore, scores, related, ...usage });
    }
    const cited = parsed.usedSources.map(n => sources[n - 1]).filter((s): s is SearchHit => Boolean(s));
    if (!cited.length) {
      // An answer nobody can check is not shown.
      return done({ topScore, scores, related, ...usage, error: 'the model gave an answer without a valid source' });
    }
    return done({
      mode: 'answered',
      answer: parsed.answer,
      citations: cited.map(toCitation),
      languageOk: answerLanguageOk(answerLanguage, parsed.answer),
      topScore,
      scores,
      related,
      ...usage,
    });
  } catch (err) {
    const why = err instanceof AnswerParseError ? `unreadable model reply: ${err.message}` : `generation failed: ${errorMessage(err)}`;
    return done({ topScore, scores, related, error: why });
  }
};
