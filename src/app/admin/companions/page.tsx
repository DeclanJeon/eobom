import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/session";
import { db } from "@/lib/db";

function isAdmin(email: string | null | undefined) {
  return Boolean(email && (process.env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).includes(email.toLowerCase()));
}

export const dynamic = "force-dynamic";

export default async function AdminCompanionsPage() {
  const user = await getOptionalUser();
  if (!isAdmin(user?.email)) redirect("/");
  const [reports, messages] = await Promise.all([
    db.companionSafetyEvent.findMany({ where: { type: "report", moderationStatus: "open" }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.companionMessage.findMany({ where: { moderationStatus: "flagged" }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-5 py-10">
      <h1 className="text-heading-lg">동행 moderation queue</h1>
      <section aria-labelledby="reports-heading">
        <h2 id="reports-heading" className="text-heading-md">신고 ({reports.length})</h2>
        <ul className="mt-3 space-y-2">{reports.map((report) => <li key={report.id} className="rounded-xl border border-border p-3">{report.reason || "사유 없음"}</li>)}</ul>
      </section>
      <section aria-labelledby="messages-heading">
        <h2 id="messages-heading" className="text-heading-md">검토 대기 메시지 ({messages.length})</h2>
        <ul className="mt-3 space-y-2">{messages.map((message) => <li key={message.id} className="rounded-xl border border-border p-3">{message.body}</li>)}</ul>
      </section>
    </main>
  );
}
