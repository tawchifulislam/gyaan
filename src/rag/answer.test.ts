import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../db/db.js';
import { migrate } from '../db/migrate.js';
import { createTestDb } from '../db/testing.js';
import type { GenerationRequest, GenerationResult, TextGenerator } from '../providers/generate.js';
import type { EmbeddingProvider } from '../providers/types.js';
import { answerQuestion, gateFor } from './answer.js';

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await migrate(db, path.resolve('migrations'));
});
afterAll(async () => {
  await close();
});

const MODEL = 'fake:embed';

// Chunk vectors: cats = x axis, ships = y axis. A question about neither points along z.
beforeEach(async () => {
  await db.exec('TRUNCATE articles CASCADE');
  await db.query(
    `INSERT INTO articles (id, slug, title, language, content_hash) VALUES
       ('cats', 'cats-slug', 'বিড়ালের গল্প', 'bn', 'h1'), ('ships', 'ships-slug', 'জাহাজের গল্প', 'bn', 'h2')`,
  );
  const chunks: [string, number, string, string][] = [
    ['cats', 0, 'বিড়াল দুধ খায়', '[1,0,0]'],
    ['cats', 1, 'বিড়াল ঘুমায়', '[0.9,0.1,0]'],
    ['ships', 0, 'জাহাজ সাগরে চলে', '[0,1,0]'],
  ];
  for (const [article, pos, text, vec] of chunks) {
    await db.query(
      `INSERT INTO chunks (article_id, position, text, embed_text, word_count, content_hash, embedding, embedding_model, embedding_dim, embedded_at)
       VALUES ($1, $2, $3, $3, 3, $4, $5::vector, $6, 3, now())`,
      [article, pos, text, `${article}${pos}`, vec, MODEL],
    );
  }
});

const embedder = (vectors: Record<string, number[]>): EmbeddingProvider => ({
  id: MODEL,
  embedDocuments: async texts => texts.map(() => [0, 0, 0]),
  embedQueries: async texts => texts.map(t => vectors[t] ?? [0, 0, 1]),
});

const generator = (reply: string | Error, usage = { inputTokens: 500, outputTokens: 40 }) => {
  const calls: GenerationRequest[] = [];
  const g: TextGenerator = {
    id: 'fake:gen',
    generate: async (req): Promise<GenerationResult> => {
      calls.push(req);
      if (reply instanceof Error) throw reply;
      return { text: reply, ...usage, finishReason: 'STOP' };
    },
  };
  return { g, calls };
};

const ask = (q: string, gen: TextGenerator, vectors: Record<string, number[]> = {}, gate = 0.6) =>
  answerQuestion(db, embedder({ 'বিড়াল কী খায়?': [1, 0, 0], 'জাহাজ কোথায় চলে?': [0, 1, 0], ...vectors }), gen, q, { gate });

