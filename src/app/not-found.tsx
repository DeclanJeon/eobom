import Link from "next/link";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui-blocks";
import { getOptionalUser } from "@/lib/session";

export default async function NotFound() {
  const user = await getOptionalUser();
  return (
    <AppShell wide publicLogo={!user}>
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={<Compass className="h-10 w-10 text-text-muted" />}
          title="페이지를 찾을 수 없습니다"
          description="요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다."
          action={
            <Link href="/today" className="cta-primary">
              오늘로 돌아가기
            </Link>
          }
        />
      </div>
    </AppShell>
  );
}
