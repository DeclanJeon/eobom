/**
 * Story Mirror — Visualization Fallback
 *
 * codex-imagen API 장애 시 이미지 없이 데이터 기반 그래프를 HTML/CSS로 렌더링한다.
 */

"use client";

type TimelinePoint = { date: string; count: number; themes: string[]; emotions: string[] };
type NetworkNode = { id: string; label: string; weight: number };
type NetworkEdge = { source: string; target: string; weight: number };
type EmotionPoint = { date: string; emotions: Record<string, number> };
type MatchLink = { entryDate: string; entryExcerpt: string; cardName: string; workTitle: string; matchThemes: string[] };

const EMOTION_COLORS: Record<string, string> = {
  "기쁨": "#c5a059",
  "슬픔": "#b36a5e",
  "두려움": "#5c574f",
  "감사": "#061b0e",
  "희망": "#295c3b",
  "불안": "#8a7a6a",
  "후회": "#b36a5e",
  "인내": "#061b0e",
};

export function TimelineFallback({ data }: { data: TimelinePoint[] }) {
  if (data.length === 0) return <div className="p-4 text-label-sm text-text-muted">데이터 없음</div>;

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="rounded-xl bg-chalk p-4">
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t"
              style={{
                height: `${(d.count / maxCount) * 100}px`,
                backgroundColor: EMOTION_COLORS[d.emotions[0]] ?? "#061b0e",
                opacity: 0.7,
              }}
            />
            <span className="text-[10px] text-text-muted">{d.date.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NetworkFallback({ nodes, edges }: { nodes: NetworkNode[]; edges: NetworkEdge[] }) {
  if (nodes.length === 0) return <div className="p-4 text-label-sm text-text-muted">데이터 없음</div>;

  return (
    <div className="rounded-xl bg-chalk p-4">
      <svg viewBox="0 0 400 300" className="w-full">
        {edges.map((e, i) => {
          const s = nodes.find((n) => n.id === e.source);
          const t = nodes.find((n) => n.id === e.target);
          if (!s || !t) return null;
          const si = nodes.indexOf(s);
          const ti = nodes.indexOf(t);
          const x1 = 50 + (si % 5) * 70;
          const y1 = 50 + Math.floor(si / 5) * 70;
          const x2 = 50 + (ti % 5) * 70;
          const y2 = 50 + Math.floor(ti / 5) * 70;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#061b0e" strokeWidth={1} opacity={0.3} />;
        })}
        {nodes.map((n, i) => {
          const x = 50 + (i % 5) * 70;
          const y = 50 + Math.floor(i / 5) * 70;
          const r = Math.max(8, Math.min(20, n.weight * 3));
          return (
            <g key={n.id}>
              <circle cx={x} cy={y} r={r} fill="#061b0e" opacity={0.6} />
              <text x={x} y={y + r + 12} textAnchor="middle" fontSize={8} fill="#5c574f">
                {n.label.length > 6 ? n.label.slice(0, 6) + "…" : n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function EmotionFallback({ data }: { data: EmotionPoint[] }) {
  if (data.length === 0) return <div className="p-4 text-label-sm text-text-muted">데이터 없음</div>;

  const allEmotions = [...new Set(data.flatMap((d) => Object.keys(d.emotions)))];

  return (
    <div className="rounded-xl bg-chalk p-4">
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-end gap-px">
            {allEmotions.map((e) => (
              <div
                key={e}
                className="w-full"
                style={{
                  height: `${(d.emotions[e] ?? 0) * 8}px`,
                  backgroundColor: EMOTION_COLORS[e] ?? "#999",
                  opacity: 0.6,
                }}
              />
            ))}
            <span className="text-[10px] text-text-muted">{d.date.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {allEmotions.map((e) => (
          <span key={e} className="flex items-center gap-1 text-[10px] text-text-muted">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: EMOTION_COLORS[e] ?? "#999" }} />
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StoryMatchFallback({ links }: { links: MatchLink[] }) {
  if (links.length === 0) return <div className="p-4 text-label-sm text-text-muted">데이터 없음</div>;

  return (
    <div className="rounded-xl bg-chalk p-4">
      <div className="space-y-2">
        {links.slice(0, 6).map((l, i) => (
          <div key={i} className="flex items-center gap-2 text-label-sm">
            <span className="min-w-[80px] text-text-muted">{l.entryDate}</span>
            <span className="text-leaf">—</span>
            <span className="text-primary">{l.cardName}</span>
            <span className="text-text-muted">({l.workTitle})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
