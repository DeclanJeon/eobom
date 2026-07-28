import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedBody,
} from "@/lib/rate-limit";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function uploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), ".data", "uploads");
}

export async function POST(request: Request) {
  const user = await requireUser();

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

  const extension = MIME_EXTENSIONS[image.type];
  if (!extension) {
    return NextResponse.json(
      { error: "JPG, PNG, WebP, GIF 이미지만 사용할 수 있습니다." },
      { status: 415 },
    );
  }
  if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "이미지는 5MB 이하여야 합니다." },
      { status: 413 },
    );
  }

  const filename = `${randomUUID()}.${extension}`;
  const directory = path.join(uploadRoot(), user.id);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await image.arrayBuffer()), {
    flag: "wx",
  });

  return NextResponse.json({ url: `/api/uploads/${filename}` });
}
