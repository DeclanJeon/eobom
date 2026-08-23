import { NextResponse } from "next/server";
import { getCrossRefsForPassage, getCrossRefsForVerse, getCrossRefsGroupedForPassage } from "@/lib/bible/crossrefs";
import { attachLinkCommentaries, attachLinkCommentariesBySourceRef, getVerseCommentary } from "@/lib/bible/crossref-commentary";
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
    return respondWithCommentary(ref, limit, grouped);
  }

  if (/^[0-9A-Z]{3}$/.test(code) && validRange(code, chapter, verse, endVerse)) {
    return respondWithCommentary({ code, chapter, startVerse: verse, endVerse }, limit, grouped);
  }

  return NextResponse.json({ error: "invalid ref" }, { status: 400 });
}

function respondWithCommentary(
  ref: { code: string; chapter: number; startVerse: number; endVerse: number },
  limit: number,
  grouped: boolean,
) {
  const verseRef = `${ref.code} ${ref.chapter}:${ref.startVerse}${ref.startVerse === ref.endVerse ? "" : `-${ref.endVerse}`}`;

  if (grouped && ref.startVerse !== ref.endVerse) {
    const g = getCrossRefsGroupedForPassage(ref, limit);
    for (const entry of g.byVerse) {
      attachLinkCommentaries(ref.code, ref.chapter, entry.verse, entry.refs);
    }
    return NextResponse.json(
      {
        verseRef,
        total: g.total,
        byVerse: g.byVerse.map((entry) => ({
          ...entry,
          commentary: getVerseCommentary(ref.code, ref.chapter, entry.verse) ?? undefined,
        })),
      },
      { headers: CACHE_HEADERS },
    );
  }

  const result = ref.startVerse === ref.endVerse
    ? getCrossRefsForVerse({ code: ref.code, chapter: ref.chapter, verse: ref.startVerse, limit })
    : getCrossRefsForPassage(ref, limit);
  attachLinkCommentariesBySourceRef(result.refs);

  return NextResponse.json(
    {
      verseRef,
      total: result.total,
      refs: result.refs,
      ...(ref.startVerse === ref.endVerse
        ? { commentary: getVerseCommentary(ref.code, ref.chapter, ref.startVerse) ?? undefined }
        : {}),
    },
    { headers: CACHE_HEADERS },
  );
}
