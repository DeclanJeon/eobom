import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { listShareLinks } from "@/lib/share-link";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const links = await listShareLinks(auth.user.id);
  return NextResponse.json({ links });
}
