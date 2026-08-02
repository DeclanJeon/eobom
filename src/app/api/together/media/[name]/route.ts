import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import {
  communityMediaDir,
  contentTypeForName,
  TOGETHER_MEDIA_NAME_RE,
} from "@/lib/together-media";

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const { name } = await context.params;
  if (!TOGETHER_MEDIA_NAME_RE.test(name)) {
    return NextResponse.json({ error: "invalid image" }, { status: 400 });
  }

  try {
    const data = await readFile(path.join(communityMediaDir(), name));
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentTypeForName(name),
        // Authenticated community feed media; keep private to signed-in users.
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "image not found" }, { status: 404 });
  }
}
