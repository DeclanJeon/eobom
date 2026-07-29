#!/usr/bin/env bun
/**
 * 수집된 메타데이터를 정규화한다.
 * 중복 제거, 필드 정규화, sources manifest 업데이트.
 */

import { readFileSync, writeFileSync } from "fs";

const INPUT = "data/story-mirror/gutenberg-candidates.json";
const OUTPUT = "data/story-mirror/gutenberg-normalized.json";

type RawBook = {
  id: number;
  title: string;
  authors: Array<{ name: string; birth_year: number | null; death_year: number | null }>;
  subjects: string[];
  languages: string[];
  copyright: boolean | null;
  download_count: number;
  formats: Record<string, string>;
};

type NormalizedBook = {
  gutenbergId: number;
  title: string;
  titleOriginal: string;
  author: string;
  authorBirthYear: number | null;
  authorDeathYear: number | null;
  subjects: string[];
  language: string;
  txtUrl: string | null;
  downloadCount: number;
};

function normalizeBook(book: RawBook): NormalizedBook {
  const author = book.authors?.[0]?.name ?? "Unknown";
  const txtKey = Object.keys(book.formats).find((k) => k.startsWith("text/plain"));
  const txtUrl = txtKey ? book.formats[txtKey] : null;

  return {
    gutenbergId: book.id,
    title: book.title,
    titleOriginal: book.title,
    author,
    authorBirthYear: book.authors?.[0]?.birth_year ?? null,
    authorDeathYear: book.authors?.[0]?.death_year ?? null,
    subjects: book.subjects ?? [],
    language: book.languages?.[0] ?? "en",
    txtUrl,
    downloadCount: book.download_count,
  };
}

function main() {
  const raw: RawBook[] = JSON.parse(readFileSync(INPUT, "utf-8"));
  const seen = new Set<number>();
  const normalized: NormalizedBook[] = [];

  for (const book of raw) {
    if (seen.has(book.id)) continue;
    seen.add(book.id);
    normalized.push(normalizeBook(book));
  }

  // 인기순 정렬
  normalized.sort((a, b) => b.downloadCount - a.downloadCount);

  writeFileSync(OUTPUT, JSON.stringify(normalized, null, 2));
  console.log(`Normalized: ${raw.length} → ${normalized.length} books`);
  console.log(`Output: ${OUTPUT}`);
}

main();
