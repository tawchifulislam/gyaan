/**
 * A readable message for any thrown value.
 * Plain `err.message` is not enough:
 *  - when a connection to "localhost" fails, Node throws an AggregateError whose own message is
 *    EMPTY (the real reasons, one per address tried, are in `.errors`)
 *  - a failed fetch says only "fetch failed"; the real reason is in `.cause`
 */
export const errorMessage = (err: unknown): string => {
  if (err instanceof AggregateError) {
    const parts = [...new Set(err.errors.map(errorMessage).filter(Boolean))];
    if (parts.length) return parts.join('; ');
  }
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    const base = err.message || (typeof code === 'string' ? code : '') || err.name;
    return err.cause ? `${base} (${errorMessage(err.cause)})` : base;
  }
  return String(err);
};

/** The message plus, when we recognise the problem, a plain-language hint on what to do. */
export const explain = (err: unknown, options: { local?: boolean } = {}): string => {
  const message = errorMessage(err);
  let hint: string | null = null;
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|timeout/i.test(message)) {
    hint = options.local
      ? 'The local database does not seem to be running. Start it with: npm run db:up'
      : 'Could not reach the server. Check the address in .env, your internet connection, and that the database is not suspended.';
  } else if (/password authentication failed/i.test(message)) {
    hint = 'The user or password in the connection string was rejected.';
  } else if (/does not exist/i.test(message) && /database/i.test(message)) {
    hint = 'That database does not exist. Check the name at the end of the connection string.';
  }
  return hint ? `${message}\n  Hint: ${hint}` : message;
};
