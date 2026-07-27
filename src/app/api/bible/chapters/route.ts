import { NextResponse } from "next/server";
import { getBook, getVerseCounts, isValidBookCode } from "@/lib/bible";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || "").toUpperCase();
  if (!/^[0-9A-Z]{3}$/.test(code) || !isValidBookCode(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }
  const book = getBook(code)!;
  return NextResponse.json(
    {
      code: book.code,
      name: book.name,
      chapters: book.chapters,
      verseCounts: getVerseCounts(code),
    },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
