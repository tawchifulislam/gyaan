import fs from 'node:fs';
import type { Article, EvalCase } from './types.js';

export const CORPUS_PATH = 'eval/corpus.json';
export const CHUNKS_PATH = 'eval/chunks.json';
export const CASES_PATH = 'eval/cases.json';

const readJson = (path: string, hint: string): unknown => {
  if (!fs.existsSync(path)) throw new Error(`${path} not found. ${hint}`);
  return JSON.parse(fs.readFileSync(path, 'utf8')) as unknown;
};

export const loadCorpus = (path = CORPUS_PATH): Article[] => {
  const data = readJson(path, 'Run: npm run export') as { articles?: Article[] };
  if (!Array.isArray(data.articles)) throw new Error(`${path} has no "articles" array`);
  return data.articles;
};

export const loadCases = (path = CASES_PATH): Partial<EvalCase>[] => {
  const data = readJson(path, 'It should have been created by the bootstrap script.') as {
    cases?: Partial<EvalCase>[];
  };
  if (!Array.isArray(data.cases)) throw new Error(`${path} has no "cases" array`);
  return data.cases;
};
