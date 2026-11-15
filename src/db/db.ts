// The smallest database surface the app needs. Real code uses a `pg` client; tests use an
// in-process Postgres (PGlite). Both fit behind this interface.
export interface Db {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
  /** Runs one or more statements with no parameters (used for migration files). */
  exec(sql: string): Promise<void>;
}
