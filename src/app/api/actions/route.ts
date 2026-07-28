import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { listOpenActionSteps } from "@/lib/actions";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const items = await listOpenActionSteps(user.id, 8);
  return NextResponse.json({ items });
}
