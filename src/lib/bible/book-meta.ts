import { readFileSync } from "node:fs";
import path from "node:path";
import type { BookMeta } from "./types";

type RawBook = {
  order: number;
  code: string;
  name: string;
  testament: string;
  chapters: number;
  verses: number;
};

type RawMeta = {
  translation?: string;
  books: RawBook[];
};

let cached: BookMeta[] | null = null;
let nameByCode: Map<string, string> | null = null;

function dataRoot() {
  return path.join(process.cwd(), "data", "bible", "ko");
}

export function listBooks(): BookMeta[] {
  if (cached) return cached;
  const raw = JSON.parse(
    readFileSync(path.join(dataRoot(), "metadata.json"), "utf8"),
  ) as RawMeta;
  cached = raw.books.map((b) => ({
    order: b.order,
    code: b.code,
    name: b.name,
    testament: b.testament.includes("신약") ? "new" : "old",
    chapters: b.chapters,
    verses: b.verses,
  }));
  nameByCode = new Map(cached.map((b) => [b.code, b.name]));
  return cached;
}

export function getBook(code: string): BookMeta | undefined {
  const upper = code.toUpperCase();
  return listBooks().find((b) => b.code === upper);
}

export function getBookName(code: string): string {
  listBooks();
  return nameByCode?.get(code.toUpperCase()) ?? code.toUpperCase();
}

export function isValidBookCode(code: string): boolean {
  return Boolean(getBook(code));
}

export function translationInfo() {
  return {
    id: "ko-open-bible" as const,
    label: "한국어 성경 (Open Bibles)",
    note: "개역개정이 아닙니다.",
  };
}
