-- Articles mirrored from the blog, and the searchable chunks cut from them.

CREATE TABLE articles (
  -- The blog post's MongoDB _id. A slug changes whenever a title is edited, an id never does.
  id            text PRIMARY KEY,
  slug          text NOT NULL,
  title         text NOT NULL,
  language      text NOT NULL,
  published_at  timestamptz,
  -- Hash of the post's HTML, so an unchanged post is skipped when the blog re-sends it.
  content_hash  text NOT NULL,
  synced_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX articles_slug_idx ON articles (slug);

CREATE TABLE chunks (
  id               bigserial PRIMARY KEY,
  article_id       text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  position         integer NOT NULL,
  heading          text NOT NULL DEFAULT '',
  heading_id       text NOT NULL DEFAULT '',
  -- Clean text shown to readers and given to the answer model as a source
  text             text NOT NULL,
  -- "Title > heading" + text: what actually gets embedded
  embed_text       text NOT NULL,
  word_count       integer NOT NULL,
  -- Hash of embed_text. A chunk whose hash is unchanged never needs embedding again.
  content_hash     text NOT NULL,

  -- Filled in after the row exists, so chunks can be stored first and embedded later
  -- (free-tier quotas can make embedding slow or fail; the row must not be lost).
  -- The column has no fixed dimension on purpose: the model is recorded per row, so switching
  -- models is a re-embedding run, not a schema change.
  embedding        vector,
  embedding_model  text,
  embedding_dim    integer,
  embedded_at      timestamptz,

  UNIQUE (article_id, position),

  -- Either no embedding at all, or a complete and self-consistent one.
  CONSTRAINT chunks_embedding_consistent CHECK (
    (embedding IS NULL AND embedding_model IS NULL AND embedding_dim IS NULL AND embedded_at IS NULL)
    OR
    (embedding IS NOT NULL AND embedding_model IS NOT NULL AND embedded_at IS NOT NULL
       AND embedding_dim = vector_dims(embedding))
  )
);

CREATE INDEX chunks_article_idx ON chunks (article_id);
CREATE INDEX chunks_hash_idx ON chunks (content_hash);
-- Work queue: the chunks still waiting for an embedding.
CREATE INDEX chunks_pending_idx ON chunks (id) WHERE embedding IS NULL;

-- No vector index yet, on purpose. This corpus is tiny, so an exact scan takes milliseconds and
-- is perfectly accurate. If it ever grows to many thousands of chunks, add an HNSW index
-- (note: pgvector indexes `vector` up to 2000 dimensions; `halfvec` goes higher).
