import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-schemas";
import { logEvent } from "@/lib/events";
import { recordContinuityMoment } from "@/lib/continuity/moment-store";
import { verifyKeyringEventToken } from "@/lib/keyring-event-token";
import { getOptionalUser } from "@/lib/session";
import { checkRateLimit, RATE_LIMITS, rateLimitedBody } from "@/lib/rate-limit";

const signalSchema = z.object({
  seatToken: z.string().max(2048).optional(),
  surface: z.enum(["keyring", "today", "notification"]),
  context: z.enum([
    "WORK_DIRECTION",
    "RELATIONSHIP",
    "EMOTION",
    "FAITH",
    "FAMILY",
  ]),
});

/** Records only the selected context enum; reflection text never enters analytics. */
export async function POST(request: Request) {
  const ip = request.headers.get("x-real-ip")?.trim() || request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  const limited = await checkRateLimit(`moments:signal:${ip}`, RATE_LIMITS.moments);
  if (!limited.ok) {
    return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  }
  const user = await getOptionalUser();
  const parsed = await parseJsonBody(request, signalSchema);
  if (!parsed.ok) return parsed.response;

  const seat =
    parsed.data.surface === "keyring"
      ? verifyKeyringEventToken(parsed.data.seatToken)
      : null;
  if (parsed.data.surface === "keyring" && !seat) {
    return NextResponse.json({ error: "invalid seat context" }, { status: 400 });
  }

  await logEvent({
    userId: user?.email ? user.id : null,
    seatId: seat?.seatId ?? null,
    eventType: "context_selected",
    entrySource:
      parsed.data.surface === "keyring"
        ? "qr"
        : parsed.data.surface === "today"
          ? "link"
          : "unknown",
    meta: { surface: parsed.data.surface, context: parsed.data.context },
    fireAndForget: true,
  });

  if (user?.email) {
    await recordContinuityMoment({
      userId: user.id,
      source: parsed.data.surface === "keyring" ? "keyring" : "today",
      context: parsed.data.context,
    });
  }
  return NextResponse.json({ ok: true });
}
