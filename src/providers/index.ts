import { EmbeddingCache } from './cache.js';
import { GeminiProvider } from './gemini.js';
import { RateLimiter } from './rateLimiter.js';
import type { EmbeddingProvider } from './types.js';
import { VoyageProvider } from './voyage.js';

export const DEFAULT_MODELS = [
  'voyage:voyage-4',
  'voyage:voyage-4-lite',
  'voyage:voyage-4-large',
  'gemini:gemini-embedding-001',
  'gemini:gemini-embedding-2',
];

export type Env = Record<string, string | undefined>;

export const missingKey = (spec: string, env: Env): string | null => {
  const [provider] = spec.split(':');
  if (provider === 'voyage' && !env.VOYAGE_API_KEY) return 'VOYAGE_API_KEY';
  if (provider === 'gemini' && !env.GEMINI_API_KEY) return 'GEMINI_API_KEY';
  return null;
};

/** spec looks like "voyage:voyage-4" or "gemini:gemini-embedding-001" */
export const createProvider = (
  spec: string,
  env: Env,
  log: (message: string) => void = () => undefined,
): EmbeddingProvider => {
  const [provider, ...rest] = spec.split(':');
  const model = rest.join(':');
  if (!provider || !model) throw new Error(`Bad model spec "${spec}". Use provider:model, e.g. voyage:voyage-4`);

  const cache = new EmbeddingCache(`.cache/embeddings/${provider}__${model}.json`);

  if (provider === 'voyage') {
    if (!env.VOYAGE_API_KEY) throw new Error('VOYAGE_API_KEY is missing');
    // Free accounts without a payment method: 3 requests/min and 10K tokens/min.
    // With a payment method on file, raise these in .env (VOYAGE_RPM / VOYAGE_TPM).
    const rpm = Number(env.VOYAGE_RPM ?? 3);
    const tpm = Number(env.VOYAGE_TPM ?? 10_000);
    return new VoyageProvider({
      apiKey: env.VOYAGE_API_KEY,
      model,
      cache,
      limiter: new RateLimiter(rpm, tpm),
      maxBatchTokens: Math.max(1000, Math.floor(tpm * 0.6)),
      ...(env.VOYAGE_BASE_URL ? { baseUrl: env.VOYAGE_BASE_URL } : {}),
      log,
    });
  }
  if (provider === 'gemini') {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');
    return new GeminiProvider({
      apiKey: env.GEMINI_API_KEY,
      model,
      cache,
      ...(env.GEMINI_BASE_URL ? { baseUrl: env.GEMINI_BASE_URL } : {}),
      log,
    });
  }
  throw new Error(`Unknown provider "${provider}" in "${spec}"`);
};
