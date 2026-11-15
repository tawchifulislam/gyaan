import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from './db.js';
import { listMigrations, migrate } from './migrate.js';
import { createTestDb } from './testing.js';

const REAL_DIR = path.resolve('migrations');

let db: Db;
let close: () => Promise<void>;
beforeEach(async () => {
  ({ db, close } = await createTestDb());
});
afterEach(async () => {
  await close();
});

const tmpMigrations = (files: Record<string, string>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gyaan-mig-'));
  for (const [name, sql] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), sql);
  return dir;
};

describe('migrate', () => {
  it('applies the real migrations in order and records them', async () => {
    const applied = await migrate(db, REAL_DIR);
    expect(applied).toEqual(listMigrations(REAL_DIR));
    expect(applied[0]).toBe('0001_extensions.sql');
    const rows = (await db.query<{ name: string }>('SELECT name FROM schema_migrations ORDER BY name')).rows;
    expect(rows.map(r => r.name)).toEqual(applied);
  });

  it('is idempotent: a second run applies nothing', async () => {
    await migrate(db, REAL_DIR);
    expect(await migrate(db, REAL_DIR)).toEqual([]);
  });

  it('applies only the new file when one is added later', async () => {
    const dir = tmpMigrations({ '0001_a.sql': 'CREATE TABLE a (id int);' });
    await migrate(db, dir);
    fs.writeFileSync(path.join(dir, '0002_b.sql'), 'CREATE TABLE b (id int);');
    expect(await migrate(db, dir)).toEqual(['0002_b.sql']);
  });

  it('rolls a failing migration back completely and does not record it', async () => {
    const dir = tmpMigrations({
      '0001_ok.sql': 'CREATE TABLE ok_table (id int);',
      '0002_bad.sql': 'CREATE TABLE half_done (id int); SELECT * FROM table_that_does_not_exist;',
    });
    await expect(migrate(db, dir)).rejects.toThrow(/0002_bad.sql failed and was rolled back/);

    const recorded = (await db.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(r => r.name);
    expect(recorded).toEqual(['0001_ok.sql']);
    const half = await db.query("SELECT to_regclass('public.half_done') IS NOT NULL AS exists");
    expect(half.rows[0]).toMatchObject({ exists: false });
  });

  it('ignores files that are not named like migrations', () => {
    const dir = tmpMigrations({ '0001_a.sql': '', 'notes.md': '', 'bad name.sql': '', '2_x.sql': '' });
    expect(listMigrations(dir)).toEqual(['0001_a.sql']);
  });
});
