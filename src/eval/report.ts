import type { BenchmarkResult } from './benchmark.js';

const pct = (x: number | undefined): string => (x === undefined ? '-' : `${(x * 100).toFixed(0)}%`);
const num = (x: number | undefined, d = 3): string => (x === undefined ? '-' : x.toFixed(d));

/** Markdown comparison of every benchmark result on disk. */
export const buildReport = (results: BenchmarkResult[]): string => {
  if (!results.length) return '# Embedding benchmark\n\nNo results yet. Run `npm run bench`.\n';

  const sorted = [...results].sort(
    (a, b) => b.summary.mrr - a.summary.mrr || (b.summary.rPrecision ?? 0) - (a.summary.rPrecision ?? 0),
  );
  const first = sorted[0];
  const ks = first?.ks ?? [1, 3, 5];
  const lines: string[] = [];

  lines.push('# Embedding benchmark', '');
  lines.push(
    `Corpus: ${first?.corpus.articles ?? 0} articles, ${first?.corpus.chunks ?? 0} chunks. ` +
      `Questions: ${first?.summary.answerableCases ?? 0} answerable + ${first?.summary.outOfScopeCases ?? 0} out-of-scope.`,
    '',
  );
  const fingerprints = new Set(sorted.map(r => r.inputsHash ?? 'unknown'));
  if (fingerprints.size > 1) {
    lines.push(
      '> **Warning:** these results were not all produced from the same questions and chunks ' +
        '(older result files have no fingerprint). Re-run every model with `npm run bench` before comparing them.',
      '',
    );
  }
  lines.push(
    '> **Read with care:** with a corpus this small, most models will score near 100% on the answerable ' +
      'questions, so those numbers cannot rank them. Scores from different models are not on the same scale; ' +
      'only the order they produce is comparable.',
    '',
  );

  lines.push('## Retrieval quality (higher is better)', '');
  lines.push(
    '*R-precision*: of the articles a question needs, how many are in the top N (N = how many are needed). ' +
      'For a one-article question this means "the first result was right". ' +
      '*recall@1* cannot exceed 50% on a two-article question by definition, so use R-precision for those.',
    '',
  );
  lines.push(
    `| Model | digit mode | R-precision | ${ks.map(k => `recall@${k}`).join(' | ')} | MRR |`,
    `| --- | --- | --- | ${ks.map(() => '---').join(' | ')} | --- |`,
  );
  for (const r of sorted) {
    lines.push(
      `| ${r.model} | ${r.digits} | ${pct(r.summary.rPrecision)} | ${ks.map(k => pct(r.summary.recall[String(k)])).join(' | ')} | ${num(r.summary.mrr)} |`,
    );
  }
  lines.push('');

  const categories = [...new Set(sorted.flatMap(r => Object.keys(r.summary.byCategory)))].sort();
  lines.push('## R-precision by question type', '');
  lines.push(
    `| Model | digit mode | ${categories.join(' | ')} |`,
    `| --- | --- | ${categories.map(() => '---').join(' | ')} |`,
  );
  for (const r of sorted) {
    lines.push(
      `| ${r.model} | ${r.digits} | ${categories
        .map(c => {
          const s = r.summary.byCategory[c];
          return s ? `${pct(s.rPrecision)} (${s.n})` : '-';
        })
        .join(' | ')} |`,
    );
  }
  lines.push('');

  lines.push('## How clearly is the right article ahead?', '');
  lines.push(
    'Margin = score of the weakest needed article minus the score of the best article that was not needed. ' +
      'Above 0 means the right articles outrank every wrong one; a small margin means a near miss. ' +
      'Margins are only comparable within one model (the score scales differ).',
    '',
  );
  lines.push('| Model | digit mode | smallest margin | median margin |', '| --- | --- | --- | --- |');
  for (const r of sorted) {
    lines.push(`| ${r.model} | ${r.digits} | ${num(r.summary.margin?.min)} | ${num(r.summary.margin?.median)} |`);
  }
  lines.push('');

  lines.push('## Can the top score tell answerable questions from out-of-scope ones?', '');
  lines.push(
    'AUC 1.0 means every answerable question scored above every out-of-scope one. 0.5 is a coin flip. ' +
      'The threshold is the "answer only if the top score is at least this" cut-off with the best balanced ' +
      'accuracy on this small set (answerable and out-of-scope questions count equally), so treat it as a starting point, not a final value. ' +
      'With only a handful of out-of-scope questions, small AUC differences between models are not reliable.',
    '',
  );
  lines.push(
    '| Model | digit mode | AUC | best threshold | accuracy | answered kept | out-of-scope refused |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const r of sorted) {
    const s = r.summary.separation;
    lines.push(
      s
        ? `| ${r.model} | ${r.digits} | ${num(s.auc, 2)} | ${num(s.threshold)} | ${pct(s.accuracy)} | ${pct(s.keepRate)} | ${pct(s.refuseRate)} |`
        : `| ${r.model} | ${r.digits} | - | - | - | - | - |`,
    );
  }
  lines.push('');

  lines.push('## Questions where a needed article was not in the top N', '');
  for (const r of sorted) {
    const misses = r.cases.filter(c => c.answerable && (c.rPrecision ?? c.recall['1'] ?? 0) < 1);
    lines.push(`**${r.model}** (digit mode: ${r.digits}): ${misses.length ? misses.map(m => m.id).join(', ') : 'none'}`, '');
  }

  lines.push('---', `Generated ${new Date().toISOString().slice(0, 10)} by \`npm run bench\`.`, '');
  return lines.join('\n');
};
