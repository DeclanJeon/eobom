import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalUser } from "@/lib/session";
import { createRetreatEvent } from "@/lib/retreat-event";
import { parseJsonBody } from "@/lib/api-schemas";

const eventSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(120),
  kind: z.enum(["retreat", "seminar", "team"]).default("retreat"),
  periodStart: z.string().datetime().nullable().optional(),
  periodEnd: z.string().datetime().nullable().optional(),
  messagePrompt: z.string().max(500).nullable().optional(),
  seatIds: z.array(z.string().min(1)).max(1000).default([]),
}).refine(
  (data) =>
    !data.periodStart ||
    !data.periodEnd ||
    new Date(data.periodStart).getTime() <= new Date(data.periodEnd).getTime(),
  {
    path: ["periodEnd"],
    message: "종료일은 시작일 이후여야 합니다.",
  },
);
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * POST /api/admin/events — 수련회 이벤트 생성 + 키링 좌석 원자 바인딩.
 * 운영에서 G013 DAY 30/90 흐름을 시작하는 유일한 생성 경로.
 */
export async function POST(request: Request) {
  const user = await getOptionalUser();
  if (!user?.email || !adminEmails().has(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = await parseJsonBody(request, eventSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const event = await createRetreatEvent({
      ...parsed.data,
      periodStart: parsed.data.periodStart ? new Date(parsed.data.periodStart) : null,
      periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : null,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "이벤트 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
