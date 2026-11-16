import { describe, expect, it } from 'vitest';
import { errorMessage, explain } from './errors.js';

const refused = (addr: string): Error =>
  Object.assign(new Error(`connect ECONNREFUSED ${addr}`), { code: 'ECONNREFUSED' });

describe('errorMessage', () => {
  it('returns an ordinary message as it is', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('reads the reasons inside an AggregateError, whose own message is empty', () => {
    const agg = new AggregateError([refused('::1:5433'), refused('127.0.0.1:5433')]);
    expect(agg.message).toBe('');
    expect(errorMessage(agg)).toBe('connect ECONNREFUSED ::1:5433; connect ECONNREFUSED 127.0.0.1:5433');
  });

  it('falls back to the error code, then the name, when the message is empty', () => {
    expect(errorMessage(Object.assign(new Error(''), { code: 'ECONNRESET' }))).toBe('ECONNRESET');
    expect(errorMessage(new TypeError(''))).toBe('TypeError');
    expect(errorMessage(new AggregateError([]))).toBe('AggregateError');
  });

  it('adds the cause, which is where a failed fetch keeps its real reason', () => {
    const err = new Error('fetch failed', { cause: refused('127.0.0.1:5999') });
    expect(errorMessage(err)).toBe('fetch failed (connect ECONNREFUSED 127.0.0.1:5999)');
  });

  it('copes with values that are not errors', () => {
    expect(errorMessage('plain text')).toBe('plain text');
    expect(errorMessage(42)).toBe('42');
  });
});

describe('explain', () => {
  it('tells you to start Docker when the local database refuses the connection', () => {
    const out = explain(new AggregateError([refused('::1:5433'), refused('127.0.0.1:5433')]), { local: true });
    expect(out).toContain('ECONNREFUSED');
    expect(out).toContain('npm run db:up');
  });
  it('gives a different hint for a remote database', () => {
    const out = explain(refused('1.2.3.4:5432'));
    expect(out).toContain('Hint:');
    expect(out).not.toContain('db:up');
  });
  it('recognises a wrong password and a missing database', () => {
    expect(explain(new Error('password authentication failed for user "x"'))).toContain('rejected');
    expect(explain(new Error('database "nope" does not exist'))).toContain('does not exist');
  });
  it('adds no hint for errors it does not recognise', () => {
    expect(explain(new Error('something odd'))).toBe('something odd');
  });
});
