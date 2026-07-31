/**
 * POST /api/story-mirror/visualize
 *
 * 회고·기록 원문으로 AI 브리프를 만들고, 그 브리프로 이미지를 생성한다.
 * GET은 인증된 이미지 파일 또는 사용자 시각화 목록을 반환한다.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";
import {
  generateImage,
  buildVisualizationPrompt,
  VISUALIZATION_OUTPUT_DIR,
} from "@/lib/story-mirror/image-gen";
import { buildVisualizationBrief } from "@/lib/story-mirror/visualization-brief";
import { createHash } from "crypto";

const KINDS = ["summary"] as const;

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { kind }: { kind: string } = await request.json();

  if (!KINDS.includes(kind as (typeof KINDS)[number])) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const count = await db.reflectionEntry.count({
    where: { userId: auth.user.id, deletedAt: null },
  });
  if (count < 3) {
    return NextResponse.json({ error: "기록이 3개 이상 필요합니다" }, { status: 400 });
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const existing = await db.userVisualization.findFirst({
    where: {
      userId: auth.user.id,
      kind,
      periodStart,
    },
    orderBy: { createdAt: "desc" },
  });

  // 회고 기반 브리프가 이미 저장된 이미지는 캐시 반환
  if (existing?.imageUrl) {
    let hasSynthesis = false;
    try {
      const parsed = JSON.parse(existing.dataJson) as { synthesis?: string };
      hasSynthesis = Boolean(parsed.synthesis?.trim());
    } catch {
      hasSynthesis = false;
    }
    if (hasSynthesis) {
      return NextResponse.json({
        id: existing.id,
        status: "complete",
        imageUrl: existing.imageUrl,
        dataJson: existing.dataJson,
        cached: true,
      });
    }
  }

  // 회고·기록 → AI 종합 브리프
  const { brief, entryCount, reviewId, source } = await buildVisualizationBrief(
    auth.user.id,
  );
  const dataPayload = {
    entryCount,
    reviewId,
    source,
    headline: brief.headline,
    synthesis: brief.synthesis,
    imageBrief: brief.imageBrief,
    themes: brief.themes,
    emotions: brief.emotions,
  };

  const prompt = buildVisualizationPrompt(
    kind as (typeof KINDS)[number],
    brief.imageBrief,
  );

  // 내용 기반 해시: 같은 브리프면 파일명 안정, 내용이 바뀌면 새 파일
  const hash = createHash("md5")
    .update(
      `${auth.user.id}:${kind}:${periodStart.toISOString()}:${brief.imageBrief}`,
    )
    .digest("hex")
    .slice(0, 8);
  const filename = `${kind}-${hash}.png`;

  const result = generateImage(prompt, filename);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "이미지 생성 실패" },
      { status: 500 },
    );
  }

  const dataJson = JSON.stringify(dataPayload);

  // 같은 달 기존 행이 있으면 갱신 (브리프 없던 캐시 교체)
  const vis = existing
    ? await db.userVisualization.update({
        where: { id: existing.id },
        data: {
          periodEnd: now,
          imageUrl: result.localPath,
          imagePrompt: prompt,
          dataJson,
          status: "complete",
          completedAt: new Date(),
          errorMsg: null,
        },
      })
    : await db.userVisualization.create({
        data: {
          userId: auth.user.id,
          kind,
          periodStart,
          periodEnd: now,
          imageUrl: result.localPath,
          imagePrompt: prompt,
          dataJson,
          corpusVersion: "v1.0",
          status: "complete",
          completedAt: new Date(),
        },
      });

  return NextResponse.json({
    id: vis.id,
    status: "complete",
    imageUrl: result.localPath,
    dataJson: vis.dataJson,
    cached: false,
  });
}

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const file = new URL(request.url).searchParams.get("file");
  if (file) {
    if (!/^[a-z0-9-]+\.png$/i.test(file)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }
    try {
      const image = await readFile(join(VISUALIZATION_OUTPUT_DIR, file));
      return new Response(image, {
        headers: {
          "Cache-Control": "private, max-age=31536000, immutable",
          "Content-Type": "image/png",
        },
      });
    } catch {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
  }

  const visualizations = await db.userVisualization.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    visualizations: visualizations.map((v) => ({
      id: v.id,
      kind: v.kind,
      status: v.status,
      imageUrl: v.imageUrl,
      dataJson: v.dataJson,
      createdAt: v.createdAt.toISOString(),
    })),
  });
}
