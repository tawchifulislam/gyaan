import { describe, expect, it, vi } from 'vitest';
import { fetchPublishedArticles, HttpError } from './client.js';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const post = (n: number, extra: Record<string, unknown> = {}) => ({
  _id: `id${n}`,
  slug: `slug-${n}`,
  title: `Title ${n}`,
  language: 'bn',
  publishedAt: `2026-09-0${n}T00:00:00.000Z`,
  excerpt: `ex ${n}`,
  ...extra,
});

const router =
  (routes: Record<string, () => Response>) =>
  async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    const key = Object.keys(routes).find(k => url.endsWith(k));
    if (!key) throw new Error(`unexpected url ${url}`);
    return routes[key]!();
  };

describe('fetchPublishedArticles', () => {
  it('walks every list page, loads full posts and sorts oldest first', async () => {
    const fetchImpl = vi.fn(
      router({
        '/api/posts?page=1&limit=50': () => json({ posts: [post(2), post(1)], totalPages: 2, currentPage: 1 }),
        '/api/posts?page=2&limit=50': () => json({ posts: [post(3)], totalPages: 2, currentPage: 2 }),
        '/api/posts/slug-1': () => json({ ...post(1), content: '<p>one</p>' }),
        '/api/posts/slug-2': () => json({ ...post(2), content: '<p>two</p>' }),
        '/api/posts/slug-3': () => json({ ...post(3), content: '<p>three</p>' }),
      }),
    ) as unknown as typeof fetch;

    const articles = await fetchPublishedArticles({ baseUrl: 'https://blog.test/', fetchImpl });
    expect(articles.map(a => a.id)).toEqual(['id1', 'id2', 'id3']);
    expect(articles[0]).toMatchObject({ slug: 'slug-1', content: '<p>one</p>', language: 'bn' });
  });

  it('retries while the server is waking up (503) and then succeeds', async () => {
    let listCalls = 0;
    const sleeps: number[] = [];
    const fetchImpl = vi.fn(
      router({
        '/api/posts?page=1&limit=50': () => {
          listCalls++;
          return listCalls < 3
            ? new Response('warming up', { status: 503 })
            : json({ posts: [post(1)], totalPages: 1, currentPage: 1 });
        },
        '/api/posts/slug-1': () => json({ ...post(1), content: '<p>x</p>' }),
      }),
    ) as unknown as typeof fetch;

    const articles = await fetchPublishedArticles({
      baseUrl: 'https://blog.test',
      fetchImpl,
      sleep: async ms => {
        sleeps.push(ms);
      },
    });
    expect(articles).toHaveLength(1);
    expect(listCalls).toBe(3);
    expect(sleeps).toEqual([2000, 4000]);
  });

  it('gives up after the retry limit', async () => {
    const fetchImpl = (async () => new Response('down', { status: 503 })) as unknown as typeof fetch;
    await expect(
      fetchPublishedArticles({ baseUrl: 'https://blog.test', fetchImpl, retries: 1, sleep: async () => {} }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('skips a post that returns 404 instead of failing the export', async () => {
    const fetchImpl = vi.fn(
      router({
        '/api/posts?page=1&limit=50': () => json({ posts: [post(1), post(2)], totalPages: 1 }),
        '/api/posts/slug-1': () => json({ message: 'Post not found' }, 404),
        '/api/posts/slug-2': () => json({ ...post(2), content: '<p>two</p>' }),
      }),
    ) as unknown as typeof fetch;

    const articles = await fetchPublishedArticles({ baseUrl: 'https://blog.test', fetchImpl });
    expect(articles.map(a => a.id)).toEqual(['id2']);
  });

  it('does not retry client errors other than 404 handling', async () => {
    const fetchImpl = vi.fn(
      router({ '/api/posts?page=1&limit=50': () => json({ message: 'nope' }, 400) }),
    ) as unknown as typeof fetch;
    await expect(
      fetchPublishedArticles({ baseUrl: 'https://blog.test', fetchImpl, sleep: async () => {} }),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
