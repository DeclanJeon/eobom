import { getBookName } from "./book-meta";
import type { BibleReference, BibleTranslationId, ScriptureBinding } from "./types";

export function toSlug(ref: BibleReference): string {
  const { code, chapter, startVerse, endVerse } = ref;
  if (startVerse === endVerse) return `${code}-${chapter}-${startVerse}`;
  return `${code}-${chapter}-${startVerse}-${endVerse}`;
}

export function toDisplay(ref: BibleReference): string {
  const name = getBookName(ref.code);
  if (ref.startVerse === ref.endVerse) {
    return `${name} ${ref.chapter}:${ref.startVerse}`;
  }
  return `${name} ${ref.chapter}:${ref.startVerse}-${ref.endVerse}`;
}

export function parseSlug(slug: string): BibleReference | null {
  const m = slug
    .trim()
    .toUpperCase()
    .match(/^([0-9A-Z]{3})-(\d{1,3})-(\d{1,3})(?:-(\d{1,3}))?$/);
  if (!m) return null;
  const code = m[1];
  const chapter = Number(m[2]);
  const startVerse = Number(m[3]);
  const endVerse = m[4] ? Number(m[4]) : startVerse;
  if (endVerse < startVerse || chapter < 1 || startVerse < 1) return null;
  return { code, chapter, startVerse, endVerse };
}

export function toBinding(
  ref: BibleReference,
  opts?: { excerpt?: string; translation?: BibleTranslationId },
): ScriptureBinding {
  return {
    code: ref.code,
    chapter: ref.chapter,
    startVerse: ref.startVerse,
    endVerse: ref.endVerse,
    display: toDisplay(ref),
    excerpt: opts?.excerpt,
    translation: opts?.translation ?? "ko-open-bible",
    slug: toSlug(ref),
  };
}
