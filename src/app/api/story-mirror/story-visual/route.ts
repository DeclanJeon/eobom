import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateStoryVisualBrief,
  buildStoryVisualPrompt,
  generateImageAsync,
} from "@/lib/story-mirror/image-gen";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedBody,
} from "@/lib/rate-limit";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 동의 확인
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      storyMirrorEnabled: true,
      storyMirrorExternalConsent: true,
    },
  });

  if (!user?.storyMirrorEnabled || !user?.storyMirrorExternalConsent) {
    return NextResponse.json(
      { error: "Story mirror consent required" },
      { status: 403 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const visualStoryId =
      typeof payload.storyId === "string" ? payload.storyId.trim() : "";
    const story = typeof payload.story === "string" ? payload.story.trim() : "";
    const source =
      typeof payload.source === "string" && payload.source.trim()
        ? payload.source.trim()
        : "이야기 카드";
    const connection =
      typeof payload.connection === "string" ? payload.connection.trim() : "";
    const differentPerspective =
      typeof payload.differentPerspective === "string"
        ? payload.differentPerspective.trim()
        : null;
    const idMatch = visualStoryId.match(/^(card|chunk):([A-Za-z0-9_-]+)$/);

    if (
      !idMatch ||
      story.length > 2_000 ||
      source.length > 500 ||
      connection.length > 4_000 ||
      (differentPerspective?.length ?? 0) > 1_000
    ) {
      return NextResponse.json({ error: "Invalid visual request" }, { status: 400 });
    }

    if (!story || !connection) {
      return NextResponse.json(
        { error: "Missing required fields: storyId, story, connection" },
        { status: 400 }
      );
    }

    const storyKind = idMatch[1] as "card" | "chunk";
    const corpusStoryId = idMatch[2];
    const storyId = `${storyKind}:${corpusStoryId}`;
    let canonicalStory = "";
    if (storyKind === "card") {
      canonicalStory =
        (await db.storyCard.findUnique({
          where: { id: corpusStoryId },
          select: { name: true },
        }))?.name ?? "";
    } else {
      const chunk = await db.storyChunk.findUnique({
        where: { id: corpusStoryId },
        select: { title: true, work: { select: { title: true } } },
      });
      canonicalStory = chunk?.title || chunk?.work.title || "";
    }
    if (!canonicalStory) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const contextFingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          version: "story-visual-v1",
          storyId,
          story: canonicalStory,
          source,
          connection,
          differentPerspective,
        }),
      )
      .digest("hex");


    // 기존 시각화 확인
    const existing = await db.storyVisual.findUnique({
      where: {
        userId_storyId: {
          userId: session.user.id,
          storyId,
        },
      },
    });

    if (
      existing &&
      existing.status === "complete" &&
      existing.imageUrl &&
      existing.contextFingerprint === contextFingerprint
    ) {
      return NextResponse.json({
        id: existing.id,
        imageUrl: existing.imageUrl,
        imageAlt: existing.altText,
        cached: true,
      });
    }
    if (
      existing?.status === "pending" &&
      existing.contextFingerprint === contextFingerprint
    ) {
      return NextResponse.json(
        { id: existing.id, status: "pending" },
        { status: 202 },
      );
    }

    const limited = checkRateLimit(
      `storyVisualGenerate:${session.user.id}`,
      RATE_LIMITS.visualizationGenerate,
    );
    if (!limited.ok) {
      return NextResponse.json(rateLimitedBody(limited.retryAfterSec), {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      });
    }

    // pending row 생성 — 클라이언트는 202를 받고 폴링한다.
    const pending = await db.storyVisual.upsert({
      where: {
        userId_storyId: {
          userId: session.user.id,
          storyId,
        },
      },
      create: {
        userId: session.user.id,
        storyId,
        storyTitle: canonicalStory,
        source,
        connection,
        contextFingerprint,
        subject: "",
        setting: "",
        visibleAction: "",
        innerTension: "",
        visualMetaphor: "",
        composition: "",
        palette: "[]",
        mood: "",
        avoid: "[]",
        altText: "",
        status: "pending",
      },
      update: {
        storyTitle: canonicalStory,
        source,
        connection,
        contextFingerprint,
        status: "pending",
        imageUrl: null,
        errorMsg: null,
      },
    });

    // after() — 요청 응답 이후 비동기로 이미지 생성 수행
    after(async () => {
      try {
        const visualBrief = await generateStoryVisualBrief({
          story: canonicalStory,
          source,
          connection,
          differentPerspective,
        });

        if (!visualBrief) {
          await db.storyVisual.updateMany({
            where: { id: pending.id, contextFingerprint },
            data: { status: "failed", errorMsg: "Failed to generate visual brief" },
          });
          return;
        }

        const imagePrompt = buildStoryVisualPrompt(visualBrief);
        const contentHash = createHash("md5")
          .update(`${storyId}-${JSON.stringify(visualBrief)}`)
          .digest("hex")
          .slice(0, 12);
        const filename = `story-visual-${session.user.id}-${storyKind}-${corpusStoryId}-${contentHash}.png`;
        const result = await generateImageAsync(imagePrompt, filename);

        if (!result.success || !result.localPath) {
          await db.storyVisual.updateMany({
            where: { id: pending.id, contextFingerprint },
            data: {
              status: "failed",
              errorMsg: result.error || "Image generation failed",
              subject: visualBrief.subject,
              setting: visualBrief.setting,
              visibleAction: visualBrief.visibleAction,
              innerTension: visualBrief.innerTension,
              visualMetaphor: visualBrief.visualMetaphor,
              turningPoint: visualBrief.turningPoint,
              composition: visualBrief.composition,
              palette: JSON.stringify(visualBrief.palette),
              mood: visualBrief.mood,
              avoid: JSON.stringify(visualBrief.avoid),
              altText: visualBrief.altText,
              imagePrompt,
            },
          });
          return;
        }

        await db.storyVisual.updateMany({
          where: { id: pending.id, contextFingerprint },
          data: {
            status: "complete",
            imageUrl: result.localPath,
            completedAt: new Date(),
            subject: visualBrief.subject,
            setting: visualBrief.setting,
            visibleAction: visualBrief.visibleAction,
            innerTension: visualBrief.innerTension,
            visualMetaphor: visualBrief.visualMetaphor,
            turningPoint: visualBrief.turningPoint,
            composition: visualBrief.composition,
            palette: JSON.stringify(visualBrief.palette),
            mood: visualBrief.mood,
            avoid: JSON.stringify(visualBrief.avoid),
            altText: visualBrief.altText,
            imagePrompt,
          },
        });
      } catch (err) {
        console.error("[story-visual] background error:", err);
        await db.storyVisual.updateMany({
          where: { id: pending.id, contextFingerprint },
          data: {
            status: "failed",
            errorMsg: err instanceof Error ? err.message : String(err),
          },
        });
      }
    });

    return NextResponse.json(
      { id: pending.id, status: "pending" },
      { status: 202 },
    );
  } catch (error) {
    console.error("[story-visual] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: 기존 시각화 조회
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      storyMirrorEnabled: true,
      storyMirrorExternalConsent: true,
    },
  });
  if (!user?.storyMirrorEnabled || !user?.storyMirrorExternalConsent) {
    return NextResponse.json(
      { error: "Story mirror consent required" },
      { status: 403 },
    );
  }

  const storyId = request.nextUrl.searchParams.get("storyId") ?? "";
  if (!/^(card|chunk):[A-Za-z0-9_-]+$/.test(storyId)) {
    return NextResponse.json(
      { error: "Invalid storyId parameter" },
      { status: 400 },
    );
  }

  const visual = await db.storyVisual.findUnique({
    where: {
      userId_storyId: {
        userId: session.user.id,
        storyId,
      },
    },
  });

  if (!visual) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (visual.status === "pending") {
    const staleAt = Date.now() - 5 * 60 * 1000;
    if (visual.updatedAt.getTime() < staleAt) {
      const expired = await db.storyVisual.updateMany({
        where: { id: visual.id, status: "pending" },
        data: {
          status: "failed",
          errorMsg: "Image generation expired; please retry",
        },
      });
      if (expired.count > 0) {
        return NextResponse.json(
          { error: "Image generation expired" },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      { id: visual.id, status: "pending" },
      { status: 202 },
    );
  }

  if (visual.status === "failed") {
    return NextResponse.json(
      { error: visual.errorMsg || "Generation failed" },
      { status: 500 },
    );
  }

  if (!visual.imageUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: visual.id,
    imageUrl: visual.imageUrl,
    imageAlt: visual.altText,
    cached: true,
  });
}
