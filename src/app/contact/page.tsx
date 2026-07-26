import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { getOptionalUser } from "@/lib/session";

export const metadata = { title: "문의하기" };

export default async function ContactPage() {
  const user = await getOptionalUser();

  return (
    <div className="relative min-h-dvh px-4 py-8">
      <div className="pointer-events-none absolute inset-0 paper-grain" />
      <div className="relative mx-auto w-full max-w-xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href={user ? "/today" : "/"} className="font-serif text-xl text-primary">
            이어봄
          </Link>
          <Link href={user ? "/me" : "/login"} className="text-sm text-muted-foreground">
            {user ? "내 정보" : "로그인"}
          </Link>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-card/90 p-2 shadow-[0_24px_70px_-42px_rgba(30,30,10,0.5)]">
          <div className="rounded-[1.35rem] bg-[linear-gradient(180deg,#fffdf9,#f6f2e9)] px-6 py-8">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
              contact
            </p>
            <h1 className="mt-3 font-serif text-3xl tracking-tight">문의하기</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              서비스 이용, 계정, 데이터 삭제, 버그 제보 등 무엇이든 남겨 주세요.
              접수 내용은 운영 메일로 전달됩니다.
            </p>
            <div className="mt-6">
              <ContactForm
                defaultName={user?.displayName || user?.name || ""}
                defaultEmail={user?.email || ""}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
