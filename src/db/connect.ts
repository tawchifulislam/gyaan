import pg from 'pg';
import type { Db } from './db.js';

/** Matches docker-compose.yml. Used by the `:local` npm scripts. */
export const LOCAL_DATABASE_URL = 'postgres://gyaan:gyaan@localhost:5433/gyaan';

export interface Connection {
  db: Db;
  close(): Promise<void>;
}

/** "ep-cool-123.neon.tech / neondb", safe to print: never includes the user or password. */
export const describeTarget = (url: string): string => {
  try {
    const u = new URL(url);
    const database = u.pathname.replace(/^\//, '') || '(default)';
    return `${u.hostname}${u.port ? `:${u.port}` : ''} / ${database}`;
  } catch {
    return '(unreadable connection string)';
  }
};

/** Removes anything that looks like the connection string from an error message. */
export const scrub = (message: string, url: string): string => {
  // Longest first: the whole URL must go before the password inside it, or it no longer matches.
  const secrets = [url];
  try {
    const { password } = new URL(url);
    secrets.push(password, decodeURIComponent(password));
  } catch {
    // not a URL: only the raw string can be scrubbed
  }
  let out = message;
  for (const secret of secrets) {
    if (secret) out = out.split(secret).join('***');
  }
  return out;
};

export const connect = async (url: string): Promise<Connection> => {
  // Neon puts an idle database to sleep, so the first connection can take a few seconds.
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20_000 });
  try {
    await client.connect();
  } catch (err) {
    throw new Error(scrub(err instanceof Error ? err.message : String(err), url));
  }
  const db: Db = {
    query: async (text, params) => {
      const res = await client.query(text, params as unknown[] | undefined);
      return { rows: res.rows };
    },
    exec: async sql => {
      await client.query(sql);
    },
  };
  return { db, close: () => client.end() };
};
