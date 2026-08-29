import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "알림 구독 해지 완료" };
export const dynamic = "force-dynamic";

export default function EmailUnsubscribedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md space-y-6">
        <h1 className="text-headline-sm text-primary">
          알림 구독이 해지되었습니다
        </h1>
        <p className="text-body-md text-text-muted">
          더 이상 이메일 알림을 받지 않습니다.
          <br />
          이어봄 기록은 계속 이용하실 수 있습니다.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <Link href="/" className="cta-primary py-3">
            이어봄으로 돌아가기
          </Link>
          <Link
            href="/me/settings"
            className="text-label-md text-leaf hover:underline"
          >
            설정에서 다시 켜기
          </Link>
        </div>
      </div>
    </div>
  );
}
