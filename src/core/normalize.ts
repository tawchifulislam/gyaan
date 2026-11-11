// Text normalisation shared by the chunker, the eval harness and (later) the query path.
// Queries and documents must go through the SAME normalisation or matching suffers.

// Zero-width space, BOM, soft hyphen, word joiner: pure noise.
// NOTE: ZWJ (U+200D) and ZWNJ (U+200C) are deliberately KEPT. Bengali spelling
// depends on them (for example the ya-phala after ra in some words).
const INVISIBLE = /[\u200B\uFEFF\u00AD\u2060]/g;

export const normalizeText = (s: string | null | undefined): string =>
  (s ?? '')
    .normalize('NFC')
    .replace(INVISIBLE, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v\u00A0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** ৭৮১ -> 781. Used only for the "digits: ascii" embedding variant. Display text is never changed. */
export const bnDigitsToAscii = (s: string): string =>
  s.replace(/[০-৯]/g, d => String(BN_DIGITS.indexOf(d)));

export const countWords = (s: string | null | undefined): number => {
  const t = (s ?? '').trim();
  return t ? t.split(/\s+/).length : 0;
};

/** Splits after the Bengali danda (।) and after . ? ! */
export const splitSentences = (text: string): string[] =>
  text
    .split(/(?<=[।?!.])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

/** Lower-cased word tokens (letters, combining marks, digits). Works for Bengali and English. */
export const tokenize = (s: string | null | undefined): string[] =>
  normalizeText(s).toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
