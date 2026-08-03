import Link from "next/link";
import { SurfaceCard } from "@/components/ui-blocks";
import { Reveal } from "@/components/review/reveal";
import { EvidenceDrawer } from "@/components/review/evidence-drawer";
import { ReviewSectionNav, type SpineItem } from "@/components/review/review-section-nav";
import type {
  NarrativeAct,
  NarrativeQuote,
  SimpleReviewView,
} from "@/lib/review-display";
import { formatDateShort } from "@/lib/utils";

/**
 * 돌아보기 상세 — 거울 서사(Mirror Narrative).
 * 6개 관측 서랍을 인과 순서의 4막으로 읽어, 사용자의 원문 인용구가
 * 주인공이 되게 한다. AI는 무대(내레이션)만 깔고, 1인칭은 언제나
 * 사용자가 쓴 인용으로만 채운다(I1).
 */
export function ReviewSimpleView({
  periodStart,
  periodEnd,
  entryCount,
  view,
  boundary,
  spineItems,
}: {
  periodStart: Date | string;
  periodEnd: Date | string;
  entryCount?: number;
  view: SimpleReviewView;
  boundary: string;
  spineItems: SpineItem[];
}) {
  const meta = [
    `${formatDateShort(periodStart)} – ${formatDateShort(periodEnd)}`,
    entryCount ? `기록 ${entryCount}편` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const hasMeet = view.hasMeet;

  return (
    <div className="w-full">
      {/* 모바일 가로 목차 */}
      <ReviewSectionNav items={spineItems} variant="bar" />

      {/* 프롤로그 — 이 기간의 나 */}
      <Reveal as="section" className="surface-card-dark mb-10 rounded-2xl p-6 md:p-9">
        <p className="text-eyebrow mb-3" style={{ color: "var(--accent-gold)" }}>
          이 기간의 나
        </p>
        <h1 className="text-display-lg text-white" style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}>
          {view.prologueSentence}
        </h1>
        {meta ? (
          <p className="mt-4 text-label-md text-on-dark-muted">{meta}</p>
        ) : null}
        {view.weather ? (
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-label-sm text-on-dark-muted">마음의 날씨</p>
            <p className="mt-2 font-serif text-body-md leading-relaxed text-white/90">
              {view.weather.prose}
            </p>
            {view.weather.tones.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {view.weather.tones.map((t) => (
                  <li key={t.label} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-label-sm text-on-dark-muted">
                      {t.label}
                    </span>
                    <span className="tone-bar w-28" aria-hidden>
                      <span style={{ width: `${(t.weight / 3) * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Reveal>

      {/* 4막 서사 */}
      <div className="space-y-14 md:space-y-16">
        {view.acts.map((act) => (
          <ActSection key={act.id} act={act} view={view} />
        ))}

        {/* 만남과 말씀 */}
        {hasMeet ? (
          <MeetSection view={view} actNumber={String(view.acts.length + 1).padStart(2, "0")} />
        ) : null}
      </div>
      <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/story-mirror" className="text-label-sm text-leaf transition hover:text-primary">
          이야기 거울 둘러보기 →
        </Link>
        <Link href="/story-mirror/visualize" className="text-label-sm text-leaf transition hover:text-primary">
          이미지로 기억하기 →
        </Link>
      </div>

      <p className="mt-6 text-label-sm leading-relaxed text-text-muted">{boundary}</p>
    </div>
  );
}

function ActSection({
  act,
  view,
}: {
  act: NarrativeAct;
  view: SimpleReviewView;
}) {
  const isWalk = act.id === "act-walk";
  return (
    <Reveal as="section" id={act.id} className="act-ambient scroll-mt-24">
      <header className="mb-6">
        <span className="act-number block">{act.number}</span>
        <h2 className="mt-2 text-headline-md text-primary">{act.title}</h2>
        <p className="mt-1 text-label-sm text-text-muted">{act.eyebrow}</p>
        <span aria-hidden className="act-rule mt-4 block" />
      </header>

      <p className="text-body-md leading-relaxed text-text-muted">{act.narration}</p>

      {act.quotes.length > 0 ? (
        <div className="mt-6 space-y-5">
          {act.quotes.map((q, idx) => (
            <Quote key={`${q.text}-${idx}`} quote={q} delay={80 + idx * 60} />
          ))}
        </div>
      ) : null}

      {act.evidence.length > 0 ? (
        <EvidenceDrawer items={act.evidence} label={`이 막의 근거 기록 ${act.evidence.length}개`} />
      ) : null}

      {isWalk ? <ForwardPanel view={view} /> : null}

      {act.transition ? (
        <p className="act-transition mt-7 border-l-2 border-leaf/30 pl-4">
          {act.transition}
        </p>
      ) : null}
    </Reveal>
  );
}

function Quote({ quote, delay }: { quote: NarrativeQuote; delay: number }) {
  return (
    <Reveal as="blockquote" delay={delay} className="narrative-quote">
      <p className="narrative-quote-text">{quote.text}</p>
      {quote.date ? (
        <footer className="narrative-quote-date mt-2 text-right">
          — {formatDateShort(quote.date)} 기록
        </footer>
      ) : null}
    </Reveal>
  );
}

function ForwardPanel({ view }: { view: SimpleReviewView }) {
  const { nextSteps, prayerPrompts, smallPractices, changesOrUnknown } = view;
  const hasAny =
    nextSteps.length > 0 ||
    prayerPrompts.length > 0 ||
    smallPractices.length > 0 ||
    Boolean(changesOrUnknown);

  if (!hasAny) return null;

  return (
    <div className="mt-7 space-y-7">
      {nextSteps.length > 0 ? (
        <div>
          <p className="text-label-md text-primary">이번 주, 하나만 해본다면</p>
          <ol className="mt-3 space-y-4">
            {nextSteps.map((n, idx) => (
              <li key={`${n.action}-${idx}`} className="flex gap-3">
                <span className="text-label-md text-gold-ink" aria-hidden>
                  {idx + 1}
                </span>
                <div>
                  <p className="text-body-md text-text-main">{n.action}</p>
                  {n.reason ? (
                    <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
                      {n.reason}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          <Link
            href="/entries/new"
            className="cta-primary mt-5 min-h-[44px] px-5 py-2.5"
          >
            이 한 걸음을 기록으로 남기기
          </Link>
        </div>
      ) : null}

      {prayerPrompts.length > 0 ? (
        <div>
          <p className="text-label-md text-primary">기도로 이어갈 자리</p>
          <ul className="mt-3 space-y-3">
            {prayerPrompts.map((p, idx) => (
              <li key={`${p.topic}-${idx}`}>
                <p className="font-serif text-body-md text-text-main">{p.topic}</p>
                {p.suggestion ? (
                  <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
                    {p.suggestion}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {smallPractices.length > 0 ? (
        <div>
          <p className="text-label-md text-primary">작게 걸어볼 걸음</p>
          <ul className="mt-3 space-y-2.5">
            {smallPractices.map((p, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf/15 text-label-xs text-leaf"
                >
                  ✓
                </span>
                <p className="text-body-sm leading-relaxed text-text-muted">{p}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {changesOrUnknown ? (
        <div>
          <p className="text-label-md text-primary">아직 모르는 것</p>
          <p className="mt-2 font-serif text-body-md leading-relaxed text-text-muted">
            {changesOrUnknown}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function MeetSection({
  view,
  actNumber,
}: {
  view: SimpleReviewView;
  actNumber: string;
}) {
  return (
    <Reveal as="section" id="act-meet" className="act-ambient scroll-mt-24">
      <header className="mb-6">
        <span className="act-number block">{actNumber}</span>
        <h2 className="mt-2 text-headline-md text-primary">만남과 말씀</h2>
        <p className="mt-1 text-label-sm text-text-muted">
          기록을 비추는 이야기와, 다시 머물 본문
        </p>
        <span aria-hidden className="act-rule mt-4 block" />
      </header>

      <div className="space-y-5">
        {view.stories.length > 0 ? (
          <SurfaceCard>
            <h3 className="text-label-md text-primary">닮은 마음을 살았던 이야기</h3>
            <ul className="mt-3 space-y-4">
              {view.stories.map((story, idx) => {
                const body = (
                  <>
                    <p className="text-label-md text-primary">{story.title}</p>
                    {story.source ? (
                      <p className="mt-0.5 text-label-xs text-text-muted">{story.source}</p>
                    ) : null}
                    <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
                      {story.line}
                    </p>
                  </>
                );
                return (
                  <li key={`${story.title}-${idx}`}>
                    {story.href ? (
                      <Link href={story.href} className="block rounded-xl transition hover:bg-surface-low/80">
                        {body}
                        <span className="mt-2 inline-block text-label-xs text-leaf">이야기 더 읽기 →</span>
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          </SurfaceCard>
        ) : null}

        {view.scriptures.length > 0 ? (
          <SurfaceCard>
            <h3 className="text-label-md text-primary">주제와 연결된 새 말씀</h3>
            <p className="mt-1 text-label-sm text-text-muted">아직 기록하지 않은, 주제에 맞는 본문</p>
            <ul className="mt-3 space-y-4">
              {view.scriptures.map((s) => (
                <li key={s.ref}>
                  <span className="chip-gold">{s.ref}</span>
                  <p className="mt-2 text-body-sm leading-relaxed text-text-muted">{s.why}</p>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        ) : null}

        {view.companions.length > 0 ? (
          <SurfaceCard>
            <h3 className="text-label-md text-primary">함께하면 좋은 사람</h3>
            <ul className="mt-3 space-y-4">
              {view.companions.map((c, idx) => (
                <li key={`${c.role}-${idx}`}>
                  <p className="text-label-md text-primary">{c.role}</p>
                  <p className="mt-1 text-body-sm leading-relaxed text-text-muted">{c.why}</p>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        ) : null}

        {view.rereadScriptures.length > 0 ? (
          <SurfaceCard className="border-l-4 border-l-accent-gold/50">
            <h3 className="text-label-md text-primary">다시 머물면 좋은 본문</h3>
            <p className="mt-1 text-label-sm text-text-muted">지난 기록에서 이어진 말씀</p>
            <ul className="mt-3 space-y-4">
              {view.rereadScriptures.map((s) => (
                <li key={s.ref}>
                  <span className="chip-gold">{s.ref}</span>
                  <p className="mt-2 text-body-sm leading-relaxed text-text-muted">{s.why}</p>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        ) : null}
      </div>
    </Reveal>
  );
}
