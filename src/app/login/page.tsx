import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/session";
import { LoginButton } from "@/components/login-button";

export const metadata = { title: "로그인" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getOptionalUser();
  if (user) redirect(params.callbackUrl || "/today");

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            ✿
          </span>
          <Link href="/" className="font-journal text-title-journal text-primary">
            이어봄
          </Link>
        </div>
        <h1 className="text-display-lg text-primary">로그인</h1>
        <p className="mt-3 text-body-md text-text-muted">
          Google로 바로 기록을 시작합니다.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-label-md text-destructive">
            로그인에 실패했습니다. 다시 시도해 주세요.
          </p>
        ) : null}

        <div className="mt-8">
          {(() => {
          const cb = params.callbackUrl || "/today";
          const m = cb.match(/^\/j\/([a-z0-9-]+)/i);
          return (
            <LoginButton
              callbackUrl={cb}
              claimSlug={m?.[1]?.toLowerCase()}
            />
          );
        })()}
        </div>

        <p className="mt-6 text-label-sm text-text-muted">
          <Link href="/" className="hover:underline">
            돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
