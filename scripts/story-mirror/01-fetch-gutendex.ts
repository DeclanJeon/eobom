#!/usr/bin/env bun
/**
 * Gutendex 수집 스크립트 (rate limit 대응)
 *
 * 원인: 연속 요청 시 rate limiting으로 000 응답 (타임아웃)
 * 해결: 3초 간격, 순차 페이지 순회, 에러 시 백오프
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { execSync } from "child_process";

const DELAY_MS = 2000; // 3초 간격 (rate limit 대응)
const RETRY_DELAY_MS = 20000; // 에러 시 10초 대기
const TARGET = 500;
const MAX_RETRIES = 5;
const OUTPUT = "data/story-mirror/gutenberg-candidates.json";

type Book = {
  id: number;
  title: string;
  authors: Array<{ name: string; birth_year: number | null; death_year: number | null }>;
  subjects: string[];
  languages: string[];
  copyright: boolean | null;
  download_count: number;
  formats: Record<string, string>;
};

async function fetchPage(page: number): Promise<{ books: Book[]; hasNext: boolean }> {
  const url = `https://gutendex.com/books?copyright=false&languages=en&sort=popular&page=${page}`;
  // curl을 사용하여 Node.js fetch 타임아웃 문제 회피
  const escaped = url.replace(/"/g, '\\"');
  const output = execSync(`curl -sL --max-time 30 "${escaped}" -H "User-Agent: eobom-story-mirror/1.0"`, {
    encoding: "utf-8",
    timeout: 35000,
  });
  const data = JSON.parse(output) as Record<string, unknown>;
  return {
    books: (data.results ?? []) as Book[],
    hasNext: !!data.next,
  };
}

async function main() {
  const existing = existsSync(OUTPUT)
    ? (JSON.parse(readFileSync(OUTPUT, "utf-8")) as Book[])
    : [];
  const existingIds = new Set(existing.map((b) => b.id));
  const allBooks: Book[] = [...existing];

  console.log(`Starting from ${allBooks.length} books`);

  let page = Math.floor(allBooks.length / 32) + 1; // 이미 수집된 페이지 건너뛰기
  let retries = 0;

  while (allBooks.length < TARGET && retries < MAX_RETRIES) {
    try {
      process.stdout.write(`page ${page}... `);
      const { books, hasNext } = await fetchPage(page);

      let added = 0;
      for (const book of books) {
        if (!existingIds.has(book.id)) {
          allBooks.push(book);
          existingIds.add(book.id);
          added++;
        }
      }

      console.log(`${books.length} fetched, ${added} new (total: ${allBooks.length})`);
      retries = 0;

      // 페이지 완료 시 즉시 저장
      if (added > 0) writeFileSync(OUTPUT, JSON.stringify(allBooks, null, 2));

      if (!hasNext || allBooks.length >= TARGET) break;

      page++;
      await new Promise((r) => setTimeout(r, DELAY_MS));
    } catch (err) {
      retries++;
      console.log(`error (${retries}/${MAX_RETRIES}): ${err}`);
      // 에러 시 10초 대기 후 재시도
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  writeFileSync(OUTPUT, JSON.stringify(allBooks, null, 2));
  console.log(`\nTotal: ${allBooks.length} unique books → ${OUTPUT}`);
}

main().catch(console.error);
