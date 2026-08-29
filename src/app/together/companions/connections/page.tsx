import { AppShell } from "@/components/app-shell";
import { Breadcrumb, EmptyState, SurfaceCard } from "@/components/ui-blocks";
import { CompanionMessageForm } from "@/components/companion-message-form";
import { CompanionSafetyActions } from "@/components/companion-safety-actions";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata = { title: "연결된 동행" };
export const dynamic = "force-dynamic";

export default async function CompanionConnectionsPage() {
  const user = await requireUser();
  const blocks = await db.companionBlock.findMany({
    where: { OR: [{ blockerUserId: user.id }, { blockedUserId: user.id }] },
    select: { blockerUserId: true, blockedUserId: true },
  });
  const blockedIds = new Set(blocks.map((block) =>
    block.blockerUserId === user.id ? block.blockedUserId : block.blockerUserId,
  ));
  const connections = await db.companionConnection.findMany({
    where: {
      status: "connected",
      OR: [{ requesterId: user.id }, { counterpartyId: user.id }],
    },
    orderBy: { createdAt: "desc" },
  }).then((items) => items.filter((item) =>
    !blockedIds.has(item.requesterId === user.id ? item.counterpartyId : item.requesterId),
  ));
  if (!connections.length) {
    return (
      <AppShell title="연결된 동행">
        <Breadcrumb href="/together/companions" label="동행" current="연결된 동행" className="mb-4" />
        <EmptyState title="아직 연결된 동행이 없습니다" description="필요할 때만 동행 후보를 찾아보세요." />
      </AppShell>
    );
  }
  const otherIds = connections.map((item) => item.requesterId === user.id ? item.counterpartyId : item.requesterId);
  const users = await db.user.findMany({
    where: { id: { in: otherIds } },
    select: { id: true, displayName: true, name: true },
  });
  const names = new Map(users.map((item) => [item.id, item.displayName || item.name || "동행자"]));
  return (
    <AppShell title="연결된 동행">
      <Breadcrumb href="/together/companions" label="동행" current="연결된 동행" className="mb-4" />
      <div className="space-y-4">
        {connections.map((connection) => {
          const otherId = connection.requesterId === user.id ? connection.counterpartyId : connection.requesterId;
          return (
            <SurfaceCard key={connection.id}>
              <p className="text-eyebrow">서로 동의한 연결</p>
              <h2 className="mt-2 text-headline-sm text-primary">{names.get(otherId) ?? "동행자"}</h2>
              <p className="mt-2 text-body-sm text-text-muted">첫 인사는 자동으로 보내지 않습니다. 내용을 확인한 뒤 직접 보내세요.</p>
              <CompanionMessageForm connectionId={connection.id} />
              <CompanionSafetyActions connectionId={connection.id} targetUserId={otherId} />
            </SurfaceCard>
          );
        })}
      </div>
    </AppShell>
  );
}
