import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { entryBodySchema, parseJsonBody } from "@/lib/api-schemas";
import {
  getEntry,
  softDeleteEntry,
  updateEntry,
  type EntryInput,
} from "@/lib/entries";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const { id } = await ctx.params;
  const entry = await getEntry(user.id, id);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function PUT(request: Request, ctx: Ctx) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const { id } = await ctx.params;
  try {
    const parsed = await parseJsonBody(request, entryBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as EntryInput;
    const entry = await updateEntry(user.id, id, body);
    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "수정 실패" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const { id } = await ctx.params;
  try {
    await softDeleteEntry(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "삭제 실패" },
      { status: 400 },
    );
  }
}
