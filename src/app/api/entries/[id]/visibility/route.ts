import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

/**
 * 기록의 shareVisibility를 토글 (DESIGN.md "private by default" — 작성자가
 * 명시적으로 opt-in). private ↔ public 한 번에 뒤집고, 캐시된 페이지들을
 * 무효화해서 다음 요청에 새 상태가 반영되게 한다.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const userId = auth.user.id;

  const entry = await db.reflectionEntry.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true, shareVisibility: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const next = entry.shareVisibility === "public" ? "private" : "public";
  await db.reflectionEntry.update({
    where: { id },
    data: { shareVisibility: next },
  });

  revalidatePath(`/entries/${id}`);
  revalidatePath("/entries");
  revalidatePath("/together");

  return NextResponse.json({ ok: true, shareVisibility: next });
}
