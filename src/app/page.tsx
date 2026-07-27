import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/session";

export default async function LandingPage() {
  const user = await getOptionalUser();
  if (user) redirect("/today");

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5">
      <main className="w-full max-w-md">
        <div className="mb-10 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="이어봄" width={40} height={40} className="h-10 w-10 rounded-xl" />
          <p className="font-journal text-title-journal text-primary">이어봄</p>
        </div>

        <h1 className="text-display-lg text-primary">
          오늘의 묵상을
          <br />
          시작해볼까요?
        </h1>
        <p className="mt-3 text-body-md text-text-muted">
          당신만의 평온한 공간, 이어봄입니다.
        </p>

        <Link
          href="/login"
          className="mt-10 flex w-full flex-col items-start gap-3 rounded-2xl bg-primary p-8 text-primary-foreground shadow-sm transition duration-200 active:scale-[0.98]"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl">
            ✎
          </span>
          <span>
            <span className="block text-headline-sm">묵상 기록하기</span>
            <span className="mt-1 block text-label-md opacity-80">
              오늘 주신 말씀을 마음에 새깁니다
            </span>
          </span>
          <span className="mt-2 text-label-md">기록 시작하기 →</span>
        </Link>

        <p className="mt-8 text-center text-label-sm text-text-muted">
          <Link href="/contact" className="hover:underline">
            문의
          </Link>
        </p>
      </main>
    </div>
  );
}
