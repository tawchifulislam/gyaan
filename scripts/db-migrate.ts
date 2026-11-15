// Applies the SQL files in migrations/ to a database.
//
//   npm run db:migrate          the database in DATABASE_URL (your Neon database)
//   npm run db:migrate:local    the Docker database from docker-compose.yml
import 'dotenv/config';
import path from 'node:path';
import { connect, describeTarget, LOCAL_DATABASE_URL } from '../src/db/connect.js';
import { migrate } from '../src/db/migrate.js';

const local = process.argv.includes('--local');
const url = local ? LOCAL_DATABASE_URL : process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is missing. Put your Neon connection string in .env (see .env.example).');
  process.exit(1);
}

console.log(`Target: ${describeTarget(url)} (${local ? 'local Docker' : 'DATABASE_URL'})\n`);

try {
  const { db, close } = await connect(url);
  try {
    const applied = await migrate(db, path.resolve('migrations'), m => console.log(`  ${m}`));
    console.log(applied.length ? `\nApplied ${applied.length} migration(s).` : 'Already up to date, nothing to apply.');
  } finally {
    await close();
  }
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
