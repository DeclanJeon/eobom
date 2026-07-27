import { NextResponse } from "next/server";
import { parseUserInput } from "@/lib/bible";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { input?: string };
    const input = body.input?.trim() || "";
    if (!input) {
      return NextResponse.json({ error: "input required" }, { status: 400 });
    }
    const result = parseUserInput(input);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
}
