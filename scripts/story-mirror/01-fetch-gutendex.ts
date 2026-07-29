#!/usr/bin/env bun
/**
 * Gutendex에서 인기순으로 수집 (주제 필터 없이).
 * copyright=false, languages=en, sort=popular
 */

import { writeFileSync, existsSync, readFileSync } from "fs";

const DELAY_MS = 200;
const MAX_PAGES = 20; // 페이지당 32권 × 20 = 640권
const OUTPUT = "data/story-mirror/gutenberg-candidates.json";

type GutenbergBook = {
  id: number;
  title: string;
  authors: Array<{ name: string; birth_year: number | null; death_year: number | null }>;
  subjects: string[];
  languages: string[];
  copyright: boolean | null;
  download_count: number;
  formats: Record<string, string>;
};

async function fetchPage(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: { "User-Agent": "eobom-story-mirror/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function main() {
  const existing = existsSync(OUTPUT)
    ? (JSON.parse(readFileSync(OUTPUT, "utf-8")) as GutenbergBook[])
    : [];
  const existingIds = new Set(existing.map((b) => b.id));
  const allBooks: GutenbergBook[] = [...existing];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://gutendex.com/books?copyright=false&languages=en&sort=popular&page=${page}`;
    process.stdout.write(`page ${page}... `);
    try {
      const data = await fetchPage(url);
      const results = (data.results ?? []) as GutenbergBook[];
      let added = 0;
      for (const book of results) {
        if (!existingIds.has(book.id)) {
          allBooks.push(book);
          existingIds.add(book.id);
          added++;
        }
      }
      console.log(`${results.length} fetched, ${added} new (total: ${allBooks.length})`);
      if (!data.next || allBooks.length >= 500) break;
    } catch (err) {
      console.log(`error: ${err}`);
      break;
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  writeFileSync(OUTPUT, JSON.stringify(allBooks, null, 2));
  console.log(`\nTotal: ${allBooks.length} unique books → ${OUTPUT}`);
}

main().catch(console.error);
