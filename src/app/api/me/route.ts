import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    displayName?: string;
    preferredBibleTranslation?: string;
    aiProcessingConsent?: boolean;
    communityEnabled?: boolean;
    pastTodayEnabled?: boolean;
  };

  const user = await db.user.update({
    where: { id: session.user.id },
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
    },
  });

  if (typeof body.aiProcessingConsent === "boolean") {
    await db.consentRecord.create({
      data: {
        userId: session.user.id,
        consentType: "ai_processing",
        policyVersion: "v1",
        granted: body.aiProcessingConsent,
      },
    });
  }

  return NextResponse.json({ user });
}
