// Runs the evaluation set against one or more embedding models and reports recall@k and MRR.
//
//   npm run bench -- --models voyage:voyage-4
//   npm run bench -- --models voyage:voyage-4,gemini:gemini-embedding-001 --digits ascii
//
// Embeddings are cached in .cache/, so re-running is free and fast. Every model writes its own
// file in eval/results/, and eval/results.md is rebuilt from all of them.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { chunkArticle } from '../src/core/chunker.js';
import { loadCases, loadCorpus } from '../src/core/corpus.js';
import type { EvalCase } from '../src/core/types.js';
import { runBenchmark } from '../src/eval/benchmark.js';
import type { BenchmarkResult } from '../src/eval/benchmark.js';
import { buildReport } from '../src/eval/report.js';
import { validateCases } from '../src/eval/validate.js';
import { createProvider, DEFAULT_MODELS, missingKey } from '../src/providers/index.js';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const digits = (flag('digits') ?? 'keep') as 'keep' | 'ascii';
if (digits !== 'keep' && digits !== 'ascii') {
  console.error('--digits must be "keep" or "ascii"');
  process.exit(1);
}

const requested = flag('models')?.split(',').map(s => s.trim()).filter(Boolean);
const models = requested ?? DEFAULT_MODELS.filter(m => !missingKey(m, process.env));
if (!models.length) {
  console.error('No models to run. Put VOYAGE_API_KEY or GEMINI_API_KEY in .env, or pass --models.');
  process.exit(1);
}

const articles = loadCorpus();
const cases = loadCases();
const check = validateCases(articles, cases);
if (check.errors.length) {
  console.error('eval/cases.json has errors, fix them first (npm run validate):');
  for (const e of check.errors) console.error(`  - ${e}`);
  process.exit(1);
}

const chunks = articles.flatMap(a => chunkArticle(a, { digits }));
console.log(
  `${articles.length} articles -> ${chunks.length} chunks, ${cases.length} questions, digits: ${digits}\n`,
);

const resultsDir = 'eval/results';
fs.mkdirSync(resultsDir, { recursive: true });

for (const spec of models) {
  const missing = missingKey(spec, process.env);
  if (missing) {
    console.log(`[skip] ${spec}: ${missing} is not set in .env\n`);
    continue;
  }
  console.log(`[run]  ${spec}`);
  try {
    const provider = createProvider(spec, process.env, m => console.log(m));
    const result = await runBenchmark({ provider, chunks, cases: cases as EvalCase[], digits });
    const file = path.join(resultsDir, `${spec.replace(/[^a-z0-9.-]+/gi, '_')}__digits-${digits}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2));

    const s = result.summary;
    console.log(
      `       recall@1 ${(100 * (s.recall['1'] ?? 0)).toFixed(0)}%  recall@3 ${(100 * (s.recall['3'] ?? 0)).toFixed(0)}%  ` +
        `recall@5 ${(100 * (s.recall['5'] ?? 0)).toFixed(0)}%  MRR ${s.mrr.toFixed(3)}  ` +
        `AUC ${s.separation ? s.separation.auc.toFixed(2) : '-'}\n`,
    );
  } catch (err) {
    console.error(`[fail] ${spec}: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}

const all = fs
  .readdirSync(resultsDir)
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8')) as BenchmarkResult);
fs.writeFileSync('eval/results.md', buildReport(all));
console.log(`Wrote eval/results.md (${all.length} result file${all.length === 1 ? '' : 's'})`);
