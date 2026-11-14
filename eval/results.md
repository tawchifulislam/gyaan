# Embedding benchmark

Corpus: 6 articles, 10 chunks. Questions: 20 answerable + 5 out-of-scope.

> **Read with care:** with a corpus this small, recall@3 and recall@5 are easy for every model. Compare recall@1 and MRR first. Scores from different models are not comparable with each other, only the ranking they produce is.

## Retrieval quality (higher is better)

| Model | digit mode | recall@1 | recall@3 | recall@5 | MRR |
| --- | --- | --- | --- | --- | --- |
| gemini:gemini-embedding-001 | keep | 93% | 100% | 100% | 1.000 |
| voyage:voyage-4 | keep | 93% | 100% | 100% | 1.000 |

## recall@1 by question type

| Model | digit mode | cross-lingual | digits | direct | mixed | multi-article |
| --- | --- | --- | --- | --- | --- | --- |
| gemini:gemini-embedding-001 | keep | 100% (4) | 100% (4) | 100% (6) | 100% (3) | 50% (3) |
| voyage:voyage-4 | keep | 100% (4) | 100% (4) | 100% (6) | 100% (3) | 50% (3) |

## Can the top score tell answerable questions from out-of-scope ones?

AUC 1.0 means every answerable question scored above every out-of-scope one. 0.5 is a coin flip. The threshold is the "answer only if the top score is at least this" cut-off with the best balanced accuracy on this small set (answerable and out-of-scope questions count equally), so treat it as a starting point, not a final value.

| Model | digit mode | AUC | best threshold | accuracy | answered kept | out-of-scope refused |
| --- | --- | --- | --- | --- | --- | --- |
| gemini:gemini-embedding-001 | keep | 0.83 | 0.636 | 92% | 100% | 60% |
| voyage:voyage-4 | keep | 0.66 | 0.312 | 92% | 100% | 60% |

## Questions where the right article was not ranked first

**gemini:gemini-embedding-001** (digit mode: keep): q15, q16, q17

**voyage:voyage-4** (digit mode: keep): q15, q16, q17

---
Generated 2026-11-14 by `npm run bench`.
