import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTopicTagsWithMimo } from "@/lib/together-tags";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    publicBody?: string;
    scriptureRefs?: string[];
  };

  const publicBody = body.publicBody?.trim() || "";
  if (publicBody.length < 12) {
    return NextResponse.json(
      { error: "태그 제안을 위해 본문을 조금 더 작성해 주세요." },
      { status: 400 },
    );
  }

  const scriptureRefs = Array.isArray(body.scriptureRefs)
    ? body.scriptureRefs.filter((s): s is string => typeof s === "string").slice(0, 5)
    : [];

  const result = await generateTopicTagsWithMimo({
    publicBody,
    scriptureRefs,
    limit: 5,
  });

  return NextResponse.json(result);
}
