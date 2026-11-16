// Checks that a database is reachable and set up as expected. Read-only.
//
//   npm run db:check          the database in DATABASE_URL (your Neon database)
//   npm run db:check:local    the Docker database from docker-compose.yml
import 'dotenv/config';
import { connect, describeTarget, LOCAL_DATABASE_URL } from '../src/db/connect.js';
import { explain } from '../src/util/errors.js';

const local = process.argv.includes('--local');
const url = local ? LOCAL_DATABASE_URL : process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is missing. Put your Neon connection string in .env (see .env.example).');
  process.exit(1);
}

console.log(`Target: ${describeTarget(url)} (${local ? 'local Docker' : 'DATABASE_URL'})\n`);

try {
  const started = Date.now();
  const { db, close } = await connect(url);
  try {
    const version = (await db.query<{ v: string }>('SELECT version() AS v')).rows[0]?.v ?? '?';
    console.log(`Connected in ${Date.now() - started} ms`);
    console.log(`Server:   ${version.split(',')[0]}`);

    const ext = (await db.query<{ v: string }>("SELECT extversion AS v FROM pg_extension WHERE extname = 'vector'")).rows[0];
    console.log(`pgvector: ${ext ? `installed (${ext.v})` : 'NOT installed, run the migrations'}`);

    const hasMigrations = (await db.query<{ ok: boolean }>("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS ok")).rows[0]?.ok;
    if (!hasMigrations) {
      console.log('Migrations: none applied yet, run the migrate command');
    } else {
      const names = (await db.query<{ name: string }>('SELECT name FROM schema_migrations ORDER BY name')).rows.map(r => r.name);
      console.log(`Migrations applied (${names.length}): ${names.join(', ') || '-'}`);

      for (const table of ['articles', 'chunks']) {
        const exists = (await db.query<{ ok: boolean }>('SELECT to_regclass($1) IS NOT NULL AS ok', [`public.${table}`])).rows[0]?.ok;
        if (!exists) {
          console.log(`Table ${table}: missing`);
          continue;
        }
        const n = (await db.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`)).rows[0]?.n ?? '0';
        console.log(`Table ${table}: ${n} row(s)`);
      }
    }
  } finally {
    await close();
  }
} catch (err) {
  console.error('Check failed:', explain(err, { local }));
  process.exit(1);
}
