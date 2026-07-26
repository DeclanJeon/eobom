import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/session";

export default async function LandingPage() {
  const user = await getOptionalUser();
  if (user) redirect("/today");

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 paper-grain" />
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-8 md:px-8">
        <header className="flex items-center justify-between">
          <div className="font-serif text-2xl tracking-tight text-primary">이어봄</div>
          <div className="flex items-center gap-2">
            <Link
              href="/contact"
              className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
            >
              문의
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition active:scale-[0.98]"
            >
              시작하기
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center gap-12 py-16 md:grid md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-10">
          <section className="space-y-6">
            <p className="inline-flex rounded-full bg-sage-light/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sage-dark">
              personal meditation journal
            </p>
            <h1 className="max-w-xl font-serif text-4xl leading-[1.15] tracking-tight text-foreground md:text-6xl">
              흩어진 묵상을 이어,
              <br />
              어제의 믿음이
              <br />
              오늘의 방향이 되게.
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              이어봄은 묵상을 대신 써 주지 않습니다. 이미 남긴 성구, 기도, 결단을
              안전하게 모으고, 근거 있는 질문으로 다시 만나게 합니다.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-sage-dark active:scale-[0.98]"
              >
                Google로 기록 시작
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-base">
                  →
                </span>
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-border bg-card/70 px-5 py-3 text-sm text-foreground"
              >
                문의하기
              </Link>
            </div>
          </section>

          <section className="grid gap-3">
            {[
              {
                title: "기록 우선",
                body: "성구와 본문만으로 2분 안에 저장. AI는 선택입니다.",
              },
              {
                title: "개인 묵상기록지",
                body: "나만의 주소와 QR로 언제든 내 기록 공간으로 돌아옵니다.",
              },
              {
                title: "판정하지 않는 회고",
                body: "AI는 점수를 매기지 않고, 원문 근거와 질문만 남깁니다.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-[1.4rem] border border-border/80 bg-card/80 p-1.5 shadow-[0_18px_50px_-36px_rgba(40,40,20,0.55)]"
              >
                <div className="rounded-[1.05rem] bg-[linear-gradient(180deg,#fffdf8,#f7f3ea)] p-5">
                  <h2 className="font-serif text-xl text-foreground">{card.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {card.body}
                  </p>
                </div>
              </div>
            ))}
          </section>
        </main>

        <footer className="border-t border-border/70 py-6 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>모든 기록은 기본적으로 비공개입니다.</p>
            <div className="flex gap-4">
              <Link href="/login">로그인</Link>
              <Link href="/contact">문의</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
