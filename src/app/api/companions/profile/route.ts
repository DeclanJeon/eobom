import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitedBody } from "@/lib/rate-limit";
import { companionProfilePatchSchema, parseJsonBody } from "@/lib/api-schemas";
import {
  getCompanionProfileOrCreate,
  upsertCompanionProfile,
  serializeCompanionProfile,
  revokeCompanionAccess,
} from "@/lib/companions";

/**
 * GET /api/companions/profile
 * Returns the authenticated user's own companion profile.
 * Creates a default disabled profile on first access.
 */
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`companions:profile:read:${auth.user.id}`, { limit: 60, windowMs: 60_000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429 });

  const profile = await getCompanionProfileOrCreate(auth.user.id);
  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { companionConsent: true },
  });
  return NextResponse.json({
    profile: serializeCompanionProfile(profile),
    companionConsent: Boolean(user?.companionConsent),
  });
}

/**
 * PATCH /api/companions/profile
 * Updates the authenticated user's companion profile fields.
 * Strict ownership: only the authenticated user's own profile.
 * Default behavior: disabled, private — enabled must be explicitly set.
 */
export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`companions:profile:write:${auth.user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429 });

  const parsed = await parseJsonBody(request, companionProfilePatchSchema);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  let withdrawnCandidates = 0;
  let endedConnections = 0;

  const revoked = body.companionConsent === false;
  if (revoked) {
    const cleanup = await revokeCompanionAccess(auth.user.id);
    withdrawnCandidates = cleanup.withdrawnCandidates;
    endedConnections = cleanup.endedConnections;
  } else if (typeof body.companionConsent === "boolean") {
    await db.user.update({
      where: { id: auth.user.id },
      data: { companionConsent: body.companionConsent },
    });
  }

  const profile = await upsertCompanionProfile(auth.user.id, {
    enabled: revoked ? false : body.enabled,
    acceptsRequests: revoked ? false : body.acceptsRequests,
    scopeKey: body.scopeKey,
    role: body.role,
    topicTags: body.topicTags,
    helpModes: body.helpModes,
    intro: body.intro ?? undefined,
    availability: body.availability ?? undefined,
  });

  return NextResponse.json({
    profile: serializeCompanionProfile(profile),
    cleanup: { withdrawnCandidates, endedConnections },
  });
}