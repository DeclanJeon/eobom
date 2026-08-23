import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/event-form";
import { getOptionalUser } from "@/lib/session";
import { listSeats } from "@/lib/seats";

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const metadata = { title: "이벤트 관리" };

export default async function AdminEventsPage() {
  const user = await getOptionalUser();
  if (!user?.email) notFound();
  const allowed = adminEmails();
  if (allowed.size === 0 || !allowed.has(user.email.toLowerCase())) notFound();

  const seats = await listSeats();
  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-8">
      <a href="/admin/seats" className="text-label-sm text-text-muted">← 좌석 관리</a>
      <h1 className="mt-3 text-display-lg text-primary">수련회 이벤트</h1>
      <p className="mt-2 text-body-md text-text-muted">
        이벤트를 만들고 키링 좌석을 연결하면 종료 후 DAY 30/90 메시지가 표시됩니다.
      </p>
      <div className="mt-8">
        <EventForm seats={seats} />
      </div>
    </main>
  );
}
