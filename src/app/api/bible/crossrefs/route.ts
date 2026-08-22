import { NextResponse } from "next/server";
import { getCrossRefsForPassage, getCrossRefsForVerse, getCrossRefsGroupedForPassage } from "@/lib/bible/crossrefs";
import { isValidBookCode } from "@/lib/bible/book-meta";
import { parseSlug } from "@/lib/bible/format";
import { enforcePublicReferenceRateLimit } from "@/lib/bible-reference-rate-limit";

export async function GET(request: Request) {
  const rateLimited = await enforcePublicReferenceRateLimit(request);
  if (rateLimited) return rateLimited;
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "";
  const code = (searchParams.get("code") || "").toUpperCase();
  const chapter = Number(searchParams.get("chapter"));
  const verse = Number(searchParams.get("verse") || searchParams.get("startVerse"));
  const endVerse = Number(searchParams.get("endVerse") || verse);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
  const grouped = searchParams.get("grouped") === "1";

  if (slug) {
    const ref = parseSlug(slug);
    if (!ref || !isValidBookCode(ref.code)) return NextResponse.json({ error: "invalid slug" }, { status: 400 });
    if (grouped && ref.startVerse !== ref.endVerse) {
      const g = getCrossRefsGroupedForPassage(ref, limit);
      return NextResponse.json({ verseRef: `${ref.code} ${ref.chapter}:${ref.startVerse}-${ref.endVerse}`, total: g.total, byVerse: g.byVerse }, { headers: { "Cache-Control": "public, max-age=86400" } });
    }
    const result = ref.startVerse === ref.endVerse
      ? getCrossRefsForVerse({ code: ref.code, chapter: ref.chapter, verse: ref.startVerse, limit })
      : getCrossRefsForPassage(ref, limit);
    return NextResponse.json({ verseRef: `${ref.code} ${ref.chapter}:${ref.startVerse}${ref.startVerse === ref.endVerse ? "" : `-${ref.endVerse}`}`, total: result.total, refs: result.refs }, { headers: { "Cache-Control": "public, max-age=86400" } });
  }

  if (/^[0-9A-Z]{3}$/.test(code) && Number.isInteger(chapter) && Number.isInteger(verse)) {
    if (!isValidBookCode(code)) return NextResponse.json({ error: "invalid book" }, { status: 400 });
    if (grouped && verse !== endVerse) {
      const g = getCrossRefsGroupedForPassage({ code, chapter, startVerse: verse, endVerse }, limit);
      const verseRef = `${code} ${chapter}:${verse}-${endVerse}`;
      return NextResponse.json({ verseRef, total: g.total, byVerse: g.byVerse }, { headers: { "Cache-Control": "public, max-age=86400" } });
    }
    const result = verse === endVerse
      ? getCrossRefsForVerse({ code, chapter, verse, limit })
      : getCrossRefsForPassage({ code, chapter, startVerse: verse, endVerse }, limit);
    const verseRef = verse === endVerse ? `${code} ${chapter}:${verse}` : `${code} ${chapter}:${verse}-${endVerse}`;
    return NextResponse.json({ verseRef, total: result.total, refs: result.refs }, { headers: { "Cache-Control": "public, max-age=86400" } });
  }

  return NextResponse.json({ error: "missing ref" }, { status: 400 });
}
