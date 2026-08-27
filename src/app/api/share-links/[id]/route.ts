import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { revokeShareLink } from "@/lib/share-link";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (
    typeof body !== "object" ||
    body === null ||
    (body as { action?: unknown }).action !== "revoke"
  ) {
    return NextResponse.json({ error: "action=revoke 필요" }, { status: 400 });
  }

  const revoked = await revokeShareLink(user.id, id);
  if (!revoked) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
