/**
 * POST /api/story-mirror/visualize
 *
 * 시각화 이미지를 생성한다.
 * codex-imagen을 SSH로 호출하여 ponslink에서 이미지 생성.
 */

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody } from "@/lib/api-schemas";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  extractTimelineData,
  extractNetworkData,
  extractEmotionData,
  extractStoryMatchData,
} from "@/lib/story-mirror/visualize-data";
import {
  generateImage,
  buildVisualizationPrompt,
} from "@/lib/story-mirror/image-gen";
import { createHash } from "crypto";

const CORPUS_VERSION = "v1.0";
const MATCHER_VERSION = "phase-a-v1";

const visualizeSchema = z.object({
  kind: z.enum(["timeline", "network", "emotion", "story-match"]),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, visualizeSchema);
  if (!parsed.ok) return parsed.response;
  const { kind, periodStart, periodEnd } = parsed.data;

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  // 기존 시각화 확인
  const existing = await db.userVisualization.findUnique({
    where: {
      userId_kind_periodStart_periodEnd: {
        userId: auth.user.id,
        kind,
        periodStart: start,
        periodEnd: end,
      },
    },
  });

  if (existing?.status === "complete" && existing.imageUrl) {
    return NextResponse.json({
      id: existing.id,
      status: "complete",
      imageUrl: existing.imageUrl,
      cached: true,
    });
  }

  if (existing?.status === "generating") {
    return NextResponse.json({
      id: existing.id,
      status: "generating",
      cached: false,
    });
  }

  // 데이터 추출
  let dataJson = "";
  switch (kind) {
    case "timeline": {
      const data = await extractTimelineData(auth.user.id, start, end);
      dataJson = JSON.stringify(data);
      break;
    }
    case "network": {
      const data = await extractNetworkData(auth.user.id, start, end);
      dataJson = JSON.stringify(data);
      break;
    }
    case "emotion": {
      const data = await extractEmotionData(auth.user.id, start, end);
      dataJson = JSON.stringify(data);
      break;
    }
    case "story-match": {
      const data = await extractStoryMatchData(auth.user.id);
      dataJson = JSON.stringify(data);
      break;
    }
  }

  if (!dataJson || dataJson === "[]" || dataJson === '{"nodes":[],"edges":[]}') {
    return NextResponse.json(
      { error: "시각화할 데이터가 없습니다." },
      { status: 400 },
    );
  }

  // 레코드 생성 (generating 상태)
  const vis = await db.userVisualization.create({
    data: {
      userId: auth.user.id,
      kind,
      periodStart: start,
      periodEnd: end,
      dataJson,
      status: "generating",
      corpusVersion: CORPUS_VERSION,
      matcherVersion: MATCHER_VERSION,
    },
  });

  // 이미지 생성
  const filename = `${auth.user.id.slice(0, 8)}-${kind}-${createHash("md5").update(dataJson).digest("hex").slice(0, 8)}.png`;
  const prompt = buildVisualizationPrompt(kind, dataJson.slice(0, 200));
  const result = generateImage(prompt, filename);

  if (result.success) {
    await db.userVisualization.update({
      where: { id: vis.id },
      data: {
        status: "complete",
        imageUrl: result.localPath,
        imagePrompt: prompt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: vis.id,
      status: "complete",
      imageUrl: result.localPath,
      cached: false,
    });
  } else {
    await db.userVisualization.update({
      where: { id: vis.id },
      data: {
        status: "failed",
        errorMsg: result.error?.slice(0, 500),
      },
    });

    return NextResponse.json(
      { error: "이미지 생성에 실패했습니다.", detail: result.error },
      { status: 500 },
    );
  }
}

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const visualizations = await db.userVisualization.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    visualizations: visualizations.map((v) => ({
      id: v.id,
      kind: v.kind,
      periodStart: v.periodStart.toISOString(),
      periodEnd: v.periodEnd.toISOString(),
      status: v.status,
      imageUrl: v.imageUrl,
      createdAt: v.createdAt.toISOString(),
      completedAt: v.completedAt?.toISOString(),
    })),
  });
}
