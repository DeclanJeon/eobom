import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-schemas";
import { logEvent } from "@/lib/events";
import { recordContinuityMoment } from "@/lib/continuity/moment-store";
import { verifyKeyringEventToken } from "@/lib/keyring-event-token";
import { getOptionalUser } from "@/lib/session";

const responseSchema = z.object({
  surface: z.enum(["keyring", "today"]),
  reaction: z.enum(["re_read", "still_hold", "changed_view"]),
  seatToken: z.string().max(2048).optional(),
});

/** Records public receive reactions without creating a person-level guest identity. */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, responseSchema);
  if (!parsed.ok) return parsed.response;

  const user = await getOptionalUser();
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
    eventType: "card_reaction",
    entrySource: parsed.data.surface === "keyring" ? "qr" : "link",
    meta: { surface: parsed.data.surface, reaction: parsed.data.reaction },
    fireAndForget: true,
  });
  if (user?.email) {
    await recordContinuityMoment({
      userId: user.id,
      source: parsed.data.surface,
      reaction: parsed.data.reaction,
    });
  }

  return NextResponse.json({ ok: true });
}
