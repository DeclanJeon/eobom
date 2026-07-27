import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";

const NAME_RE = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function uploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), ".data", "uploads");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const user = await requireUser();
  const { name } = await context.params;
  if (!NAME_RE.test(name)) {
    return NextResponse.json({ error: "invalid image" }, { status: 400 });
  }

  try {
    const data = await readFile(path.join(uploadRoot(), user.id, name));
    const extension = name.split(".").pop() || "";
    return new NextResponse(data, {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "image not found" }, { status: 404 });
  }
}
