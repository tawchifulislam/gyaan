import { describe, expect, it } from 'vitest';
import type { EvalCase } from '../core/types.js';
import type { AnswerResult, Citation } from './answer.js';
import { judgeCase, renderMarkdown, summarize } from './evaluate.js';
import type { CaseOutcome } from './evaluate.js';

const cite = (slug: string): Citation => ({ title: `T-${slug}`, slug, articleId: slug, part: 1, headingId: '', score: 0.8, snippet: 's' });
const result = (patch: Partial<AnswerResult>): AnswerResult => ({
  mode: 'answered',
  question: 'q',
  answer: 'a',
  citations: [],
  related: [],
  topScore: 0.7,
  scores: [0.7],
  languageOk: true,
  inputTokens: 100,
  outputTokens: 10,
  latencyMs: 1000,
  ...patch,
});
const c = (extra: Partial<EvalCase>): EvalCase => ({
  id: 'q1',
  question: 'q',
  language: 'bn',
  category: 'direct',
  answerable: true,
  expectedArticles: ['a'],
  ...extra,
});

describe('judgeCase', () => {
  it('ok / partial / wrong source for an answerable question', () => {
    expect(judgeCase(c({}), result({ citations: [cite('a')] }))).toBe('ok');
    expect(judgeCase(c({ expectedArticles: ['a', 'b'] }), result({ citations: [cite('a'), cite('x')] }))).toBe('partial');
    expect(judgeCase(c({ expectedArticles: ['a', 'b'] }), result({ citations: [cite('a'), cite('b')] }))).toBe('ok');
    expect(judgeCase(c({}), result({ citations: [cite('x')] }))).toBe('wrong-source');
  });
  it('flags an answerable question that was refused, by the gate or by the model', () => {
    expect(judgeCase(c({}), result({ mode: 'unrelated', answer: null }))).toBe('wrongly-refused');
    expect(judgeCase(c({}), result({ mode: 'no_answer_in_sources', answer: null }))).toBe('wrongly-refused');
  });
  it('an out-of-scope question must be refused; an answer is flagged', () => {
    const oos = c({ answerable: false, expectedArticles: [], category: 'out-of-scope' });
    expect(judgeCase(oos, result({ mode: 'unrelated', answer: null }))).toBe('refused-ok');
    expect(judgeCase(oos, result({ mode: 'no_answer_in_sources', answer: null }))).toBe('refused-ok');
    expect(judgeCase(oos, result({ citations: [cite('a')] }))).toBe('ANSWERED');
  });
  it('an error is an error either way', () => {
    expect(judgeCase(c({}), result({ mode: 'error', error: 'x' }))).toBe('error');
    expect(judgeCase(c({ answerable: false }), result({ mode: 'error', error: 'x' }))).toBe('error');
  });
});

const outcome = (id: string, answerable: boolean, r: AnswerResult, verdict: CaseOutcome['verdict']): CaseOutcome => ({
  id,
  category: answerable ? 'direct' : 'out-of-scope',
  question: `question ${id}`,
  answerable,
  expected: answerable ? [{ slug: 'a', title: 'T-a' }] : [],
  result: r,
  verdict,
});

const sample = (): CaseOutcome[] => [
  outcome('q1', true, result({ citations: [cite('a')], topScore: 0.72, latencyMs: 1000 }), 'ok'),
  outcome('q2', true, result({ citations: [cite('x')], topScore: 0.66, latencyMs: 3000 }), 'wrong-source'),
  outcome('q3', true, result({ mode: 'no_answer_in_sources', answer: null, topScore: 0.7 }), 'wrongly-refused'),
  outcome('q4', false, result({ mode: 'unrelated', answer: null, topScore: 0.52, inputTokens: 0, outputTokens: 0, latencyMs: 400 }), 'refused-ok'),
  outcome('q5', false, result({ mode: 'no_answer_in_sources', answer: null, topScore: 0.68 }), 'refused-ok'),
  outcome('q6', false, result({ citations: [cite('a')], topScore: 0.69 }), 'ANSWERED'),
];

describe('summarize', () => {
  it('counts outcomes, separates how out-of-scope questions were refused, and lists hallucinations', () => {
    const s = summarize(sample(), 0.6);
    expect(s.answerable).toEqual({ n: 3, ok: 1, partial: 0, wrongSource: 1, wronglyRefused: 1, error: 0 });
    expect(s.outOfScope).toEqual({ n: 3, refusedByGate: 1, refusedByModel: 1, answered: ['q6'], error: 0 });
  });
  it('reports the score picture used to tune the gate', () => {
    const s = summarize(sample(), 0.6);
    expect(s.scores?.answerableMin).toBeCloseTo(0.66);
    expect(s.scores?.outOfScopeMax).toBeCloseTo(0.69);
    expect(s.scores?.outOfScopeAtOrAboveGate).toBe(2);
  });
  it('totals tokens, counts only real generation requests, and times the run', () => {
    const s = summarize(sample(), 0.6);
    expect(s.tokens).toEqual({ input: 500, output: 50 });
    expect(s.generatorCalls).toBe(5);
    expect(s.latency.maxMs).toBe(3000);
  });
  it('has no score summary when a side is missing', () => {
    expect(summarize(sample().filter(o => o.answerable), 0.6).scores).toBeNull();
  });
});

describe('language check', () => {
  it('lists answers that came back in the wrong language, and shows them in the report', () => {
    const o = [
      outcome('q1', true, result({ citations: [cite('a')] }), 'ok'),
      outcome('q2', true, result({ citations: [cite('a')], languageOk: false }), 'ok'),
      outcome('q3', false, result({ mode: 'unrelated', answer: null, languageOk: null }), 'refused-ok'),
    ];
    const s = summarize(o, 0.6);
    expect(s.languageMismatches).toEqual(['q2']);
    const md = renderMarkdown({ generator: 'g', embedder: 'e', gate: 0.6, date: 'd' }, o, s);
    expect(md).toContain('Answer written in the wrong language | 1 (q2)');
    expect(md).toContain('the answer is NOT in the language of the question');
    expect((md.match(/NOT in the language/g) ?? []).length).toBe(1);
  });
  it('reports none when every answer obeyed', () => {
    const s = summarize(sample(), 0.6);
    expect(s.languageMismatches).toEqual([]);
  });
});

describe('renderMarkdown', () => {
  it('shows the summary, flags the hallucination, and leaves a line for the author to judge', () => {
    const o = sample();
    const md = renderMarkdown({ generator: 'g', embedder: 'e', gate: 0.6, date: '2026-11-18' }, o, summarize(o, 0.6));
    expect(md).toContain('# Answer evaluation');
    expect(md).toContain('Answered anyway (possible hallucination)** | 1 (q6)');
    expect(md).toContain('### q6 · out-of-scope · ANSWERED (check for hallucination)');
    expect(md).toContain('**Your verdict:** [ ] correct');
    expect(md).toContain('cannot say whether an answer is true');
    expect((md.match(/\*\*Your verdict:\*\*/g) ?? []).length).toBe(6); // one per question
  });
});
