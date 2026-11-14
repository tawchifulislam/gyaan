export interface EmbeddingProvider {
  /** e.g. "voyage:voyage-4" */
  readonly id: string;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQueries(texts: string[]): Promise<number[][]>;
}

export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Very rough, deliberately pessimistic token estimate (Bengali needs many tokens per word). */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 1.5);
