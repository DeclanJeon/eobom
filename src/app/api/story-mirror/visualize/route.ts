/**
 * POST /api/story-mirror/visualize
 *
 * codex-imagen으로 시각화 이미지를 생성한다.
 * GET은 사용자 시각화 목록을 반환한다.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getLatestRagRun } from "@/lib/story-mirror/db";
import {
  generateImage,
  buildVisualizationPrompt,
  VISUALIZATION_OUTPUT_DIR,
} from "@/lib/story-mirror/image-gen";
import { createHash } from "crypto";

const KINDS = ["summary"] as const;

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { kind }: { kind: string } = await request.json();

  if (!KINDS.includes(kind as typeof KINDS[number])) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  // 기록 수 확인
  const count = await db.reflectionEntry.count({
    where: { userId: auth.user.id, deletedAt: null },
  });
  if (count < 3) {
    return NextResponse.json({ error: "기록이 3개 이상 필요합니다" }, { status: 400 });
  }

  // 기존 시각화 확인
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

  if (existing?.imageUrl) {
    return NextResponse.json({
      id: existing.id,
      status: "complete",
      imageUrl: existing.imageUrl,
      cached: true,
    });
  }
  // 회고 기반 연결(이야기 거울 재료) 가져오기
  const run = await getLatestRagRun(auth.user.id);
  const connections = run
    ? run.matches.slice(0, 6).map((m) => ({
        workTitle: m.chunk.work.title,
        title: m.chunk.title,
        connection: m.connection ?? "",
        differentPerspective: m.differentPerspective,
      }))
    : [];
  const rationale = { entryCount: count, summary: run?.summary ?? null, connections };

  // 프롬프트 생성 (실제 회고 요약을 반영)
  const prompt = buildVisualizationPrompt(
    kind as typeof KINDS[number],
    run?.summary ?? `${count} entries`,
  );

  // 파일명
  const hash = createHash("md5")
    .update(`${auth.user.id}:${kind}:${periodStart.toISOString()}`)
    .digest("hex")
    .slice(0, 8);
  const filename = `${kind}-${hash}.png`;

  // 이미지 생성
  const result = generateImage(prompt, filename);

  if (!result.success) {
    return NextResponse.json({ error: "이미지 생성 패" }, { status: 500 });
  }

  // DB 저장
  const vis = await db.userVisualization.create({
    data: {
      userId: auth.user.id,
      kind,
      periodStart,
      periodEnd: now,
      imageUrl: result.localPath,
      imagePrompt: prompt,
      dataJson: JSON.stringify(rationale),
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
