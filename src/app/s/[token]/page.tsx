import Link from "next/link";
import { resolveShareLink } from "@/lib/share-link";

export const metadata = { title: "함께 나눈 한 문장" };

/**
 * 공개 share 뷰어 (Journey F MVP).
 * resolveShareLink가 반환하는 것은 사용자가 고른 한 문장 + 선택 성구뿐 —
 * 원문 기록 필드는 저장 단계부터 존재하지 않는다(E7-1).
 */
export default async function ShareViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shared = await resolveShareLink(token);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-16">
      <p className="text-eyebrow text-accent-gold-ink">이어봄</p>
      {shared ? (
        <>
          <blockquote className="mt-6 max-w-xl font-journal text-xl leading-[1.85] text-primary md:text-2xl">
            {shared.selectedSentence}
          </blockquote>
          {shared.scriptureRefs.length > 0 ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {shared.scriptureRefs.map((ref) => (
                <span key={ref} className="chip-gold px-3 py-1 text-xs">
                  {ref}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-10 max-w-sm text-center text-label-sm leading-relaxed text-text-muted">
            묵상 중에 남긴 한 문장을 건네받았어요. 부담 없이 읽어 주셔도 됩니다.
          </p>
          <Link href="/today" className="cta-secondary mt-6 min-h-11 px-6">
            이어봄 먼저 경험해 보기
          </Link>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-headline-md text-primary">
            이 링크는 더 이상 열리지 않아요.
          </h1>
          <p className="mt-3 max-w-sm text-center text-body-sm leading-relaxed text-text-muted">
            만료되었거나 보낸 사람이 닫은 링크예요.
          </p>
          <Link href="/today" className="cta-secondary mt-8 min-h-11 px-6">
            이어봄 보러가기
          </Link>
        </>
      )}
    </main>
  );
}
