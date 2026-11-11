// Heading ids. The chunker records a headingId for every chunk so that a citation can
// link to /posts/<slug>#<headingId>. The blog's post page must generate the SAME ids for
// its headings: same function, same order, every non-empty heading, with the same `used`
// set across one post. (This file gets copied to the blog client when we reach step 4.)

export const slugifyHeading = (
  text: string | null | undefined,
  used: Set<string> = new Set(),
): string => {
  const base =
    (text ?? '')
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '') // so ZWJ/ZWNJ do not split a word
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'section';

  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
};
