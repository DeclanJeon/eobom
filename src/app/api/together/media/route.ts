import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedBody,
} from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/session";
import {
  communityMediaDir,
  communityMediaUrl,
  extensionForMime,
  TOGETHER_MEDIA_MAX_BYTES,
} from "@/lib/together-media";
import {
  consentCommunityDeniedBody,
  getUserPreferenceFlags,
} from "@/lib/user-preferences";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const flags = await getUserPreferenceFlags(user.id);
  if (!flags.communityEnabled) {
    return NextResponse.json(consentCommunityDeniedBody(), { status: 403 });
  }

  const limited = checkRateLimit(`uploads:${user.id}`, RATE_LIMITS.uploads);
  if (!limited.ok) {
    return NextResponse.json(rateLimitedBody(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
  }

  const extension = extensionForMime(image.type);
  if (!extension) {
    return NextResponse.json(
      { error: "JPG, PNG, WebP, GIF 이미지만 사용할 수 있습니다." },
      { status: 415 },
    );
  }
  if (image.size <= 0 || image.size > TOGETHER_MEDIA_MAX_BYTES) {
    return NextResponse.json(
      { error: "이미지는 5MB 이하여야 합니다." },
      { status: 413 },
    );
  }

  const filename = `${randomUUID()}.${extension}`;
  const directory = communityMediaDir();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await image.arrayBuffer()), {
    flag: "wx",
  });

  return NextResponse.json({ url: communityMediaUrl(filename) }, { status: 201 });
}
