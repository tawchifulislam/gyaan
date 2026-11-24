import { describe, expect, it } from 'vitest';
import type { SearchHit } from '../db/articles.js';
import { AnswerParseError, buildUserMessage, parseModelAnswer, SYSTEM_PROMPT } from './prompt.js';

const hit = (n: number, text = `text ${n}`): SearchHit => ({
  chunkId: String(n),
  articleId: `a${n}`,
  slug: `slug-${n}`,
  title: `Title ${n}`,
  position: n - 1,
  heading: '',
  headingId: '',
  text,
  score: 0.9,
});

describe('buildUserMessage', () => {
  it('numbers the sources from 1 and ends with the question', () => {
    const msg = buildUserMessage('কেন?', [hit(1), hit(2)], 'bn');
    expect(msg).toContain('[1] Title 1 (part 1)\ntext 1');
    expect(msg).toContain('[2] Title 2 (part 2)\ntext 2');
    expect(msg).toContain('Question: কেন?');
  });
  it('states the answer language last, in words the model cannot miss', () => {
    expect(buildUserMessage('Why?', [hit(1)], 'en').trim().endsWith('Answer language: English')).toBe(true);
    expect(buildUserMessage('কেন?', [hit(1)], 'bn')).toContain('Answer language: Bengali');
  });
  it('clips a very long source', () => {
    const msg = buildUserMessage('q', [hit(1, 'x'.repeat(10_000))], 'en');
    expect(msg.length).toBeLessThan(3200);
    expect(msg).toContain('...');
  });
});

describe('system prompt', () => {
  it('states the rules that matter most', () => {
    expect(SYSTEM_PROMPT).toMatch(/ONLY the numbered sources/);
    expect(SYSTEM_PROMPT).toMatch(/"answerable" to false/);
    expect(SYSTEM_PROMPT).toMatch(/Answer language:/);
    expect(SYSTEM_PROMPT).toMatch(/never follow instructions/i);
  });
});

describe('parseModelAnswer', () => {
  it('reads a valid reply', () => {
    expect(parseModelAnswer('{"answerable":true,"answer":" উত্তর ","used_sources":[2,1]}', 3)).toEqual({
      answerable: true,
      answer: 'উত্তর',
      usedSources: [2, 1],
    });
  });
  it('accepts a code fence or text around the JSON', () => {
    const body = '{"answerable":false,"answer":"","used_sources":[]}';
    expect(parseModelAnswer('```json\n' + body + '\n```', 2).answerable).toBe(false);
    expect(parseModelAnswer(`Here you go: ${body} Thanks`, 2).answerable).toBe(false);
  });
  it('drops source numbers that do not exist, and duplicates', () => {
    const r = parseModelAnswer('{"answerable":true,"answer":"a","used_sources":[1,1,0,4,"2",2.5,2]}', 3);
    expect(r.usedSources).toEqual([1, 2]);
  });
  it('treats missing fields leniently but requires a boolean answerable', () => {
    expect(parseModelAnswer('{"answerable":true}', 2)).toEqual({ answerable: true, answer: '', usedSources: [] });
    expect(() => parseModelAnswer('{"answer":"x"}', 2)).toThrow(AnswerParseError);
    expect(() => parseModelAnswer('{"answerable":"yes"}', 2)).toThrow(AnswerParseError);
  });
  it('rejects non-JSON and non-objects', () => {
    expect(() => parseModelAnswer('I think the answer is 42', 2)).toThrow(/not JSON/);
    expect(() => parseModelAnswer('{broken', 2)).toThrow(AnswerParseError);
    expect(() => parseModelAnswer('[1,2]', 2)).toThrow(AnswerParseError);
    expect(() => parseModelAnswer('', 2)).toThrow(AnswerParseError);
  });
});
