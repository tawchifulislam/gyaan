// Reads published posts from the blog's PUBLIC API (no database access needed).
//
//   GET /api/posts?page=1&limit=50  -> { posts: [...summaries], totalPages, currentPage }
//   GET /api/posts/:slug            -> the full post, including HTML content
//
// The blog server runs on a free host that sleeps when idle, so the first request can
// take a minute. Requests therefore retry with backoff and use a long timeout.
import type { Article } from '../core/types.js';

export interface TfkClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
  pageSize?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

interface PostSummary {
  _id: string;
  slug: string;
  title: string;
  language?: string;
  publishedAt?: string | null;
  excerpt?: string;
}

interface PostDetail extends PostSummary {
  content?: string;
}

interface ListResponse {
  posts: PostSummary[];
  totalPages?: number;
  currentPage?: number;
}

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const defaultSleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

const fetchJson = async <T>(url: string, o: Required<Omit<TfkClientOptions, 'baseUrl' | 'pageSize'>>): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= o.retries; attempt++) {
    try {
      const res = await o.fetchImpl(url, { signal: AbortSignal.timeout(o.timeoutMs) });
      if (res.ok) return (await res.json()) as T;
      if (!RETRYABLE_STATUS.has(res.status)) throw new HttpError(res.status, url);
      lastError = new HttpError(res.status, url);
    } catch (err) {
      if (err instanceof HttpError && !RETRYABLE_STATUS.has(err.status)) throw err;
      lastError = err;
    }
    if (attempt < o.retries) {
      const wait = 2000 * 2 ** attempt;
      o.log(`  ...server not ready (${String(lastError)}), retrying in ${wait / 1000}s`);
      await o.sleep(wait);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

export const fetchPublishedArticles = async (options: TfkClientOptions): Promise<Article[]> => {
  const base = options.baseUrl.replace(/\/+$/, '');
  const pageSize = Math.min(options.pageSize ?? 50, 50); // the API caps limit at 50
  const o = {
    fetchImpl: options.fetchImpl ?? fetch,
    timeoutMs: options.timeoutMs ?? 90_000,
    retries: options.retries ?? 4,
    sleep: options.sleep ?? defaultSleep,
    log: options.log ?? (() => undefined),
  };

  const summaries = new Map<string, PostSummary>();
  for (let page = 1; ; page++) {
    const data = await fetchJson<ListResponse>(`${base}/api/posts?page=${page}&limit=${pageSize}`, o);
    for (const p of data.posts ?? []) summaries.set(p._id, p);
    o.log(`Listed page ${page}/${data.totalPages ?? '?'} (${summaries.size} posts so far)`);
    if (!data.posts?.length || page >= (data.totalPages ?? page)) break;
  }

  const articles: Article[] = [];
  for (const s of summaries.values()) {
    try {
      const post = await fetchJson<PostDetail>(`${base}/api/posts/${encodeURIComponent(s.slug)}`, o);
      articles.push({
        id: post._id,
        slug: post.slug,
        title: post.title,
        language: post.language ?? s.language ?? 'bn',
        publishedAt: post.publishedAt ?? s.publishedAt ?? null,
        excerpt: post.excerpt ?? s.excerpt ?? '',
        content: post.content ?? '',
      });
    } catch (err) {
      // Unpublished or renamed between the list call and now: skip it, do not fail the export.
      if (err instanceof HttpError && err.status === 404) {
        o.log(`  skipped ${s.slug} (404)`);
        continue;
      }
      throw err;
    }
  }

  return articles.sort((a, b) => (a.publishedAt ?? '').localeCompare(b.publishedAt ?? ''));
};