describe('answerQuestion', () => {
  it('answers with the sources the model used, mapped back to real articles', async () => {
    const { g, calls } = generator('{"answerable":true,"answer":"দুধ","used_sources":[2]}');
    const r = await ask('বিড়াল কী খায়?', g);

    expect(r.mode).toBe('answered');
    expect(r.answer).toBe('দুধ');
    // source [2] is the second-best chunk: the second cat chunk (score 0.99 after the first at 1.0)
    expect(r.citations).toHaveLength(1);
    expect(r.citations[0]).toMatchObject({ slug: 'cats-slug', part: 2, title: 'বিড়ালের গল্প' });
    expect(r.inputTokens).toBe(500);
    expect(r.outputTokens).toBe(40);
    expect(r.topScore).toBeCloseTo(1);
    expect(r.scores.length).toBe(3);
    // the model got numbered sources and the question
    expect(calls).toHaveLength(1);
    expect(calls[0]?.user).toContain('[1] বিড়ালের গল্প (part 1)');
    expect(calls[0]?.user).toContain('Question: বিড়াল কী খায়?');
    expect(calls[0]?.jsonSchema).toBeDefined();
  });

  it('does not call the model for an unrelated question, and suggests the closest articles', async () => {
    const { g, calls } = generator('{"answerable":true,"answer":"x","used_sources":[1]}');
    const r = await ask('বিটকয়েন কী?', g);
    expect(r.mode).toBe('unrelated');
    expect(calls).toHaveLength(0);
    expect(r.answer).toBeNull();
    expect(r.related.length).toBeGreaterThan(0);
  });

  it('suggests each article only once', async () => {
    const { g } = generator('{"answerable":false,"answer":"","used_sources":[]}');
    const r = await ask('বিড়াল কী খায়?', g);
    expect(r.related.map(c => c.slug)).toEqual([...new Set(r.related.map(c => c.slug))]);
    expect(r.related[0]?.slug).toBe('cats-slug');
  });

  it('reports "no answer in the sources" when the model says so', async () => {
    const { g, calls } = generator('{"answerable":false,"answer":"","used_sources":[]}');
    const r = await ask('বিড়াল কী খায়?', g);
    expect(r.mode).toBe('no_answer_in_sources');
    expect(r.answer).toBeNull();
    expect(r.citations).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('does not show an answer that has no valid source', async () => {
    const r1 = await ask('বিড়াল কী খায়?', generator('{"answerable":true,"answer":"দুধ","used_sources":[9]}').g);
    expect(r1.mode).toBe('error');
    expect(r1.error).toMatch(/without a valid source/);
    expect(r1.answer).toBeNull();
    const r2 = await ask('বিড়াল কী খায়?', generator('{"answerable":true,"answer":"দুধ","used_sources":[]}').g);
    expect(r2.mode).toBe('error');
  });

  it('turns an unreadable model reply into an error, keeping the suggestions', async () => {
    const r = await ask('বিড়াল কী খায়?', generator('sorry, I cannot').g);
    expect(r.mode).toBe('error');
    expect(r.error).toMatch(/unreadable model reply/);
    expect(r.related.length).toBeGreaterThan(0);
  });

  it('turns a generator failure into an error', async () => {
    const r = await ask('বিড়াল কী খায়?', generator(new Error('quota exhausted')).g);
    expect(r.mode).toBe('error');
    expect(r.error).toBe('generation failed: quota exhausted');
  });

  it('turns an embedding failure into an error', async () => {
    const broken: EmbeddingProvider = { ...embedder({}), embedQueries: async () => { throw new Error('embed down'); } };
    const r = await answerQuestion(db, broken, generator('{}').g, 'কিছু', { gate: 0.6 });
    expect(r).toMatchObject({ mode: 'error', error: 'retrieval failed: embed down' });
  });

  it('rejects an empty or very long question without any calls', async () => {
    const { g, calls } = generator('{}');
    expect((await ask('   ', g)).error).toMatch(/empty/);
    expect((await ask('ক'.repeat(501), g)).error).toMatch(/longer than 500/);
    expect(calls).toHaveLength(0);
  });

  it('never calls the model when nothing has been embedded with this model yet', async () => {
    const { g, calls } = generator('{}');
    const other: EmbeddingProvider = { ...embedder({}), id: 'another:model' };
    const r = await answerQuestion(db, other, g, 'বিড়াল কী খায়?', { gate: 0 });
    expect(r.mode).toBe('unrelated');
    expect(calls).toHaveLength(0);
  });

  it('measures time with the clock it is given', async () => {
    let t = 1000;
    const r = await answerQuestion(db, embedder({ 'বিড়াল কী খায়?': [1, 0, 0] }), generator('{"answerable":false,"answer":"","used_sources":[]}').g, 'বিড়াল কী খায়?', {
      gate: 0.6,
      now: () => (t += 250),
    });
    expect(r.latencyMs).toBe(250 * 1); // one clock read at the start, one at the end
  });
});

describe('answer language', () => {
  const ENGLISH = 'What do cats eat?';
  it('tells the model to answer in English for an English question, and checks it did', async () => {
    const good = generator('{"answerable":true,"answer":"Cats drink milk.","used_sources":[1]}');
    const r1 = await ask(ENGLISH, good.g, { [ENGLISH]: [1, 0, 0] });
    expect(good.calls[0]?.user).toContain('Answer language: English');
    expect(r1.mode).toBe('answered');
    expect(r1.languageOk).toBe(true);

    const bad = generator('{"answerable":true,"answer":"বিড়াল দুধ খায়।","used_sources":[1]}');
    const r2 = await ask(ENGLISH, bad.g, { [ENGLISH]: [1, 0, 0] });
    expect(r2.mode).toBe('answered');
    expect(r2.languageOk).toBe(false);
  });

  it('asks for Bengali for a Bengali question, including one with an English word in it', async () => {
    const g = generator('{"answerable":true,"answer":"দুধ","used_sources":[1]}');
    const r = await ask('Cat কী খায়?', g.g, { 'Cat কী খায়?': [1, 0, 0] });
    expect(g.calls[0]?.user).toContain('Answer language: Bengali');
    expect(r.languageOk).toBe(true);
  });

  it('has no language verdict when there is no answer', async () => {
    const r = await ask('বিটকয়েন কী?', generator('{}').g);
    expect(r.languageOk).toBeNull();
  });
});

describe('gateFor', () => {
  it('has a measured gate for gemini-embedding-001 and none for unmeasured models', () => {
    expect(gateFor('gemini:gemini-embedding-001')).toBe(0.6);
    expect(gateFor('voyage:voyage-4')).toBe(0);
  });
});
