import { AppShell } from "@/components/app-shell";
import { SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";

export const metadata = { title: "내보내기" };

export default async function ExportPage() {
  await requireUser();
  return (
    <AppShell title="내보내기">
      <SurfaceCard>
        <p className="text-sm leading-relaxed text-muted-foreground">
          원문, 회고, 공유 묵상을 파일로 받습니다.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <a
            href="/api/export?format=json"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
          >
            JSON 받기
          </a>
          <a
            href="/api/export?format=markdown"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-3 text-sm font-medium"
          >
            Markdown 받기
          </a>
        </div>
      </SurfaceCard>
    </AppShell>
  );
}
