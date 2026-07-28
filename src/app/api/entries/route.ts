import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { entryBodySchema, parseJsonBody } from "@/lib/api-schemas";
import { createEntry, listEntries, type EntryInput } from "@/lib/entries";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || undefined;
  const entries = await listEntries(user.id, { q, limit: 100 });
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  try {
    const parsed = await parseJsonBody(request, entryBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as EntryInput;
    const entry = await createEntry(user.id, body);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "저장 실패" },
      { status: 400 },
    );
  }
}
