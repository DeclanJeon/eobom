import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness by default. Pass ?db=1 to include a SQLite ping (503 if down).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkDb = searchParams.get("db") === "1";
  const time = new Date().toISOString();
  const base = {
    ok: true as const,
    service: "eobom",
    time,
  };

  const headers = {
    "Cache-Control": "no-store",
  };

  if (!checkDb) {
    return NextResponse.json(base, { headers });
  }

  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ...base, db: "up" as const }, { headers });
  } catch {
    return NextResponse.json(
      {
        ok: false as const,
        service: "eobom",
        time,
        db: "down" as const,
      },
      { status: 503, headers },
    );
  }
}
