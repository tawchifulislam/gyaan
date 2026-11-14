# ADR 001: Embedding model

- **Status:** accepted, provisional (revisit when the blog has 15-20 posts)
- **Date:** 2026-11-14

## Context

Gyaan answers questions about a Bengali blog by retrieving the right article sections and passing
them to a language model. Retrieval quality decides everything downstream, and Bengali is a
comparatively low-resource language for embedding models, so the model was measured rather than
picked from a leaderboard.

Constraints: no paid services (free tiers only), questions in Bengali, English or both, and a
public site that must stay responsive.

**What was measured**

- Corpus: 6 articles, 10 chunks (the posts have no headings, so chunks are size-based).
- Questions: 27, reviewed and corrected by the author.
  - 21 answerable: direct 7, cross-lingual (English question, Bengali article) 4, mixed Bengali/English 3,
    multi-article 3, digit-script mismatch (e.g. "781" vs "৭৮১", "12000" vs "১২ হাজার") 4.
  - 6 out-of-scope, several deliberately close to existing topics.
- Models: `voyage-4`, `voyage-4-large`, `voyage-4-lite`, `gemini-embedding-001`, `gemini-embedding-2`.
- Variant: Bengali digits converted to ASCII before embedding (`--digits ascii`) vs left as written.

Reproduce with `npm run bench -- --models <provider:model>`; raw results are in `eval/results/` and the
generated comparison is `eval/results.md`.

## Results

| Model | R-precision | MRR | AUC (answerable vs out-of-scope) |
| --- | --- | --- | --- |
| gemini-embedding-001 | 100% | 1.000 | 0.90 |
| gemini-embedding-2 | 100% | 1.000 | 0.87 |
| voyage-4-large | 100% | 1.000 | 0.87 |
| voyage-4-lite | 100% | 1.000 | 0.81 |
| voyage-4 | 100% | 1.000 | 0.76 |

Digit conversion (`ascii`) changed nothing measurable: same R-precision and MRR, AUC 0.90 vs 0.90
(gemini-embedding-001) and 0.76 vs 0.76 (voyage-4).

### What the numbers say

1. **Accuracy on answerable questions is saturated.** Every model ranks every needed article first,
   in every question type. With six articles the test cannot tell the models apart, so retrieval
   accuracy is not the deciding factor.
2. **The out-of-scope split is weak evidence.** Larger models separated answerable from out-of-scope
   questions somewhat better (AUC 0.76 to 0.90), but there are only 6 out-of-scope questions, so
   differences of this size are not reliable.
3. **No model refuses the near-topic questions on score alone.** At each model's best threshold the same
   4 of 6 out-of-scope questions are refused and the same 2 get through. A similarity threshold stops
   far-off questions ("what is Bitcoin?") but not nearby ones, so the answer-generation prompt needs its
   own "the sources do not contain the answer" rule. That is measured separately, later.
4. **Digit normalisation is not needed** on this corpus, so it is not adopted. Less code, same result.

### What decided it: free-tier throughput

| Provider | Free limit that matters for live questions | Source |
| --- | --- | --- |
| Voyage (no payment method) | 3 requests/min, 10K tokens/min | Voyage documentation |
| Gemini embedding models | 100 requests/min, 30K tokens/min, 1,000 requests/day | Author's Google AI Studio rate-limit page, 2026-11-14 |

Every reader question needs one query embedding. At 3 requests/min the live site would handle roughly
three questions a minute in total. The Gemini limits are more than thirty times higher.

## Decision

Use **`gemini-embedding-001`** for both documents (`RETRIEVAL_DOCUMENT`) and queries
(`RETRIEVAL_QUERY`), with Bengali digits left as written.

- Accuracy is tied, so the choice rests on what is measurable: it has the highest AUC (weak evidence)
  and the free tier supports live traffic.
- It is the established model. `gemini-embedding-2` measured the same on accuracy and slightly lower on
  AUC, and gives no measured benefit, so there is no reason to take a newer model's risk.
- Voyage stays in the harness as a tested alternative. It becomes viable if a payment method is added
  (limits rise) or if the corpus grows large enough for it to pull ahead.

## Consequences and risks

- **Vendor and quota dependence.** Free-tier limits can change. The provider layer is an interface and
  results are cached, so switching models is a config change plus a re-embedding run.
- **Re-embedding on model change.** Chunks store a content hash and the model id so only what changed is
  re-embedded.
- **Privacy.** On the free tier, Google may use submitted content to improve its products. Blog text is
  already public, but readers' questions leave the site. The `/ask` page must say so.
- **Dimensions.** The model returns 3072-dimensional vectors by default. pgvector's index types have
  dimension limits, so step 3 will check them and either request fewer dimensions or use exact search,
  which is fine at this corpus size.

## Limitations of this evaluation

- Six articles and ten chunks. recall@3 and recall@5 are trivially high; only the order of results
  carries information, and even that did not differ.
- Six out-of-scope questions, so the threshold values and AUC differences are indicative only.
- All 27 questions are phrased more tidily than real readers write. The set was reviewed and corrected
  by the author (one mislabelled out-of-scope question was caught and fixed).
- No section-level evaluation: the posts have no headings.

## When to revisit

- The blog reaches 15-20 posts (re-run `npm run export`, `npm run chunks`, add questions, re-run the bench).
- At least 8 messy, short, author-written questions are added (the most likely way to separate models).
- A free-tier quota or model changes, or a model is deprecated.
- A payment method is added, which would make the Voyage models usable live.
