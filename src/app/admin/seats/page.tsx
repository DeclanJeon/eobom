import Link from "next/link";
import { notFound } from "next/navigation";
import { getOptionalUser } from "@/lib/session";
import { listSeats } from "@/lib/seats";
import { appUrl } from "@/lib/utils";
import { EmptyState, SoftBadge, SurfaceCard } from "@/components/ui-blocks";

function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const metadata = { title: "좌석 관리" };

export default async function AdminSeatsPage() {
  const user = await getOptionalUser();
  if (!user?.email) notFound();
  const allowed = adminEmails();
  if (allowed.size === 0) {
    // no admins configured
    notFound();
  }
  if (!allowed.has(user.email.toLowerCase())) notFound();

  const seats = await listSeats();

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/today" className="inline-flex min-h-11 items-center text-label-sm text-text-muted">
            ← 앱
          </Link>
          <h1 className="mt-2 text-display-lg text-primary">키링 좌석</h1>
          <p className="mt-1 text-label-md text-text-muted">
            {seats.length}석 · 관리자 {user.email}
          </p>
        </div>
      </div>

      {seats.length === 0 ? (
        <EmptyState
          title="등록된 좌석이 없습니다"
          description="시드 CSV를 반영하면 키링 좌석이 이곳에 표시됩니다."
        />
      ) : (
        <div className="space-y-3">
          {seats.map((s) => (
            <SurfaceCard key={s.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-headline-sm text-primary">
                    {s.seatCode} · /j/{s.slug}
                  </p>
                  <p className="mt-1 break-all font-mono text-label-sm text-text-muted">
                    {appUrl(`/j/${s.slug}`)}
                  </p>
                </div>
                <SoftBadge>{s.status}</SoftBadge>
              </div>
              {s.status === "claimed" ? (
                <p className="mt-3 text-label-md text-text-muted">
                  {s.claimedEmail || s.claimedUser?.email || "—"}
                  {s.claimedAt
                    ? ` · ${new Date(s.claimedAt).toLocaleString("ko-KR")}`
                    : ""}
                </p>
              ) : (
                <p className="mt-3 text-label-md text-text-muted">미연결</p>
              )}
            </SurfaceCard>
          ))}
        </div>
      )}
    </div>
  );
}
