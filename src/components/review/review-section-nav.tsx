"use client";

import { useEffect, useRef, useState } from "react";

export type SpineItem = {
  id: string;
  number: string;
  title: string;
};

function useActiveAct(items: SpineItem[]) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const targets = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;

    const visible = new Map<string, number>();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        }
        if (visible.size === 0) return;
        let bestId = items[0]?.id ?? "";
        let bestRatio = -1;
        for (const it of items) {
          const ratio = visible.get(it.id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = it.id;
          }
        }
        setActiveId(bestId);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const el of targets) observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [items]);

  return activeId;
}

/**
 * 돌아보기 서사의 등뼈(spine) 목차.
 * variant="rail": 데스크톱 좌측 sticky rail — 세로 금실 + 막 노드(현재 막 빛남).
 * variant="bar":  모바일 hero 아래 가로 스크롤 커.
 * IntersectionObserver로 현재 읽는 막을 추적한다(I6).
 */
export function ReviewSectionNav({
  items,
  variant,
}: {
  items: SpineItem[];
  variant: "rail" | "bar";
}) {
  const activeId = useActiveAct(items);
  if (items.length === 0) return null;
  const activeIndex = items.findIndex((it) => it.id === activeId);

  if (variant === "bar") {
    return (
      <nav
        aria-label="회고 목차"
        className="mb-8 -mx-1 overflow-x-auto px-1 lg:hidden"
      >
        <ul className="flex min-w-max gap-2">
          {items.map((it) => {
            const active = it.id === activeId;
            return (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  aria-current={active ? "true" : undefined}
                  className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-label-sm transition-colors"
                  style={{
                    borderColor: active ? "var(--accent-gold)" : "var(--border)",
                    background: active
                      ? "color-mix(in oklab, var(--accent-gold) 14%, white)"
                      : "white",
                    color: active ? "var(--primary)" : "var(--text-muted)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span className="text-label-xs text-gold-ink">{it.number}</span>
                  {it.title}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  const progressRatio =
    items.length > 1 ? activeIndex / (items.length - 1) : 0;

  return (
    <aside aria-label="회고 목차" className="spine-rail hidden lg:block">
      <p className="text-eyebrow mb-5">이어봄의 거울</p>
      <nav className="relative">
        <span aria-hidden className="spine-line" />
        <span
          aria-hidden
          className="spine-progress"
          style={{ height: `calc((100% - 1rem) * ${progressRatio})` }}
        />
        <ul className="space-y-5">
          {items.map((it, idx) => {
            const passed = idx < activeIndex;
            const active = it.id === activeId;
            return (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  data-active={active}
                  data-passed={passed}
                  className="spine-node block text-label-sm leading-snug transition-colors"
                  style={{
                    color: active ? "var(--primary)" : "var(--text-muted)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span className="block text-label-xs text-gold-ink">
                    {it.number}
                  </span>
                  {it.title}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
