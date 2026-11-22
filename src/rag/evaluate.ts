// Judging and reporting an answer-evaluation run. Pure functions, unit-tested.
//
// What can be judged automatically:
//   - for an answerable question: did it answer, and from the right article(s)?
//   - for an out-of-scope question: did it refuse instead of answering?
// What cannot: whether the answer TEXT is correct. The report leaves a line for the author to mark.
import type { EvalCase } from '../core/types.js';
import type { AnswerResult } from './answer.js';

export type Verdict =
  | 'ok' // answered, and cited every needed article
  | 'partial' // answered, but cited only some of the needed articles
  | 'wrong-source' // answered, but cited none of the needed articles
  | 'wrongly-refused' // an answerable question was refused
  | 'refused-ok' // an out-of-scope question was refused
  | 'ANSWERED' // an out-of-scope question got an answer: a possible hallucination
  | 'error';

export interface CaseOutcome {
  id: string;
  category: string;
  question: string;
  answerable: boolean;
  expected: { slug: string; title: string }[];
  result: AnswerResult;
  verdict: Verdict;
}

export const judgeCase = (c: EvalCase, result: AnswerResult): Verdict => {
  const answerable = c.answerable !== false;
  if (result.mode === 'error') return 'error';
  if (!answerable) return result.mode === 'answered' ? 'ANSWERED' : 'refused-ok';
  if (result.mode !== 'answered') return 'wrongly-refused';
  const cited = new Set(result.citations.map(x => x.slug));
  const needed = c.expectedArticles ?? [];
  const found = needed.filter(s => cited.has(s)).length;
  if (found === 0) return 'wrong-source';
  return found === needed.length ? 'ok' : 'partial';
};

export interface Summary {
  answerable: { n: number; ok: number; partial: number; wrongSource: number; wronglyRefused: number; error: number };
  outOfScope: { n: number; refusedByGate: number; refusedByModel: number; answered: string[]; error: number };
  scores: { answerableMin: number; answerableMedian: number; outOfScopeMax: number; outOfScopeAtOrAboveGate: number } | null;
  latency: { medianMs: number; maxMs: number };
  tokens: { input: number; output: number };
  generatorCalls: number;
  gate: number;
}

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};

export const summarize = (outcomes: CaseOutcome[], gate: number): Summary => {
  const ans = outcomes.filter(o => o.answerable);
  const oos = outcomes.filter(o => !o.answerable);
  const count = (list: CaseOutcome[], v: Verdict): number => list.filter(o => o.verdict === v).length;

  const ansScores = ans.filter(o => o.result.scores.length).map(o => o.result.topScore);
  const oosScores = oos.filter(o => o.result.scores.length).map(o => o.result.topScore);

  return {
    answerable: {
      n: ans.length,
      ok: count(ans, 'ok'),
      partial: count(ans, 'partial'),
      wrongSource: count(ans, 'wrong-source'),
      wronglyRefused: count(ans, 'wrongly-refused'),
      error: count(ans, 'error'),
    },
    outOfScope: {
      n: oos.length,
      refusedByGate: oos.filter(o => o.verdict === 'refused-ok' && o.result.mode === 'unrelated').length,
      refusedByModel: oos.filter(o => o.verdict === 'refused-ok' && o.result.mode === 'no_answer_in_sources').length,
      answered: oos.filter(o => o.verdict === 'ANSWERED').map(o => o.id),
      error: count(oos, 'error'),
    },
    scores:
      ansScores.length && oosScores.length
        ? {
            answerableMin: Math.min(...ansScores),
            answerableMedian: median(ansScores),
            outOfScopeMax: Math.max(...oosScores),
            outOfScopeAtOrAboveGate: oosScores.filter(s => s >= gate).length,
          }
        : null,
    latency: {
      medianMs: median(outcomes.map(o => o.result.latencyMs)),
      maxMs: Math.max(0, ...outcomes.map(o => o.result.latencyMs)),
    },
    tokens: {
      input: outcomes.reduce((s, o) => s + o.result.inputTokens, 0),
      output: outcomes.reduce((s, o) => s + o.result.outputTokens, 0),
    },
    generatorCalls: outcomes.filter(o => o.result.inputTokens > 0).length,
    gate,
  };
};

const ICON: Record<Verdict, string> = {
  ok: 'OK',
  partial: 'PARTIAL',
  'wrong-source': 'WRONG SOURCE',
  'wrongly-refused': 'WRONGLY REFUSED',
  'refused-ok': 'REFUSED (correct)',
  ANSWERED: 'ANSWERED (check for hallucination)',
  error: 'ERROR',
};

