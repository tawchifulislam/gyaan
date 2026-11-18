# Embedding benchmark

Corpus: 8 articles, 15 chunks. Questions: 28 answerable + 8 out-of-scope.

> **Read with care:** with a corpus this small, most models will score near 100% on the answerable questions, so those numbers cannot rank them. Scores from different models are not on the same scale; only the order they produce is comparable.

## Retrieval quality (higher is better)

*R-precision*: of the articles a question needs, how many are in the top N (N = how many are needed). For a one-article question this means "the first result was right". *recall@1* cannot exceed 50% on a two-article question by definition, so use R-precision for those.

| Model | digit mode | R-precision | recall@1 | recall@3 | recall@5 | MRR |
| --- | --- | --- | --- | --- | --- | --- |
| gemini:gemini-embedding-001 | keep | 100% | 91% | 100% | 100% | 1.000 |
| voyage:voyage-4 | keep | 100% | 91% | 100% | 100% | 1.000 |

## R-precision by question type

| Model | digit mode | cross-lingual | digits | direct | mixed | multi-article |
| --- | --- | --- | --- | --- | --- | --- |
| gemini:gemini-embedding-001 | keep | 100% (5) | 100% (5) | 100% (9) | 100% (4) | 100% (5) |
| voyage:voyage-4 | keep | 100% (5) | 100% (5) | 100% (9) | 100% (4) | 100% (5) |

## How clearly is the right article ahead?

Margin = score of the weakest needed article minus the score of the best article that was not needed. Above 0 means the right articles outrank every wrong one; a small margin means a near miss. Margins are only comparable within one model (the score scales differ).

| Model | digit mode | smallest margin | median margin |
| --- | --- | --- | --- |
| gemini:gemini-embedding-001 | keep | 0.055 | 0.094 |
| voyage:voyage-4 | keep | 0.048 | 0.234 |

## Can the top score tell answerable questions from out-of-scope ones?

AUC 1.0 means every answerable question scored above every out-of-scope one. 0.5 is a coin flip. The threshold is the "answer only if the top score is at least this" cut-off with the best balanced accuracy on this small set (answerable and out-of-scope questions count equally), so treat it as a starting point, not a final value. With only a handful of out-of-scope questions, small AUC differences between models are not reliable.

| Model | digit mode | AUC | best threshold | accuracy | answered kept | out-of-scope refused |
| --- | --- | --- | --- | --- | --- | --- |
| gemini:gemini-embedding-001 | keep | 0.89 | 0.704 | 78% | 75% | 88% |
| voyage:voyage-4 | keep | 0.81 | 0.371 | 89% | 93% | 75% |

## Questions where a needed article was not in the top N

**gemini:gemini-embedding-001** (digit mode: keep): none

**voyage:voyage-4** (digit mode: keep): none

---
Generated 2026-11-18 by `npm run bench`.
