import { NextResponse } from "next/server";
import { getCrossRefsForPassage, getCrossRefsForVerse, getCrossRefsGroupedForPassage } from "@/lib/bible/crossrefs";
import { getBook, getVerseCounts, isValidBookCode } from "@/lib/bible";
import { parseSlug } from "@/lib/bible/format";
import { enforcePublicReferenceRateLimit } from "@/lib/bible-reference-rate-limit";

const CACHE_HEADERS = { "Cache-Control": "public, max-age=86400" };

function validRange(code: string, chapter: number, startVerse: number, endVerse: number): boolean {
  const book = getBook(code);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return false;
  if (!Number.isInteger(startVerse) || !Number.isInteger(endVerse) || startVerse < 1 || endVerse < startVerse) return false;
  const counts = getVerseCounts(code);
  const maxVerse = counts?.[chapter - 1] ?? 0;
  return maxVerse > 0 && endVerse <= maxVerse;
}

function parseLimit(raw: string | null): number {
  const value = Number(raw ?? 20);
  return Number.isInteger(value) ? Math.min(100, Math.max(1, value)) : 20;
}

export async function GET(request: Request) {
  const rateLimited = await enforcePublicReferenceRateLimit(request);
  if (rateLimited) return rateLimited;
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "";
  const code = (searchParams.get("code") || "").toUpperCase();
  const chapter = Number(searchParams.get("chapter"));
  const verse = Number(searchParams.get("verse") || searchParams.get("startVerse"));
  const endVerse = Number(searchParams.get("endVerse") || verse);
  const limit = parseLimit(searchParams.get("limit"));
  const grouped = searchParams.get("grouped") === "1";

  if (slug) {
    const ref = parseSlug(slug);
    if (!ref || !isValidBookCode(ref.code) || !validRange(ref.code, ref.chapter, ref.startVerse, ref.endVerse)) {
      return NextResponse.json({ error: "invalid slug" }, { status: 400 });
    }
    if (grouped && ref.startVerse !== ref.endVerse) {
      const g = getCrossRefsGroupedForPassage(ref, limit);
      return NextResponse.json({ verseRef: `${ref.code} ${ref.chapter}:${ref.startVerse}-${ref.endVerse}`, total: g.total, byVerse: g.byVerse }, { headers: CACHE_HEADERS });
    }
    const result = ref.startVerse === ref.endVerse
      ? getCrossRefsForVerse({ code: ref.code, chapter: ref.chapter, verse: ref.startVerse, limit })
      : getCrossRefsForPassage(ref, limit);
    return NextResponse.json({ verseRef: `${ref.code} ${ref.chapter}:${ref.startVerse}${ref.startVerse === ref.endVerse ? "" : `-${ref.endVerse}`}`, total: result.total, refs: result.refs }, { headers: CACHE_HEADERS });
  }

  if (/^[0-9A-Z]{3}$/.test(code) && validRange(code, chapter, verse, endVerse)) {
    if (grouped && verse !== endVerse) {
      const g = getCrossRefsGroupedForPassage({ code, chapter, startVerse: verse, endVerse }, limit);
      return NextResponse.json({ verseRef: `${code} ${chapter}:${verse}-${endVerse}`, total: g.total, byVerse: g.byVerse }, { headers: CACHE_HEADERS });
    }
    const result = verse === endVerse
      ? getCrossRefsForVerse({ code, chapter, verse, limit })
      : getCrossRefsForPassage({ code, chapter, startVerse: verse, endVerse }, limit);
    const verseRef = verse === endVerse ? `${code} ${chapter}:${verse}` : `${code} ${chapter}:${verse}-${endVerse}`;
    return NextResponse.json({ verseRef, total: result.total, refs: result.refs }, { headers: CACHE_HEADERS });
  }

  return NextResponse.json({ error: "invalid ref" }, { status: 400 });
}
