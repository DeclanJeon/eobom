import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  const [entries, reviews, shared] = await Promise.all([
    db.reflectionEntry.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { entryDate: "asc" },
    }),
    db.reviewReport.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
    db.sharedReflection.findMany({
      where: { ownerUserId: user.id, deletedAt: null },
      orderBy: { publishedAt: "asc" },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      email: user.email,
      displayName: user.displayName,
      personalSlug: user.personalSlug,
    },
    entries: entries.map((e) => ({
      ...e,
      scriptureRefs: parseJsonArray(e.scriptureRefs),
      emotions: parseJsonArray(e.emotions),
      tags: parseJsonArray(e.tags),
    })),
    reviews: reviews.map((r) => ({
      ...r,
      structuredOutput: JSON.parse(r.structuredOutput),
      includedEntryIds: parseJsonArray(r.includedEntryIds),
    })),
    sharedReflections: shared.map((s) => ({
      ...s,
      scriptureRefs: parseJsonArray(s.scriptureRefs),
      topicTags: parseJsonArray(s.topicTags),
    })),
  };

  if (format === "markdown") {
    const md = toMarkdown(payload);
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="eobom-export.md"',
      },
    });
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="eobom-export.json"',
    },
  });
}

function toMarkdown(payload: {
  exportedAt: string;
  user: { email?: string | null; displayName?: string; personalSlug?: string };
  entries: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
}) {
  const lines = [
    `# 이어봄 내보내기`,
    ``,
    `- 내보낸 시각: ${payload.exportedAt}`,
    `- 사용자: ${payload.user.displayName || ""} <${payload.user.email || ""}>`,
    `- 개인 주소: /j/${payload.user.personalSlug || ""}`,
    ``,
    `## 묵상 기록`,
  ];
  for (const entry of payload.entries) {
    lines.push(
      ``,
      `### ${String(entry.title || "제목 없음")} (${String(entry.entryDate)})`,
      ``,
      String(entry.reflectionBody || ""),
    );
    if (entry.prayer) lines.push(``, `**기도**`, String(entry.prayer));
    if (entry.actionStep) lines.push(``, `**결단**`, String(entry.actionStep));
  }
  lines.push(``, `## AI 회고`, ``, `총 ${payload.reviews.length}건`);
  return lines.join("\n");
}
