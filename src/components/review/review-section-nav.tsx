"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type TocItem = { id: string; label: string };

export function ReviewSectionNav({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (!items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  const mobileLink = (it: TocItem) => (
    <a
      key={it.id}
      href={`#${it.id}`}
      aria-current={active === it.id ? "true" : undefined}
      className={cn(
        "whitespace-nowrap rounded-full px-3 py-1.5 text-label-sm transition motion-reduce:transition-none",
        active === it.id
          ? "bg-primary/5 text-primary"
          : "text-text-muted hover:text-primary",
      )}
      style={
        active === it.id
          ? { boxShadow: "inset 0 -2px 0 0 var(--accent-gold)" }
          : undefined
      }
    >
      {it.label}
    </a>
  );

  return (
    <>
      <nav
        aria-label="회고 목차"
        className="-mx-4 overflow-x-auto px-4 pb-1 lg:hidden"
      >
        <div className="flex gap-2">{items.map(mobileLink)}</div>
      </nav>
      <nav aria-label="회고 목차" className="hidden lg:sticky lg:top-24 lg:block">
        <ul className="space-y-1 border-l border-border pl-3">
          {items.map((it) => (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-current={active === it.id ? "true" : undefined}
                className={cn(
                  "block py-1 text-label-sm transition motion-reduce:transition-none",
                  active === it.id
                    ? "text-primary"
                    : "text-text-muted hover:text-primary",
                )}
                style={
                  active === it.id
                    ? {
                        borderLeft: "2px solid var(--accent-gold)",
                        marginLeft: "-3px",
                        paddingLeft: "11px",
                      }
                    : undefined
                }
              >
                {it.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
