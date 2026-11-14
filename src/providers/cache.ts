import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** Tiny on-disk embedding cache so a text is never paid for (or waited for) twice. */
export class EmbeddingCache {
  private data: Record<string, number[]> = {};

  constructor(private readonly file: string | null) {
    if (file && fs.existsSync(file)) {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, number[]>;
    }
  }

  static key(...parts: string[]): string {
    return createHash('sha256').update(parts.join('\u0000')).digest('hex');
  }

  get(key: string): number[] | undefined {
    return this.data[key];
  }

  set(key: string, vector: number[]): void {
    this.data[key] = vector;
  }

  save(): void {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }
}
