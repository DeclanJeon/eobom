import { NextResponse } from "next/server";
import { listBooks, translationInfo } from "@/lib/bible";

export async function GET() {
  return NextResponse.json(
    {
      translation: translationInfo(),
      books: listBooks(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
