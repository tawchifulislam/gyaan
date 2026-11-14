# Gyaan evaluation set

Questions with the article (and optionally section) that should answer them.
Retrieval quality is measured against this set whenever the chunking, the embedding model
or the retrieval settings change. The questions are written **before** looking at any
retrieval results.

## Files

| File | What it is |
| --- | --- |
| `corpus.json` | Frozen export of the published articles (`npm run export`) |
| `chunks.json` | Chunks built from the corpus (`npm run chunks`, not committed) |
| `articles.md` | Map of every article and section, for writing questions |
| `cases.json` | The evaluation questions |

## Case format

```json
{
  "id": "q01",
  "question": "…",
  "language": "bn",
  "category": "direct",
  "answerable": true,
  "expectedArticles": ["article-slug"],
  "expectedSections": [{ "slug": "article-slug", "headingId": "section-id" }],
  "notes": "optional"
}
```

* `language`: `bn`, `en` or `mixed`
* `category`: `direct`, `cross-lingual` (English question about Bengali content), `mixed`
  (Bengali text with English terms), `multi-article` (needs 2+ articles), `digits`
  (Bengali digits vs ASCII digits), `out-of-scope` (the blog has no answer; `answerable: false`,
  `expectedArticles: []`)
* `expectedSections` is optional but makes the section-level metric possible

## Writing good cases

* Paraphrase. If the question repeats phrases from the article, retrieval looks better than it is.
  `npm run validate` warns about shared 4-word phrases.
* Write the kind of question a real reader would type, including short, vague ones.
* Aim for 25+ cases with at least 3 in every category.
* Articles are identified by slug in this file. A slug changes when the blog post's title is
  edited, so re-export and re-validate after renaming a post.
