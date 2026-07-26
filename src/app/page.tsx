import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/session";

export default async function LandingPage() {
  const user = await getOptionalUser();
  if (user) redirect("/today");

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 paper-grain" />
      <main className="relative w-full max-w-md text-center">
        <p className="font-serif text-2xl tracking-tight text-primary">이어봄</p>
        <h1 className="mt-8 font-serif text-3xl leading-snug tracking-tight text-foreground sm:text-4xl">
          오늘의 묵상을
          <br />
          남겨 보세요
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          기록만 하면 됩니다. 나머지는 필요할 때.
        </p>
        <Link
          href="/login"
          className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-4 text-base font-medium text-background transition active:scale-[0.99]"
        >
          기록하기
        </Link>
        <p className="mt-6 text-xs text-muted-foreground">
          <Link href="/contact" className="underline-offset-2 hover:underline">
            문의
          </Link>
        </p>
      </main>
    </div>
  );
}
