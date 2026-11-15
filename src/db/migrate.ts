import fs from 'node:fs';
import path from 'node:path';
import type { Db } from './db.js';

const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;

export const listMigrations = (dir: string): string[] =>
  fs
    .readdirSync(dir)
    .filter(f => MIGRATION_FILE.test(f))
    .sort();

/**
 * Applies every migration file that has not been applied yet, in order.
 * Each file runs in its own transaction: it either fully applies and is recorded, or leaves
 * the database exactly as it was. Returns the names applied in this run.
 */
export const migrate = async (
  db: Db,
  dir: string,
  log: (message: string) => void = () => undefined,
): Promise<string[]> => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const done = new Set(
    (await db.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(r => r.name),
  );

  const applied: string[] = [];
  for (const name of listMigrations(dir)) {
    if (done.has(name)) continue;
    const sql = fs.readFileSync(path.join(dir, name), 'utf8');
    log(`applying ${name}`);
    await db.exec('BEGIN');
    try {
      await db.exec(sql);
      await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
      await db.exec('COMMIT');
    } catch (err) {
      await db.exec('ROLLBACK');
      throw new Error(
        `migration ${name} failed and was rolled back: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    applied.push(name);
  }
  return applied;
};
