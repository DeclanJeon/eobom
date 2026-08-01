/**
 * POST /api/story-mirror/visualize
 *
 * 회고·기록 원문으로 AI 브리프를 만들고, 그 브리프로 이미지를 생성한다.
 * 캐시는 contentFingerprint(입력 지문) 일치 시에만 hit.
 * GET은 인증된 이미지 파일 또는 freshness 포함 목록을 반환한다.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedBody,
} from "@/lib/rate-limit";
import {
  generateImage,
  buildVisualizationPrompt,
  VISUALIZATION_OUTPUT_DIR,
} from "@/lib/story-mirror/image-gen";
import { buildVisualizationBrief } from "@/lib/story-mirror/visualization-brief";
import {
  computeVisualizationFingerprint,
  deriveVisualizationFreshness,
  getStoredFingerprint,
  hasSynthesisInDataJson,
  isCacheHit,
  mergeFingerprintIntoData,
  monthPeriodStart,
} from "@/lib/story-mirror/visualization-fingerprint";
const KINDS = ["summary"] as const;

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  let body: { kind?: string; force?: boolean } = {};
  try {
    body = (await request.json()) as { kind?: string; force?: boolean };
  } catch {
    body = {};
  }
  const kind = body.kind ?? "summary";
  const force = Boolean(body.force);

  const limited = checkRateLimit(
    `visualize:generate:${auth.user.id}`,
    RATE_LIMITS.visualizationGenerate,
  );
  if (!limited.ok) {
    return NextResponse.json(rateLimitedBody(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  if (!KINDS.includes(kind as (typeof KINDS)[number])) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const count = await db.reflectionEntry.count({
    where: { userId: auth.user.id, deletedAt: null },
  });
  if (count < 3) {
    return NextResponse.json(
      { error: "기록이 3개 이상 필요합니다" },
      { status: 400 },
    );
  }

  const now = new Date();
  const periodStart = monthPeriodStart(now);
  const currentFingerprint = await computeVisualizationFingerprint(
    auth.user.id,
    { kind, now },
  );

  const existing = await db.userVisualization.findFirst({
    where: {
      userId: auth.user.id,
      kind,
      periodStart,
    },
    orderBy: { createdAt: "desc" },
  });

  if (
    existing &&
    isCacheHit({
      force,
      hasImage: Boolean(existing.imageUrl),
      hasSynthesis: hasSynthesisInDataJson(existing.dataJson),
      storedFingerprint: getStoredFingerprint(existing.dataJson),
      currentFingerprint,
    })
  ) {
    return NextResponse.json({
      id: existing.id,
      status: "complete",
      imageUrl: existing.imageUrl,
      dataJson: existing.dataJson,
      cached: true,
      freshness: "fresh",
      contentFingerprint: currentFingerprint,
      currentFingerprint,
    });
  }

  const { brief, entryCount, reviewId, source } = await buildVisualizationBrief(
    auth.user.id,
  );
  const dataPayload = mergeFingerprintIntoData(
    {
      entryCount,
      reviewId,
      source,
      headline: brief.headline,
      synthesis: brief.synthesis,
      imageBrief: brief.imageBrief,
      themes: brief.themes,
      emotions: brief.emotions,
    },
    currentFingerprint,
  );

  const prompt = buildVisualizationPrompt(
    kind as (typeof KINDS)[number],
    brief.imageBrief,
  );

  const filename = `${kind}-${currentFingerprint}.png`;
  const result = generateImage(prompt, filename);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "이미지 생성 실패" },
      { status: 500 },
    );
  }

  const dataJson = JSON.stringify(dataPayload);

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
    freshness: "fresh",
    contentFingerprint: currentFingerprint,
    currentFingerprint,
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

  const currentFingerprint = await computeVisualizationFingerprint(
    auth.user.id,
    { kind: "summary" },
  );

  const visualizations = await db.userVisualization.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    currentFingerprint,
    visualizations: visualizations.map((v) => {
      const storedFingerprint = getStoredFingerprint(v.dataJson);
      const freshness = deriveVisualizationFreshness({
        hasImage: Boolean(v.imageUrl),
        hasSynthesis: hasSynthesisInDataJson(v.dataJson),
        storedFingerprint,
        currentFingerprint:
          v.kind === "summary" ? currentFingerprint : storedFingerprint ?? "",
      });
      return {
        id: v.id,
        kind: v.kind,
        status: v.status,
        imageUrl: v.imageUrl,
        dataJson: v.dataJson,
        createdAt: v.createdAt.toISOString(),
        freshness,
        contentFingerprint: storedFingerprint,
        currentFingerprint:
          v.kind === "summary" ? currentFingerprint : null,
      };
    }),
  });
}
