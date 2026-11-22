// Runs every evaluation question through the real pipeline (retrieval from the database, then the
// answer model) and writes a report for you to read and mark.
//
//   npm run answers:local               the Docker database
//   npm run answers                     your Neon database
//   npm run answers -- --only q01,q05   just those questions
//   npm run answers -- --gate 0.55      try a different retrieval gate
//
// It writes eval/answers.md (to read) and eval/answers/<run>.json (the raw data).
// Each question costs one query embedding and at most one generation request.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { loadCases, loadCorpus } from '../src/core/corpus.js';
import type { EvalCase } from '../src/core/types.js';
import { connect, describeTarget, LOCAL_DATABASE_URL } from '../src/db/connect.js';
import { createGenerator, createProvider, DEFAULT_GENERATOR, missingKey } from '../src/providers/index.js';
import { answerQuestion, gateFor } from '../src/rag/answer.js';
import { judgeCase, renderMarkdown, summarize } from '../src/rag/evaluate.js';
import type { CaseOutcome } from '../src/rag/evaluate.js';
import { explain } from '../src/util/errors.js';

const args = process.argv.slice(2);
const has = (flag: string): boolean => args.includes(flag);
const value = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
};

const local = has('--local');
const url = local ? LOCAL_DATABASE_URL : process.env.DATABASE_URL;
const embedSpec = value('--model') ?? 'gemini:gemini-embedding-001';
const genSpec = value('--gen') ?? DEFAULT_GENERATOR;
const only = value('--only')?.split(',').map(s => s.trim()).filter(Boolean);

if (!url) {
  console.error('DATABASE_URL is missing. Put your Neon connection string in .env (see .env.example).');
  process.exit(1);
}
const missing = missingKey(embedSpec, process.env) ?? missingKey(genSpec, process.env);
if (missing) {
  console.error(`${missing} is missing. Put it in .env.`);
  process.exit(1);
}

let exitCode = 0;
let closeDb: (() => Promise<void>) | undefined;
try {
  const connection = await connect(url);
  closeDb = connection.close;

  const embedder = createProvider(embedSpec, process.env, m => console.log(m), { cache: false });
  const generator = createGenerator(genSpec, process.env, m => console.log(m));
  const gate = value('--gate') !== undefined ? Number(value('--gate')) : gateFor(embedder.id);

  const titles = new Map(loadCorpus().map(a => [a.slug, a.title]));
  const cases = (loadCases() as EvalCase[]).filter(c => !only || only.includes(c.id));
  if (!cases.length) throw new Error('no questions to run (check --only)');

  console.log(`Database:  ${describeTarget(url)} (${local ? 'local Docker' : 'DATABASE_URL'})`);
  console.log(`Embedding: ${embedder.id}, gate ${gate}`);
  console.log(`Generator: ${generator.id}`);
  console.log(`Questions: ${cases.length} (pacing follows the free-tier limit, so this takes a few minutes)\n`);

  const outcomes: CaseOutcome[] = [];
  for (const c of cases) {
    const result = await answerQuestion(connection.db, embedder, generator, c.question, { gate });
    const verdict = judgeCase(c, result);
    outcomes.push({
      id: c.id,
      category: c.category,
      question: c.question,
      answerable: c.answerable !== false,
      expected: (c.expectedArticles ?? []).map(slug => ({ slug, title: titles.get(slug) ?? slug })),
      result,
      verdict,
    });
    console.log(
      `${c.id.padEnd(4)} ${c.category.padEnd(13)} ${verdict.padEnd(16)} mode ${result.mode.padEnd(21)} top ${result.topScore.toFixed(3)}  ${(result.latencyMs / 1000).toFixed(1)}s${result.error ? `  (${result.error})` : ''}`,
    );
  }

  const summary = summarize(outcomes, gate);
  const date = new Date().toISOString().slice(0, 10);
  const meta = { generator: generator.id, embedder: embedder.id, gate, date };

  fs.mkdirSync('eval/answers', { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join('eval/answers', `${generator.id.replace(/[^a-z0-9.-]+/gi, '_')}__${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ meta, summary, outcomes }, null, 2));
  fs.writeFileSync('eval/answers.md', renderMarkdown(meta, outcomes, summary));

  const a = summary.answerable;
  const o = summary.outOfScope;
  console.log('\nSummary');
  console.log(`  answerable:   ${a.ok}/${a.n} answered from the right article(s), ${a.partial} partial, ${a.wrongSource} wrong source, ${a.wronglyRefused} wrongly refused, ${a.error} errors`);
  console.log(`  out-of-scope: ${o.refusedByGate + o.refusedByModel}/${o.n} refused (${o.refusedByGate} by the gate, ${o.refusedByModel} by the model), ${o.answered.length} answered anyway${o.answered.length ? ` (${o.answered.join(', ')})` : ''}, ${o.error} errors`);
  console.log(`  ${summary.generatorCalls} generation request(s), ${summary.tokens.input} input / ${summary.tokens.output} output tokens`);
  console.log(`\nWrote eval/answers.md (read and mark it) and ${file}`);
} catch (err) {
  console.error('Answer evaluation failed:', explain(err, { local }));
  exitCode = 1;
} finally {
  await closeDb?.();
}
process.exit(exitCode);
