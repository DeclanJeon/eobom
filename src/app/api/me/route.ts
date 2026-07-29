import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { mePatchSchema, parseJsonBody } from "@/lib/api-schemas";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      displayName: true,
      image: true,
      profileImageUrl: true,
      personalSlug: true,
      locale: true,
      timezone: true,
      preferredBibleTranslation: true,
      aiProcessingConsent: true,
      communityEnabled: true,
      pastTodayEnabled: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;
  const parsed = await parseJsonBody(request, mePatchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const user = await db.user.update({
    where: { id: userId },
    data: {
      displayName: body.displayName?.trim() || undefined,
      preferredBibleTranslation: body.preferredBibleTranslation?.trim() || undefined,
      aiProcessingConsent:
        typeof body.aiProcessingConsent === "boolean"
          ? body.aiProcessingConsent
          : undefined,
      communityEnabled:
        typeof body.communityEnabled === "boolean" ? body.communityEnabled : undefined,
      pastTodayEnabled:
        typeof body.pastTodayEnabled === "boolean" ? body.pastTodayEnabled : undefined,
      storyMirrorEnabled:
        typeof body.storyMirrorEnabled === "boolean"
          ? body.storyMirrorEnabled
          : undefined,
      storyMirrorExternalConsent:
        typeof body.storyMirrorExternalConsent === "boolean"
          ? body.storyMirrorExternalConsent
          : undefined,
    },
  });

  if (typeof body.aiProcessingConsent === "boolean") {
    await db.consentRecord.create({
      data: {
        userId,
        consentType: "ai_processing",
        policyVersion: "v1",
        granted: body.aiProcessingConsent,
      },
    });
  }

  return NextResponse.json({ user });
}
