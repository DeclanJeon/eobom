import { NextResponse } from "next/server";
import {
  getPassageByInput,
  getPassageBySlug,
  getPassageFromRef,
  isValidBookCode,
  type PassageResult,
} from "@/lib/bible";
import { enforcePublicReferenceRateLimit } from "@/lib/bible-reference-rate-limit";

export async function GET(request: Request) {
  const rateLimited = await enforcePublicReferenceRateLimit(request);
  if (rateLimited) return rateLimited;
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "";
  const refText = searchParams.get("ref") || "";
  const code = (searchParams.get("code") || "").toUpperCase();
  const chapter = Number(searchParams.get("chapter"));
  const startVerse = Number(
    searchParams.get("startVerse") || searchParams.get("verse"),
  );
  const endVerse = Number(searchParams.get("endVerse") || startVerse);

  let passage: PassageResult | null = null;
  if (slug) {
    passage = getPassageBySlug(slug);
  } else if (refText) {
    passage = getPassageByInput(refText);
  } else if (
    /^[0-9A-Z]{3}$/.test(code) &&
    isValidBookCode(code) &&
    Number.isInteger(chapter) &&
    Number.isInteger(startVerse)
  ) {
    passage = getPassageFromRef({
      code,
      chapter,
      startVerse,
      endVerse: Number.isInteger(endVerse) ? endVerse : startVerse,
    });
  } else {
    return NextResponse.json({ error: "missing ref" }, { status: 400 });
  }

  if (!passage) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(passage, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
