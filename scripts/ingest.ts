// Copies the blog's published posts into the database, cut into chunks and embedded.
// Only new or changed text is embedded; an unchanged post costs nothing.
//
//   npm run ingest                   blog (TFK_API_URL) -> your Neon database
//   npm run ingest:local             blog -> the Docker database
//   npm run ingest -- --from corpus  use eval/corpus.json instead of the live blog
//   npm run ingest -- --no-embed     store chunks only, embed later
//   npm run ingest -- --model voyage:voyage-4
import 'dotenv/config';
import { loadCorpus } from '../src/core/corpus.js';
import type { Article } from '../src/core/types.js';
import { connect, describeTarget, LOCAL_DATABASE_URL } from '../src/db/connect.js';
import { ingestArticles } from '../src/ingest/ingest.js';
import { createProvider, missingKey } from '../src/providers/index.js';
import { explain } from '../src/util/errors.js';
import { fetchPublishedArticles } from '../src/tfk/client.js';

const args = process.argv.slice(2);
const has = (flag: string): boolean => args.includes(flag);
const value = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
};

const local = has('--local');
const url = local ? LOCAL_DATABASE_URL : process.env.DATABASE_URL;
const from = value('--from') ?? 'blog';
const modelSpec = value('--model') ?? 'gemini:gemini-embedding-001';
const embed = !has('--no-embed');

if (!url) {
  console.error('DATABASE_URL is missing. Put your Neon connection string in .env (see .env.example).');
  process.exit(1);
}
if (from !== 'blog' && from !== 'corpus') {
  console.error('--from must be "blog" or "corpus"');
  process.exit(1);
}
if (embed) {
  const missing = missingKey(modelSpec, process.env);
  if (missing) {
    console.error(`${missing} is missing. Put it in .env, or run with --no-embed.`);
    process.exit(1);
  }
}

console.log(`Database: ${describeTarget(url)} (${local ? 'local Docker' : 'DATABASE_URL'})`);
console.log(`Source:   ${from === 'blog' ? process.env.TFK_API_URL : 'eval/corpus.json'}`);
console.log(`Model:    ${embed ? modelSpec : '(embedding skipped)'}\n`);

let exitCode = 0;
let closeDb: (() => Promise<void>) | undefined;
try {
  // Connect first. If the database is down we want to know right now, not after a minute of
  // waiting for a sleeping blog server.
  const connection = await connect(url);
  closeDb = connection.close;
  console.log('Connected to the database.\n');

  let articles: Article[];
  if (from === 'corpus') {
    articles = loadCorpus();
  } else {
    if (!process.env.TFK_API_URL) throw new Error('TFK_API_URL is missing (see .env.example)');
    console.log('Reading posts from the blog (a sleeping free-tier server can take a minute)...');
    articles = await fetchPublishedArticles({ baseUrl: process.env.TFK_API_URL, log: m => console.log(m) });
  }
  console.log(`${articles.length} article(s) in the source\n`);

  const provider = embed ? createProvider(modelSpec, process.env, m => console.log(m), { cache: false }) : undefined;
  const s = await ingestArticles(connection.db, articles, {
    ...(provider ? { provider } : {}),
    allowMassPrune: has('--allow-mass-prune'),
    log: m => console.log(m),
  });

  console.log('\nSummary');
  console.log(
    `  articles: ${s.articles.added} added, ${s.articles.updated} updated, ${s.articles.unchanged} unchanged, ${s.articles.removed} removed`,
  );
  console.log(`  chunks:   ${s.chunks.total} total, ${s.chunks.reused} kept their existing embedding`);
  console.log(`  embedded: ${s.embedded} now, ${s.pendingAfter} still waiting`);
  if (s.error) {
    console.error(`\nStopped early: ${s.error}`);
    console.error('Everything embedded so far is saved. Run the same command again later to continue.');
    exitCode = 1;
  }
} catch (err) {
  console.error('Ingest failed:', explain(err, { local }));
  exitCode = 1;
} finally {
  await closeDb?.();
}
process.exit(exitCode);