export interface ReportMeta {
  generator: string;
  embedder: string;
  gate: number;
  date: string;
}

const pct = (n: number, d: number): string => (d ? `${Math.round((100 * n) / d)}%` : '-');

export const renderMarkdown = (meta: ReportMeta, outcomes: CaseOutcome[], s: Summary): string => {
  const L: string[] = [];
  L.push('# Answer evaluation', '');
  L.push(`Generator \`${meta.generator}\`, embeddings \`${meta.embedder}\`, retrieval gate ${meta.gate}, ${meta.date}.`, '');
  L.push(
    'The checks below are automatic: they say whether the system answered, from which article, or refused. ' +
      '**They cannot say whether an answer is true.** Read every answer and mark it in the "Your verdict" line.',
    '',
  );

  L.push('## Answerable questions', '');
  L.push('| Result | Count |', '| --- | --- |');
  L.push(`| Answered, cited every needed article | ${s.answerable.ok} of ${s.answerable.n} (${pct(s.answerable.ok, s.answerable.n)}) |`);
  L.push(`| Answered, cited only some needed articles | ${s.answerable.partial} |`);
  L.push(`| Answered, but cited the wrong article | ${s.answerable.wrongSource} |`);
  L.push(`| Wrongly refused | ${s.answerable.wronglyRefused} |`);
  L.push(`| Errors | ${s.answerable.error} |`, '');

  L.push('## Out-of-scope questions (the blog has no answer)', '');
  L.push('| Result | Count |', '| --- | --- |');
  const refused = s.outOfScope.refusedByGate + s.outOfScope.refusedByModel;
  L.push(`| Refused | ${refused} of ${s.outOfScope.n} (${pct(refused, s.outOfScope.n)}) |`);
  L.push(`| ...stopped by the retrieval gate (model not called) | ${s.outOfScope.refusedByGate} |`);
  L.push(`| ...refused by the model ("not in the sources") | ${s.outOfScope.refusedByModel} |`);
  L.push(`| **Answered anyway (possible hallucination)** | ${s.outOfScope.answered.length}${s.outOfScope.answered.length ? ` (${s.outOfScope.answered.join(', ')})` : ''} |`);
  L.push(`| Errors | ${s.outOfScope.error} |`, '');

  if (s.scores) {
    L.push('## Retrieval scores', '');
    L.push(
      `Lowest top score among answerable questions: **${s.scores.answerableMin.toFixed(3)}** (median ${s.scores.answerableMedian.toFixed(3)}). ` +
        `Highest among out-of-scope questions: **${s.scores.outOfScopeMax.toFixed(3)}**. Gate: ${s.gate}. ` +
        `${s.scores.outOfScopeAtOrAboveGate} of ${s.outOfScope.n} out-of-scope questions scored at or above the gate, so only the model's own refusal rule stands between them and an answer.`,
      '',
    );
  }

  L.push('## Cost and speed', '');
  L.push(
    `${s.generatorCalls} generation request(s), ${s.tokens.input} input and ${s.tokens.output} output tokens in total. ` +
      `Median ${(s.latency.medianMs / 1000).toFixed(1)} s per question, slowest ${(s.latency.maxMs / 1000).toFixed(1)} s.`,
    '',
  );

  L.push('## Every question', '');
  for (const o of outcomes) {
    L.push(`### ${o.id} · ${o.category} · ${ICON[o.verdict]}`, '');
    L.push(`**Question:** ${o.question}`, '');
    L.push(
      `**Should come from:** ${o.answerable ? o.expected.map(e => e.title).join(' + ') || '(not set)' : 'nothing, the blog has no answer'}`,
      '',
    );
    L.push(`**Mode:** ${o.result.mode}, top score ${o.result.topScore.toFixed(3)}${o.result.error ? `, error: ${o.result.error}` : ''}`, '');
    if (o.result.answer) L.push(`**Answer:** ${o.result.answer}`, '');
    if (o.result.citations.length) {
      L.push(`**Cited:** ${o.result.citations.map(c => `${c.title} (part ${c.part})`).join('; ')}`, '');
    } else if (o.result.related.length) {
      L.push(`**Closest articles:** ${o.result.related.map(c => c.title).join('; ')}`, '');
    }
    L.push('**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:', '');
  }
  return L.join('\n');
};
