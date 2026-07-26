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
  const user = await getOptionalUser();
  if (user) redirect("/today");
  const params = await searchParams;

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 paper-grain" />
      <div className="relative w-full max-w-sm text-center">
        <Link href="/" className="font-serif text-2xl text-primary">
          이어봄
        </Link>
        <h1 className="mt-8 font-serif text-3xl tracking-tight">로그인</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Google로 바로 기록을 시작합니다.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            로그인에 실패했습니다. 다시 시도해 주세요.
          </p>
        ) : null}

        <div className="mt-8">
          <LoginButton callbackUrl={params.callbackUrl || "/today"} />
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          <Link href="/" className="hover:underline">
            돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
