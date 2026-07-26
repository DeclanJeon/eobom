import { AppShell } from "@/components/app-shell";
import { PageIntro, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";

export const metadata = { title: "데이터 내보내기" };

export default async function ExportPage() {
  await requireUser();
  return (
    <AppShell title="내보내기">
      <PageIntro
        title="데이터 내보내기"
        description="원문, 회고, 공유 묵상을 JSON 또는 Markdown으로 받을 수 있습니다."
      />
      <div className="space-y-3">
        <SurfaceCard>
          <h2 className="font-serif text-xl">JSON</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 구조화된 백업 파일
          </p>
          <a
            href="/api/export?format=json"
            className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            JSON 다운로드
          </a>
        </SurfaceCard>
        <SurfaceCard>
          <h2 className="font-serif text-xl">Markdown</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            읽기 쉬운 문서 형식
          </p>
          <a
            href="/api/export?format=markdown"
            className="mt-4 inline-flex rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium"
          >
            Markdown 다운로드
          </a>
        </SurfaceCard>
      </div>
    </AppShell>
  );
}
