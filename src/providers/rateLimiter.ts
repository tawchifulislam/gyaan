import { realSleep } from './types.js';
import type { Sleep } from './types.js';

/**
 * Sliding one-minute window limiter for requests per minute (RPM) and tokens per minute (TPM).
 * Voyage's free accounts (no payment method on file) are capped at 3 RPM and 10K TPM, so the
 * benchmark has to pace itself instead of firing everything at once.
 */
export class RateLimiter {
  private events: { at: number; tokens: number }[] = [];

  constructor(
    private readonly rpm: number,
    private readonly tpm: number,
    private readonly now: () => number = () => Date.now(),
    private readonly sleep: Sleep = realSleep,
  ) {}

  async acquire(tokens: number): Promise<void> {
    for (;;) {
      const t = this.now();
      this.events = this.events.filter(e => t - e.at < 60_000);
      const used = this.events.reduce((sum, e) => sum + e.tokens, 0);
      // A single request bigger than the whole budget is allowed through on its own.
      const needed = Math.min(tokens, this.tpm);
      if (this.events.length < this.rpm && used + needed <= this.tpm) {
        this.events.push({ at: t, tokens });
        return;
      }
      const oldest = this.events[0];
      await this.sleep(oldest ? Math.max(oldest.at + 60_000 - t, 50) : 50);
    }
  }
}
