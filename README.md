# Gyaan

A cross-article research assistant for [Thirsty for Knowledge](https://github.com/tawchifulislam/tfknowledge-client),
a Bengali knowledge blog. A reader asks a question in Bengali or English and gets one short answer
with citations that link to the exact article sections it came from.

> **Status: work in progress.** Built in public, step by step. See the checklist below.

## Why this is not another "chat with your docs" demo

* **Bengali is a low-resource language for embedding models.** The embedding model is chosen by
  measuring recall on a evaluation set of realistic questions, not from a leaderboard.
* **The evaluation set lives in the repo** (`eval/`) and runs in CI, so a change to chunking or
  the model cannot silently make retrieval worse.
* **It runs entirely on free tiers**, with a retrieval-only fallback when the answer-generation
  quota runs out.

## Plan

- [x] Project scaffold, section-aware chunker, corpus export from the blog's public API, eval tooling
- [x] Evaluation set (27 reviewed questions)
- [x] Embedding benchmark and decision: [ADR 001](docs/decisions/001-embedding-model.md)
- [ ] Ingestion service (PostgreSQL + pgvector), signed idempotent webhook from the blog
- [ ] `/ask` endpoint with streaming answers, citations, caching and a daily budget
- [ ] Admin tools: duplicate topic-request check, coverage report
- [ ] Architecture notes, benchmark results and demo

## Stack

TypeScript, Node.js, Express (from step 3), PostgreSQL + pgvector (Neon), Vitest, GitHub Actions.

## Getting started

```bash
npm install
cp .env.example .env     # set TFK_API_URL to the blog server

npm run export           # published posts -> eval/corpus.json
npm run chunks           # chunks + eval/articles.md (a map for writing questions)
npm run validate         # check eval/cases.json
npm test
npm run typecheck
```

## Layout

```
src/core/    chunker, text normalisation, shared types (pure functions, fully tested)
src/tfk/     client for the blog's public API (retries while a free-tier server wakes up)
src/eval/    evaluation-set validation
scripts/     export, chunking and validation CLIs
eval/        corpus snapshot, evaluation cases and their documentation
```
