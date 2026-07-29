/**
 * GET /api/story-mirror/cards/[id]
 *
 * 단일 StoryCard 상세 조회.
 */

import { NextResponse } from "next/server";
import { getCardDetail } from "@/lib/story-mirror/db";
import { parseJsonArray } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const card = await getCardDetail(id);

  if (!card || card.reviewStatus !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: card.id,
    kind: card.kind,
    name: card.name,
    aliases: parseJsonArray(card.aliases),
    locale: card.locale,
    summary: card.summary,
    arc: card.arc,
    themes: parseJsonArray(card.themes),
    emotions: parseJsonArray(card.emotions),
    situations: parseJsonArray(card.situations),
    counterPatterns: parseJsonArray(card.counterPatterns),
    contentWarnings: parseJsonArray(card.contentWarnings),
    work: {
      id: card.work.id,
      title: card.work.title,
      titleOriginal: card.work.titleOriginal,
      author: card.work.author,
      translator: card.work.translator,
      culture: card.work.culture,
      era: card.work.era,
      sourceUrl: card.work.sourceUrl,
      landingPageUrl: card.work.landingPageUrl,
      rightsBasis: card.work.rightsBasis,
    },
    passages: card.passages.map((p) => ({
      id: p.id,
      locator: p.locator,
      text: p.text,
      sourceUrl: p.sourceUrl,
      citationAllowed: p.citationAllowed,
    })),
  });
}
