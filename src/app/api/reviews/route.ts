import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import { generateReviewWithMimo } from "@/lib/mimo";

const MIN_COUNTS: Record<string, number> = {
  "15d": 5,
  monthly: 8,
  quarterly: 15,
  yearly: 30,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reports = await db.reviewReport.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    reports: reports.map((r) => ({
      ...r,
      includedEntryIds: parseJsonArray(r.includedEntryIds),
      excludedEntryIds: parseJsonArray(r.excludedEntryIds),
      structuredOutput: JSON.parse(r.structuredOutput),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    reportType?: string;
    periodStart?: string;
    periodEnd?: string;
    excludedEntryIds?: string[];
  };

  const reportType = body.reportType || "monthly";
  const periodEnd = body.periodEnd ? new Date(body.periodEnd) : new Date();
  const periodStart = body.periodStart
    ? new Date(body.periodStart)
    : defaultStart(reportType, periodEnd);
  const excluded = new Set(body.excludedEntryIds ?? []);

  const entries = await db.reflectionEntry.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
      entryDate: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { entryDate: "asc" },
  });

  const included = entries.filter((e) => !excluded.has(e.id));
  const min = MIN_COUNTS[reportType] ?? 5;
  if (included.length < min) {
    return NextResponse.json(
      {
        error: `회고를 만들기에는 기록이 부족합니다. (필요 ${min}개, 현재 ${included.length}개)`,
      },
      { status: 400 },
    );
  }

  const mapped = included.map((e) => ({
    id: e.id,
    entryDate: e.entryDate.toISOString(),
    title: e.title,
    scriptureRefs: parseJsonArray(e.scriptureRefs),
    scriptureExcerpt: e.scriptureExcerpt,
    reflectionBody: e.reflectionBody,
    gratitude: e.gratitude,
    question: e.question,
    prayer: e.prayer,
    actionStep: e.actionStep,
    emotions: parseJsonArray(e.emotions),
    tags: parseJsonArray(e.tags),
  }));

  const { review, modelProvider, modelName } = await generateReviewWithMimo(
    mapped,
    reportType,
  );

  const report = await db.reviewReport.create({
    data: {
      userId: session.user.id,
      periodStart,
      periodEnd,
      reportType,
      includedEntryIds: JSON.stringify(included.map((e) => e.id)),
      excludedEntryIds: JSON.stringify([...excluded]),
      structuredOutput: JSON.stringify(review),
      summary: review.oneSentence,
      modelProvider,
      modelName,
      promptVersion: "eobom-review-v1",
      evidences: {
        create: collectEvidence(review),
      },
    },
  });

  return NextResponse.json({
    report: {
      ...report,
      structuredOutput: review,
    },
  }, { status: 201 });
}

function defaultStart(reportType: string, end: Date) {
  const start = new Date(end);
  if (reportType === "15d") start.setDate(start.getDate() - 15);
  else if (reportType === "quarterly") start.setMonth(start.getMonth() - 3);
  else if (reportType === "yearly") start.setFullYear(start.getFullYear() - 1);
  else start.setMonth(start.getMonth() - 1);
  return start;
}

function collectEvidence(review: {
  themes?: Array<{ key: string; evidence?: Array<{ entryId: string; excerpt: string }>; confidence?: string }>;
  emotions?: Array<{ key: string; evidence?: Array<{ entryId: string; excerpt: string }>; confidence?: string }>;
  questions?: Array<{ key: string; evidence?: Array<{ entryId: string; excerpt: string }>; confidence?: string }>;
  scriptureConnections?: Array<{ key: string; evidence?: Array<{ entryId: string; excerpt: string }>; confidence?: string }>;
  actionFlow?: Array<{ key: string; evidence?: Array<{ entryId: string; excerpt: string }>; confidence?: string }>;
}) {
  const rows: Array<{
    observationKey: string;
    entryId: string;
    excerpt: string;
    confidence: string;
  }> = [];
  const groups = [
    review.themes,
    review.emotions,
    review.questions,
    review.scriptureConnections,
    review.actionFlow,
  ];
  for (const group of groups) {
    for (const obs of group ?? []) {
      for (const ev of obs.evidence ?? []) {
        if (!ev.entryId) continue;
        rows.push({
          observationKey: obs.key,
          entryId: ev.entryId,
          excerpt: (ev.excerpt || "").slice(0, 500),
          confidence: obs.confidence || "medium",
        });
      }
    }
  }
  return rows.slice(0, 40);
}
