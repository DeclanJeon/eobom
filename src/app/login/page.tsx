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
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 paper-grain" />
      <div className="w-full max-w-md rounded-[1.75rem] border border-border/80 bg-card/90 p-2 shadow-[0_24px_70px_-40px_rgba(30,30,10,0.55)]">
        <div className="rounded-[1.35rem] bg-[linear-gradient(180deg,#fffdf9,#f6f2e9)] px-6 py-8">
          <Link href="/" className="font-serif text-2xl text-primary">
            이어봄
          </Link>
          <h1 className="mt-6 font-serif text-3xl tracking-tight">로그인</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Google 계정으로 안전하게 시작합니다. 한 번 로그인하면 같은 기기에서
            쿠키가 유지되는 동안 계속 로그인 상태가 이어집니다.
          </p>

          {params.error ? (
            <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              로그인에 실패했습니다. 다시 시도해 주세요.
            </p>
          ) : null}

          <div className="mt-8 space-y-3">
            <LoginButton callbackUrl={params.callbackUrl || "/today"} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              계속 진행하면 서비스 이용 및 개인정보 처리에 동의하는 것으로
              간주됩니다. 만 14세 이상만 이용할 수 있습니다.
            </p>
          </div>

          <div className="mt-8 flex justify-between text-sm text-muted-foreground">
            <Link href="/">홈으로</Link>
            <Link href="/contact">문의하기</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
