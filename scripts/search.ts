// Try retrieval by hand: embeds your question and shows the nearest chunks in the database.
//
//   npm run search -- "তারিক বিন জিয়াদ কে ছিলেন?"
//   npm run search:local -- "your question" -k 3
import 'dotenv/config';
import { normalizeText } from '../src/core/normalize.js';
import { searchChunks } from '../src/db/articles.js';
import { connect, describeTarget, LOCAL_DATABASE_URL } from '../src/db/connect.js';
import { createProvider, missingKey } from '../src/providers/index.js';
import { explain } from '../src/util/errors.js';

const args = process.argv.slice(2);
const value = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
};
const local = args.includes('--local');
const modelSpec = value('--model') ?? 'gemini:gemini-embedding-001';
const k = Number(value('-k') ?? 5);
const flagValues = new Set([value('--model'), value('-k')]);
const question = normalizeText(args.filter(a => !a.startsWith('-') && !flagValues.has(a)).join(' '));

const url = local ? LOCAL_DATABASE_URL : process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing. Put your Neon connection string in .env.');
  process.exit(1);
}
if (!question) {
  console.error('Usage: npm run search -- "your question"');
  process.exit(1);
}
const missing = missingKey(modelSpec, process.env);
if (missing) {
  console.error(`${missing} is missing. Put it in .env.`);
  process.exit(1);
}

console.log(`Database: ${describeTarget(url)} (${local ? 'local Docker' : 'DATABASE_URL'})`);
console.log(`Question: ${question}\n`);

let exitCode = 0;
try {
  const provider = createProvider(modelSpec, process.env, () => undefined, { cache: false });
  const [vector] = await provider.embedQueries([question]);
  if (!vector) throw new Error('no embedding returned');

  const { db, close } = await connect(url);
  try {
    const hits = await searchChunks(db, vector, provider.id, k);
    if (!hits.length) console.log(`Nothing found. Has "npm run ingest" embedded chunks with ${provider.id}?`);
    for (const [i, h] of hits.entries()) {
      const preview = h.text.replace(/\s+/g, ' ').slice(0, 110);
      console.log(`${i + 1}. score ${h.score.toFixed(3)}  ${h.title}  (part ${h.position + 1})`);
      console.log(`   ${preview}...\n`);
    }
  } finally {
    await close();
  }
} catch (err) {
  console.error('Search failed:', explain(err, { local }));
  exitCode = 1;
}
process.exit(exitCode);
