/**
 * 이야기 거울 상세 링크/문맥 유틸.
 *
 * 리스트·회고 브리지에서 본 개인화 서사(connection)를
 * 상세 페이지로 그대로 넘기기 위해 query context를 사용한다.
 */

import type { StoryConnection } from "@/lib/mimo";

export type StoryDetailContext = {
  connection?: string | null;
  differentPerspective?: string | null;
  sourceLabel?: string | null;
};

export type StoryMirrorItem = {
  key: string;
  visualStoryId?: string;
  title: string;
  source?: string | null;
  connection: string;
  differentPerspective?: string | null;
  href?: string;
  origin: "review" | "rag" | "card";
};
export function buildStoryVisualId(
  kind: StoryCorpusCandidate["kind"],
  id: string,
): string {
  return `${kind}:${id}`;
}

const MAX_QUERY_CHARS = 900;

function clip(value: string, max = MAX_QUERY_CHARS): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** 상세 페이지 href. 개인화 서사가 있으면 query로 동반한다. */
export function buildStoryDetailHref(
  id: string,
  ctx?: StoryDetailContext,
): string {
  const base = `/story-mirror/${id}`;
  if (!ctx) return base;

  const params = new URLSearchParams();
  if (ctx.connection?.trim()) params.set("c", clip(ctx.connection));
  if (ctx.differentPerspective?.trim()) {
    params.set("p", clip(ctx.differentPerspective, 400));
  }
  if (ctx.sourceLabel?.trim()) params.set("s", clip(ctx.sourceLabel, 200));

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** searchParams → 상세 문맥 */
export function parseStoryDetailContext(
  sp: Record<string, string | string[] | undefined> | undefined,
): StoryDetailContext {
  if (!sp) return {};
  return {
    connection: firstString(sp.c)?.trim() || null,
    differentPerspective: firstString(sp.p)?.trim() || null,
    sourceLabel: firstString(sp.s)?.trim() || null,
  };
}

/** 매칭용 정규화 */
export function normalizeStoryText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type StoryCorpusCandidate = {
  id: string;
  kind: "card" | "chunk";
  name?: string | null;
  title?: string | null;
  workTitle?: string | null;
  author?: string | null;
  themes?: string[];
};

/**
 * 회고 storyConnections 텍스트를 corpus 후보와 느슨하게 매칭한다.
 * 높은 점수일 때만 id를 부여한다.
 */
export function scoreStoryCandidate(
  query: { story: string; source?: string | null },
  candidate: StoryCorpusCandidate,
): number {
  const qStory = normalizeStoryText(query.story);
  const qSource = normalizeStoryText(query.source ?? "");
  if (!qStory) return 0;

  const name = normalizeStoryText(candidate.name ?? "");
  const title = normalizeStoryText(candidate.title ?? "");
  const work = normalizeStoryText(candidate.workTitle ?? "");
  const author = normalizeStoryText(candidate.author ?? "");

  let score = 0;

  if (name && (qStory === name || qStory.includes(name) || name.includes(qStory))) {
    score += 12;
  }
  if (title && (qStory === title || qStory.includes(title) || title.includes(qStory))) {
    score += 10;
  }
  if (work && (qStory.includes(work) || work.includes(qStory))) {
    score += 6;
  }

  // 토큰 겹침 (2글자 이상)
  const qTokens = qStory.split(" ").filter((t) => t.length >= 2);
  const hay = `${name} ${title} ${work}`.trim();
  for (const t of qTokens) {
    if (hay.includes(t)) score += 2;
  }

  if (qSource) {
    if (work && (qSource.includes(work) || work.includes(qSource))) score += 4;
    if (author && (qSource.includes(author) || author.includes(qSource))) score += 3;
    if (qSource.includes("성경") && (work.includes("성경") || work.includes("bible"))) {
      score += 2;
    }
  }

  // theme 힌트
  if (candidate.themes?.length) {
    for (const theme of candidate.themes) {
      const nt = normalizeStoryText(theme);
      if (nt.length >= 2 && qStory.includes(nt)) score += 1;
    }
  }

  return score;
}

export function pickBestStoryCandidate(
  query: { story: string; source?: string | null },
  candidates: StoryCorpusCandidate[],
  minScore = 8,
): StoryCorpusCandidate | null {
  let best: StoryCorpusCandidate | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const s = scoreStoryCandidate(query, c);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  if (!best || bestScore < minScore) return null;
  return best;
}

/** 회고 연결 배열 → 화면용 StoryMirrorItem (href optional) */
export function toReviewStoryItems(
  connections: StoryConnection[],
  candidates: StoryCorpusCandidate[] = [],
): StoryMirrorItem[] {
  return connections
    .filter((sc) => sc?.story?.trim() && sc?.connection?.trim())
    .slice(0, 3)
    .map((sc, i) => {
      const hit = pickBestStoryCandidate(
        { story: sc.story, source: sc.source },
        candidates,
      );
      const source = sc.source?.trim() || null;
      const href = hit
        ? buildStoryDetailHref(hit.id, {
            connection: sc.connection,
            differentPerspective: sc.differentPerspective,
            sourceLabel: source,
          })
        : undefined;
      return {
        visualStoryId: hit ? buildStoryVisualId(hit.kind, hit.id) : undefined,
        key: `review-${i}-${sc.story}`,
        title: sc.story.trim(),
        source,
        connection: sc.connection.trim(),
        differentPerspective: sc.differentPerspective?.trim() || null,
        href,
        origin: "review" as const,
      };
    });
}
