// Exports the blog's PUBLISHED posts to eval/corpus.json through its public API.
// That file is the frozen corpus the chunker, eval set and benchmark work on, so the eval
// runs offline and in CI without any database or network.
//
//   npm run export            (needs TFK_API_URL in .env)
import 'dotenv/config';
import fs from 'node:fs';
import { CORPUS_PATH } from '../src/core/corpus.js';
import { fetchPublishedArticles } from '../src/tfk/client.js';

const baseUrl = process.env.TFK_API_URL;
if (!baseUrl) {
  console.error('TFK_API_URL is missing. Put your blog server URL in .env (see .env.example).');
  process.exit(1);
}

console.log(`Reading published posts from ${baseUrl}`);
console.log('(a sleeping free-tier server can take a minute to wake up, please wait)\n');

try {
  const articles = await fetchPublishedArticles({ baseUrl, log: m => console.log(m) });

  fs.mkdirSync('eval', { recursive: true });
  fs.writeFileSync(
    CORPUS_PATH,
    JSON.stringify(
      { exportedAt: new Date().toISOString(), source: baseUrl, count: articles.length, articles },
      null,
      2,
    ),
  );

  const byLanguage: Record<string, number> = {};
  for (const a of articles) byLanguage[a.language] = (byLanguage[a.language] ?? 0) + 1;

  console.log(`\nExported ${articles.length} published articles to ${CORPUS_PATH}`);
  console.log('By language:', byLanguage);
  const empty = articles.filter(a => !a.content.trim()).map(a => a.slug);
  if (empty.length) console.log(`Warning: these posts have no content: ${empty.join(', ')}`);
  if (articles.length < 20) {
    console.log(
      '\nNote: with fewer than ~20 articles most embedding models look equally good at recall@5.\n' +
        'The benchmark will lean on recall@1, MRR and hard questions instead.',
    );
  }
} catch (err) {
  console.error('Export failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
