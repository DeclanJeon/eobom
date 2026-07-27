import { NextResponse } from "next/server";
import { getBook, isValidBookCode, listChapterVerses } from "@/lib/bible";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || "").toUpperCase();
  const chapter = Number(searchParams.get("chapter"));
  if (!/^[0-9A-Z]{3}$/.test(code) || !isValidBookCode(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }
  const book = getBook(code)!;
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return NextResponse.json({ error: "invalid chapter" }, { status: 400 });
  }
  const verses = listChapterVerses(code, chapter);
  if (!verses.length) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(
    { code, chapter, verses },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
