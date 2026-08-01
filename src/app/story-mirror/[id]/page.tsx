/**
 * /story-mirror/[id] — 이야기 거울 상세
 *
 * 목록/회고에서 본 개인화 서사(connection)를 우선 보여 주고,
 * 이어서 원문·출처를 읽게 한다. 관련 추천("함께 읽을 이야기")은 노출하지 않는다.
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SurfaceCard } from "@/components/ui-blocks";
import {
  getCardDetail,
  getChunkDetail,
  type StoryCardDetail,
  type StoryChunkDetail,
} from "@/lib/story-mirror/db";
import {
  parseStoryDetailContext,
  type StoryDetailContext,
} from "@/lib/story-mirror/story-links";
import { parseJsonArray } from "@/lib/utils";
import { notFound } from "next/navigation";
import { StoryMirrorFeedback } from "@/components/story-mirror-feedback";
import { db } from "@/lib/db";
import { getOptionalUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await getCardDetail(id);
  if (card) return { title: `${card.name} · 이야기 거울` };
  const chunkView = await getChunkDetail(id);
  if (chunkView?.chunk.title) {
    return { title: `${chunkView.chunk.title} · 이야기 거울` };
  }
  return { title: "이야기 거울" };
}

export default async function StoryMirrorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = parseStoryDetailContext(sp);

  const card = await getCardDetail(id);
  if (card && card.reviewStatus === "published") {
    const user = await getOptionalUser();
    let matchId: string | null = null;
    if (user?.id) {
      const match = await db.storyMirrorMatch.findFirst({
        where: { cardId: card.id, state: "active", run: { userId: user.id } },
        orderBy: { createdAt: "desc" },
      });
      matchId = match?.id ?? null;
    }
    return <CardDetailView card={card} ctx={ctx} matchId={matchId} />;
  }

  const chunkView = await getChunkDetail(id);
  if (!chunkView) notFound();
  return <ChunkDetailView chunk={chunkView.chunk} ctx={ctx} />;
}

function CardDetailView({
  card,
  ctx,
  matchId,
}: {
  card: StoryCardDetail;
  ctx: StoryDetailContext;
  matchId: string | null;
}) {
  const themes = parseJsonArray(card.themes);
  const emotions = parseJsonArray(card.emotions);
  const situations = parseJsonArray(card.situations);
  const warnings = parseJsonArray(card.contentWarnings);
  const counterPatterns = parseJsonArray(card.counterPatterns);
  const sourceLabel =
    ctx.sourceLabel ||
    `${card.work.title}${card.work.author ? ` · ${card.work.author}` : ""}`;

  return (
    <AppShell wide bare>
      <div className="mb-6">
        <Link
          href="/story-mirror"
          className="text-label-sm text-leaf transition hover:text-primary"
        >
          ← 이야기 거울
        </Link>
      </div>

      <article className="max-w-2xl">
        <header className="mb-8">
          <p className="text-eyebrow text-accent-gold-ink">{sourceLabel}</p>
          <h1 className="mt-2 text-display-lg text-primary md:text-4xl">
            {card.name}
          </h1>
          {card.work.era && (
            <p className="mt-1 text-label-md text-text-muted">{card.work.era}</p>
          )}
        </header>

        <PersonalOverlapSection
          connection={ctx.connection}
          differentPerspective={ctx.differentPerspective}
        />

        {warnings.length > 0 && (
          <div className="mb-6 rounded-xl border border-safety/30 bg-safety/5 p-4">
            <p className="text-label-sm font-medium text-safety">콘텐츠 주의</p>
            <p className="mt-1 text-body-sm text-text-muted">
              {warnings.join(", ")}
            </p>
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-headline-sm text-primary">어떤 이야기인가</h2>
          <p className="mt-2 text-body-md leading-relaxed text-ink">
            {card.summary}
          </p>
          {card.arc && (
            <p className="mt-2 text-label-sm text-text-muted">{card.arc}</p>
          )}
          <div className="mt-4 rounded-2xl border border-border/70 bg-surface-shared/50 p-4">
            <p className="text-label-xs font-medium text-accent-gold-ink">
              이 인물을 이렇게 읽어 보세요
            </p>
            <ul className="mt-2 space-y-1.5 text-body-sm text-text-muted">
              <li>· 겉으로 보이는 모습은 무엇인가요?</li>
              <li>· 그 안에 있던 외로움·열망·고집은 무엇일까요?</li>
              <li>· 나의 기록 중 어디와 겹치나요?</li>
              <li>· 시간이 지나며 이 인물에게 생긴 변화의 씨앗은?</li>
            </ul>
          </div>
        </section>

        <TagSection themes={themes} emotions={emotions} situations={situations} />

        {counterPatterns.length > 0 && (
          <section className="mb-8">
            <h2 className="text-headline-sm text-primary">다른 흐름</h2>
            <p className="mt-2 text-body-md text-text-muted">
              이 이야기에서는 또한 {counterPatterns.join(", ")}의 흐름도
              나타납니다.
            </p>
          </section>
        )}

        {card.passages.length > 0 && (
          <section className="mb-8">
            <h2 className="text-headline-sm text-primary">다시 읽어볼 구절</h2>
            <div className="mt-3 space-y-3">
              {card.passages.map((p) => (
                <blockquote
                  key={p.id}
                  className="border-l-2 border-accent-gold pl-4"
                >
                  <p className="text-body-md italic text-ink">{p.text}</p>
                  <cite className="mt-1 block text-label-sm text-text-muted">
                    — {p.locator}
                    {p.citationAllowed && (
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-leaf hover:text-primary"
                      >
                        원문 보기
                      </a>
                    )}
                  </cite>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        <SourceSection
          title={card.work.title}
          titleOriginal={card.work.titleOriginal}
          author={card.work.author}
          translator={card.work.translator}
          rightsBasis={card.work.rightsBasis}
          sourceUrl={card.work.sourceUrl}
        />

        <p className="mb-6 text-label-sm text-text-muted">
          이 이야기는 판정이나 처방이 아닙니다. 사용자의 경험과 겹치는 부분을
          발견할 수 있는 읽을 거리만 제공합니다.
        </p>

        <ReflectionPrompt />
        {matchId ? <StoryMirrorFeedback matchId={matchId} /> : null}
      </article>
    </AppShell>
  );
}

function ChunkDetailView({
  chunk,
  ctx,
}: {
  chunk: StoryChunkDetail;
  ctx: StoryDetailContext;
}) {
  const themes = parseJsonArray(chunk.themes);
  const emotions = parseJsonArray(chunk.emotions);
  const situations = parseJsonArray(chunk.situations);
  const sourceLabel =
    ctx.sourceLabel ||
    `${chunk.work.title}${chunk.work.author ? ` · ${chunk.work.author}` : ""}${
      chunk.locator ? ` · ${chunk.locator}` : ""
    }`;

  return (
    <AppShell wide bare>
      <div className="mb-6">
        <Link
          href="/story-mirror"
          className="text-label-sm text-leaf transition hover:text-primary"
        >
          ← 이야기 거울
        </Link>
      </div>

      <article className="max-w-2xl">
        <header className="mb-8">
          <p className="text-eyebrow text-accent-gold-ink">{sourceLabel}</p>
          <h1 className="mt-2 text-display-lg text-primary md:text-4xl">
            {chunk.title || chunk.work.title}
          </h1>
          {chunk.work.era && (
            <p className="mt-1 text-label-md text-text-muted">{chunk.work.era}</p>
          )}
        </header>

        <PersonalOverlapSection
          connection={ctx.connection}
          differentPerspective={ctx.differentPerspective}
        />

        <section className="mb-8">
          <h2 className="text-headline-sm text-primary">어떤 이야기인가</h2>
          <p className="mt-2 text-body-md leading-relaxed text-ink">
            {chunk.text}
          </p>
          <div className="mt-4 rounded-2xl border border-border/70 bg-surface-shared/50 p-4">
            <p className="text-label-xs font-medium text-accent-gold-ink">
              이 이야기를 이렇게 읽어 보세요
            </p>
            <ul className="mt-2 space-y-1.5 text-body-sm text-text-muted">
              <li>· 겉으로 보이는 장면은 무엇인가요?</li>
              <li>· 그 안에 있던 감정과 열망은 무엇일까요?</li>
              <li>· 나의 기록 중 어디와 겹치나요?</li>
              <li>· 한 줄로 남기고 싶은 통찰은 무엇인가요?</li>
            </ul>
          </div>
        </section>

        <TagSection themes={themes} emotions={emotions} situations={situations} />

        <SourceSection
          title={chunk.work.title}
          titleOriginal={chunk.work.titleOriginal}
          author={chunk.work.author}
          translator={chunk.work.translator}
          rightsBasis={chunk.work.rightsBasis}
          sourceUrl={chunk.work.sourceUrl}
        />

        <p className="mb-6 text-label-sm text-text-muted">
          이 이야기는 판정이나 처방이 아닙니다. 사용자의 경험과 겹치는 부분을
          발견할 수 있는 읽을 거리만 제공합니다.
        </p>

        <ReflectionPrompt />
      </article>
    </AppShell>
  );
}

function PersonalOverlapSection({
  connection,
  differentPerspective,
}: {
  connection?: string | null;
  differentPerspective?: string | null;
}) {
  if (!connection?.trim() && !differentPerspective?.trim()) return null;

  return (
    <section className="mb-8">
      <SurfaceCard className="border-l-4 border-l-accent-gold/60">
        <p className="text-label-xs uppercase tracking-wide text-accent-gold-ink">
          나의 기록과 겹치는 지점
        </p>
        {connection?.trim() ? (
          <p className="mt-3 text-body-md leading-relaxed text-ink">
            {connection}
          </p>
        ) : null}
        {differentPerspective?.trim() ? (
          <div className="mt-4 rounded-xl bg-surface-shared/80 p-3">
            <p className="text-label-xs font-medium text-leaf">한 문장으로 보면</p>
            <p className="mt-1 text-body-sm leading-relaxed text-primary">
              {differentPerspective}
            </p>
          </div>
        ) : null}
      </SurfaceCard>
    </section>
  );
}

function TagSection({
  themes,
  emotions,
  situations,
}: {
  themes: string[];
  emotions: string[];
  situations: string[];
}) {
  if (themes.length === 0 && emotions.length === 0 && situations.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-headline-sm text-primary">주제와 감정</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {themes.map((t) => (
          <span
            key={t}
            className="rounded-full bg-chalk px-3 py-1 text-label-sm text-ink"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {emotions.map((e) => (
          <span
            key={e}
            className="rounded-full bg-mist px-3 py-1 text-label-sm text-ink"
          >
            {e}
          </span>
        ))}
      </div>
      {situations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {situations.map((s) => (
            <span
              key={s}
              className="rounded-full border border-line px-3 py-1 text-label-sm text-text-muted"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function SourceSection({
  title,
  titleOriginal,
  author,
  translator,
  rightsBasis,
  sourceUrl,
}: {
  title: string;
  titleOriginal?: string | null;
  author?: string | null;
  translator?: string | null;
  rightsBasis: string;
  sourceUrl: string;
}) {
  return (
    <section className="mb-8 rounded-xl bg-chalk p-4">
      <h2 className="text-headline-sm text-primary">출처</h2>
      <div className="mt-2 space-y-1 text-label-sm text-text-muted">
        <p>
          작품: {title}
          {titleOriginal ? ` (${titleOriginal})` : ""}
        </p>
        {author && <p>저자: {author}</p>}
        {translator && <p>번역: {translator}</p>}
        <p>권리: {rightsBasis}</p>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-leaf hover:text-primary"
          >
            원문 보기 →
          </a>
        ) : null}
      </div>
    </section>
  );
}

function ReflectionPrompt() {
  return (
    <SurfaceCard className="border-l-4 border-l-clay">
      <h2 className="text-headline-sm text-primary">나의 회고와 겹쳐 보기</h2>
      <p className="mt-2 text-body-md text-text-muted">
        이 인물의 겉모습과 속마음이, 당신의 묵상 기록에서 어떻게 반복되는지
        확인해 보세요. 비슷한 열망을 살았던 사람이 이미 있었다는 사실이, 자신의
        서사를 더 입체적으로 만들어 줍니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          href="/lookback"
          className="inline-flex min-h-11 items-center gap-1 text-label-md text-leaf hover:text-primary"
        >
          회고 보기 →
        </Link>
        <Link
          href="/story-mirror/visualize"
          className="inline-flex min-h-11 items-center gap-1 text-label-md text-leaf hover:text-primary"
        >
          이미지로 기억하기 →
        </Link>
      </div>
    </SurfaceCard>
  );
}
