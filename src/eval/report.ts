import type { BenchmarkResult } from './benchmark.js';

const pct = (x: number): string => `${(x * 100).toFixed(0)}%`;
const num = (x: number, d = 3): string => x.toFixed(d);

/** Markdown comparison of every benchmark result on disk. */
export const buildReport = (results: BenchmarkResult[]): string => {
  if (!results.length) return '# Embedding benchmark\n\nNo results yet. Run `npm run bench`.\n';

  const sorted = [...results].sort((a, b) => b.summary.mrr - a.summary.mrr);
  const first = sorted[0];
  const ks = first?.ks ?? [1, 3, 5];
  const lines: string[] = [];

  lines.push('# Embedding benchmark', '');
  lines.push(
    `Corpus: ${first?.corpus.articles ?? 0} articles, ${first?.corpus.chunks ?? 0} chunks. ` +
      `Questions: ${first?.summary.answerableCases ?? 0} answerable + ${first?.summary.outOfScopeCases ?? 0} out-of-scope.`,
    '',
  );
  lines.push(
    '> **Read with care:** with a corpus this small, recall@3 and recall@5 are easy for every model. ' +
      'Compare recall@1 and MRR first. Scores from different models are not comparable with each other, ' +
      'only the ranking they produce is.',
    '',
  );

  lines.push('## Retrieval quality (higher is better)', '');
  lines.push(
    `| Model | digit mode | ${ks.map(k => `recall@${k}`).join(' | ')} | MRR |`,
    `| --- | --- | ${ks.map(() => '---').join(' | ')} | --- |`,
  );
  for (const r of sorted) {
    lines.push(
      `| ${r.model} | ${r.digits} | ${ks.map(k => pct(r.summary.recall[String(k)] ?? 0)).join(' | ')} | ${num(r.summary.mrr)} |`,
    );
  }
  lines.push('');

  const categories = [...new Set(sorted.flatMap(r => Object.keys(r.summary.byCategory)))].sort();
  lines.push('## recall@1 by question type', '');
  lines.push(`| Model | digit mode | ${categories.join(' | ')} |`, `| --- | --- | ${categories.map(() => '---').join(' | ')} |`);
  for (const r of sorted) {
    lines.push(
      `| ${r.model} | ${r.digits} | ${categories
        .map(c => {
          const s = r.summary.byCategory[c];
          return s ? `${pct(s.recall1)} (${s.n})` : '-';
        })
        .join(' | ')} |`,
    );
  }
  lines.push('');

  lines.push('## Can the top score tell answerable questions from out-of-scope ones?', '');
  lines.push(
    'AUC 1.0 means every answerable question scored above every out-of-scope one. 0.5 is a coin flip. ' +
      'The threshold is the "answer only if the top score is at least this" cut-off with the best balanced ' +
      'accuracy on this small set (answerable and out-of-scope questions count equally), so treat it as a starting point, not a final value.',
    '',
  );
  lines.push('| Model | digit mode | AUC | best threshold | accuracy | answered kept | out-of-scope refused |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of sorted) {
    const s = r.summary.separation;
    lines.push(
      s
        ? `| ${r.model} | ${r.digits} | ${num(s.auc, 2)} | ${num(s.threshold)} | ${pct(s.accuracy)} | ${pct(s.keepRate)} | ${pct(s.refuseRate)} |`
        : `| ${r.model} | ${r.digits} | - | - | - | - | - |`,
    );
  }
  lines.push('');

  lines.push('## Questions where the right article was not ranked first', '');
  for (const r of sorted) {
    const misses = r.cases.filter(c => c.answerable && (c.recall['1'] ?? 0) < 1);
    lines.push(`**${r.model}** (digit mode: ${r.digits}): ${misses.length ? misses.map(m => m.id).join(', ') : 'none'}`, '');
  }

  lines.push('---', `Generated ${new Date().toISOString().slice(0, 10)} by \`npm run bench\`.`, '');
  return lines.join('\n');
};
