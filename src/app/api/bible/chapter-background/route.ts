import { NextResponse } from "next/server";
import { getChapterBackground } from "@/lib/bible/chapter-background";
import { isValidBookCode } from "@/lib/bible/book-meta";
import { enforcePublicReferenceRateLimit } from "@/lib/bible-reference-rate-limit";

export async function GET(request: Request) {
  const rateLimited = await enforcePublicReferenceRateLimit(request);
  if (rateLimited) return rateLimited;
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || "").toUpperCase();
  const chapter = Number(searchParams.get("chapter"));
  const locale = searchParams.get("locale") || "ko";

  if (!/^[0-9A-Z]{3}$/.test(code) || !isValidBookCode(code) || !Number.isInteger(chapter) || chapter < 1) {
    return NextResponse.json({ error: "missing ref" }, { status: 400 });
  }

  const bg = getChapterBackground({ code, chapter, locale });
  if (!bg) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(bg, { headers: { "Cache-Control": "public, max-age=86400" } });
}
