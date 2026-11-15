import { describe, expect, it } from 'vitest';
import { describeTarget, scrub } from './connect.js';

describe('describeTarget', () => {
  it('shows host and database but never the user or password', () => {
    const url = 'postgresql://neondb_owner:s3cr3t-pass@ep-cool-123.us-east-2.aws.neon.tech/neondb?sslmode=require';
    const out = describeTarget(url);
    expect(out).toBe('ep-cool-123.us-east-2.aws.neon.tech / neondb');
    expect(out).not.toContain('s3cr3t');
    expect(out).not.toContain('neondb_owner');
  });
  it('includes a non-default port', () => {
    expect(describeTarget('postgres://gyaan:gyaan@localhost:5433/gyaan')).toBe('localhost:5433 / gyaan');
  });
  it('does not echo a malformed string', () => {
    expect(describeTarget('not a url with secret')).toBe('(unreadable connection string)');
  });
});

describe('scrub', () => {
  it('removes the password and the whole URL from an error message', () => {
    const url = 'postgresql://user:p%40ss@host/db';
    expect(scrub('password authentication failed for p@ss', url)).not.toContain('p@ss');
    expect(scrub(`could not connect to ${url}`, url)).toBe('could not connect to ***');
  });
  it('leaves messages alone when there is nothing to scrub', () => {
    expect(scrub('timeout', 'postgres://host/db')).toBe('timeout');
  });
});
