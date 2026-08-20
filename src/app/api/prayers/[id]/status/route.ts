import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";

const statusSchema = z.object({
  status: z.enum(["continuing", "answered", "paused"]),
});

type Ctx = { params: Promise<{ id: string }> };

async function parseStatusBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  // JSON
  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }
  // form-urlencoded or multipart
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    try {
      const form = await request.formData();
      const status = form.get("status");
      return { status };
    } catch {
      return null;
    }
  }
  // fallback: try json, then form
  try {
    const cloned = request.clone();
    const json = await cloned.json();
    if (json && typeof json === "object") return json;
  } catch {
    // ignore
  }
  try {
    const form = await request.formData();
    const status = form.get("status");
    if (status !== null) return { status };
  } catch {
    // ignore
  }
  return null;
}

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const { id } = await ctx.params;

  const raw = await parseStatusBody(request);
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid status" },
      { status: 400 },
    );
  }
  const { status } = parsed.data;

  const existing = await db.prayerTopic.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.prayerTopic.update({
    where: { id },
    data: {
      status,
      closedAt: status !== "continuing" ? new Date() : null,
    },
  });

  return NextResponse.json({ prayerTopic: updated });
}
