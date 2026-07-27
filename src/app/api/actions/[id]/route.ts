import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isActionStatus, updateActionStep } from "@/lib/actions";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    status?: string;
    reflectionOnResult?: string | null;
  };

  if (body.status !== undefined && !isActionStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const item = await updateActionStep(session.user.id, id, {
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
