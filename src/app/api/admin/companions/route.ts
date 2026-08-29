import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

function isAdmin(email: string | null | undefined) {
  return Boolean(email && (process.env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).includes(email.toLowerCase()));
}

export async function GET() {
  const user = await getOptionalUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [reports, recentMessages] = await Promise.all([
    db.companionSafetyEvent.findMany({ where: { type: "report", moderationStatus: "open" }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.companionMessage.findMany({ where: { moderationStatus: "flagged" }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return NextResponse.json({ reports, recentMessages });
}

export async function PATCH(request: Request) {
  const user = await getOptionalUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({
    safetyEventId: z.string().min(1).optional(),
    messageId: z.string().min(1).optional(),
    status: z.enum(["reviewed", "actioned"]),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.safetyEventId && !parsed.data.messageId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (parsed.data.safetyEventId) {
    await db.companionSafetyEvent.update({
      where: { id: parsed.data.safetyEventId },
      data: { moderationStatus: parsed.data.status, moderatedAt: new Date(), moderatedBy: user!.id },
    });
  } else {
    await db.companionMessage.update({
      where: { id: parsed.data.messageId },
      data: { moderationStatus: "reviewed" },
    });
  }
  return NextResponse.json({ ok: true });
}
