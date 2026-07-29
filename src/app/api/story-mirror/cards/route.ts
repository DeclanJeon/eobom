/**
 * GET /api/story-mirror/cards
 *
 * StoryCard catalog 조회. published 상태의 카드만 반환한다.
 */

import { NextResponse } from "next/server";
import { listPublishedCards } from "@/lib/story-mirror/db";
import { parseJsonArray } from "@/lib/utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? undefined;
  const workId = url.searchParams.get("workId") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);

  const cards = await listPublishedCards({ locale, workId, limit });

  return NextResponse.json({
    cards: cards.map((c) => ({
      id: c.id,
      kind: c.kind,
      name: c.name,
      workTitle: c.work.title,
      workAuthor: c.work.author,
      culture: c.work.culture,
      era: c.work.era,
      summary: c.summary,
      arc: c.arc,
      themes: parseJsonArray(c.themes),
      emotions: parseJsonArray(c.emotions),
      contentWarnings: parseJsonArray(c.contentWarnings),
    })),
    total: cards.length,
  });
}
