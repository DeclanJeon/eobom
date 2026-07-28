import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { actionPatchSchema, parseJsonBody } from "@/lib/api-schemas";
import { updateActionStep } from "@/lib/actions";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const { id } = await ctx.params;
  const parsed = await parseJsonBody(request, actionPatchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const item = await updateActionStep(user.id, id, {
      status: body.status,
      reflectionOnResult: body.reflectionOnResult,
    });
    return NextResponse.json({ item });
  } catch (e) {
    const message = e instanceof Error ? e.message : "업데이트에 실패했습니다.";
    const status = message.includes("찾을 수 없") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
