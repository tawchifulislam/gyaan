// Test helper: a throw-away in-memory Postgres with pgvector, no server or Docker needed.
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import type { Db } from './db.js';

export const createTestDb = async (): Promise<{ db: Db; close: () => Promise<void> }> => {
  const pg = new PGlite({ extensions: { vector } });
  await pg.waitReady;
  const db: Db = {
    query: async (text, params) => {
      const res = await pg.query(text, params as unknown[] | undefined);
      return { rows: res.rows as never };
    },
    exec: async sql => {
      await pg.exec(sql);
    },
  };
  return { db, close: () => pg.close() };
};
