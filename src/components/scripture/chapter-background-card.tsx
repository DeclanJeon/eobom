import type { ChapterBackground } from "@/lib/bible/chapter-background";

export function ChapterBackgroundCard({ background }: { background: ChapterBackground }) {
  const hasThreeEyes = Boolean(background.historical || background.literary || background.theological);
  const guide = background.guide;
  return (
    <details className="group rounded-2xl border border-border/30 bg-card/40 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="text-label-sm font-medium text-primary">이 장의 문맥</span>
        <span className="shrink-0 text-label-xs text-text-muted group-open:hidden">펼치기 ▾</span>
        <span className="hidden shrink-0 text-label-xs text-text-muted group-open:inline">접기 ▴</span>
      </summary>
      <div className="mt-4 space-y-3">
        {guide ? (
          <>
            <p className="text-label-md font-semibold text-primary">{guide.title}</p>
            {guide.background ? (
              <div className="rounded-xl border border-border/30 px-4 py-3">
                <p className="text-label-sm font-semibold text-primary">장면의 배경</p>
                <p className="mt-1 text-body-sm leading-relaxed text-text-muted">{guide.background}</p>
              </div>
            ) : null}
            {guide.content ? (
              <div className="rounded-xl bg-secondary/30 px-4 py-3">
                <p className="text-label-sm font-semibold text-primary">이 장의 내용</p>
                <p className="mt-1 text-body-sm leading-relaxed text-text-muted">{guide.content}</p>
              </div>
            ) : null}
            {guide.observation.length ? (
              <div className="rounded-xl border border-border/30 px-4 py-3">
                <p className="text-label-sm font-semibold text-primary">읽을 때 볼 점</p>
                <ul className="mt-1 space-y-2 text-body-sm leading-relaxed text-text-muted">
                  {guide.observation.map((item, index) => <li key={index} className="flex gap-2"><span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-accent-gold" />{item}</li>)}
                </ul>
              </div>
            ) : null}
            {guide.characters.length ? (
              <details className="rounded-xl border border-border/30 px-4 py-3">
                <summary className="cursor-pointer list-none text-label-sm font-semibold text-primary">등장인물 알아보기</summary>
                <ul className="mt-2 space-y-2 text-body-sm leading-relaxed text-text-muted">
                  {guide.characters.slice(0, 8).map((character) => <li key={character}>· {character}</li>)}
                </ul>
              </details>
            ) : null}
            {background.publicCommentary?.text ? (
              <details className="rounded-xl border border-border/30 px-4 py-3">
                <summary className="cursor-pointer list-none text-label-sm font-semibold text-primary">공개 고전 주석 원문</summary>
                <p className="mt-2 text-body-sm leading-relaxed text-text-muted">{background.publicCommentary.text}</p>
                <p className="mt-2 text-label-xs text-text-muted">Matthew Henry · Public Domain · CCEL/CrossWire</p>
              </details>
            ) : null}
          </>
        ) : (
          <>
            {background.overview ? <p className="text-body-sm leading-relaxed text-text-muted">{background.overview}</p> : null}
            {hasThreeEyes ? (
              <div className="grid gap-3 lg:grid-cols-3">
                {background.historical ? <div className="rounded-xl border border-border/30 px-4 py-3"><p className="text-label-sm font-semibold text-primary">역사</p><p className="mt-1 text-body-sm leading-relaxed text-text-muted">{background.historical}</p></div> : null}
                {background.literary ? <div className="rounded-xl border border-border/30 px-4 py-3"><p className="text-label-sm font-semibold text-primary">문학</p><p className="mt-1 text-body-sm leading-relaxed text-text-muted">{background.literary}</p></div> : null}
                {background.theological ? <div className="rounded-xl border border-border/30 px-4 py-3"><p className="text-label-sm font-semibold text-primary">신학</p><p className="mt-1 text-body-sm leading-relaxed text-text-muted">{background.theological}</p></div> : null}
              </div>
            ) : null}
          </>
        )}
        {background.keyVerses.length ? (
          <div className="border-t border-border/20 pt-3">
            <p className="text-label-sm font-semibold text-primary">붙잡을 말씀</p>
            <p className="mt-2 flex flex-wrap gap-2">
              {background.keyVerses.map((kv) => <span key={kv.reference} className="chip-gold px-2 py-1 text-xs">{kv.reference}{kv.why ? ` · ${kv.why}` : ""}</span>)}
            </p>
          </div>
        ) : null}
        {background.cautions.length || background.sources.length ? (
          <div className="border-t border-border/20 pt-3">
            {background.cautions.length ? <p className="text-label-xs leading-relaxed text-text-muted">읽을 때 주의: {background.cautions.join(" · ")}</p> : null}
            {background.sources.length ? <p className="mt-2 text-label-xs text-text-muted">출처 · {background.sources.map((s) => `${s.title} ${s.license ?? ""}`).join(" · ")}</p> : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}
