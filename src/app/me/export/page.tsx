import { AppShell } from "@/components/app-shell";
import { SurfaceCard } from "@/components/ui-blocks";
import { ImportForm } from "@/components/import-form";
import { requireUser } from "@/lib/session";

export const metadata = { title: "데이터 이동" };

export default async function ExportPage() {
  await requireUser();
  return (
    <AppShell title="데이터 이동">
      <SurfaceCard>
        <p className="text-body-md text-text-muted">
          묵상 기록을 파일로 받습니다. 다른 기기에서 가져오면 기록을 옮길 수
          있습니다.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <a href="/api/export?format=json" className="cta-primary">
            JSON 받기
          </a>
          <a href="/api/export?format=markdown" className="cta-secondary">
            Markdown 받기
          </a>
        </div>
      </SurfaceCard>

      <SurfaceCard className="mt-4">
        <p className="text-label-md text-primary">가져오기</p>
        <p className="mt-1 text-body-sm text-text-muted">
          내보낸 JSON 파일을 골라 이 기기로 묵상 기록을 가져옵니다.
        </p>
        <div className="mt-4">
          <ImportForm />
        </div>
      </SurfaceCard>
    </AppShell>
  );
}
