import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/lookback", label: "흐름", match: (p: string) => p === "/lookback" },
  {
    href: "/reviews",
    label: "회고",
    match: (p: string) => p === "/reviews" || p.startsWith("/reviews/"),
  },
  {
    href: "/story-mirror",
    label: "이야기",
    match: (p: string) =>
      p === "/story-mirror" ||
      (p.startsWith("/story-mirror/") && !p.startsWith("/story-mirror/visualize")),
  },
  {
    href: "/story-mirror/visualize",
    label: "시각화",
    match: (p: string) => p.startsWith("/story-mirror/visualize"),
  },
] as const;

export function LookbackTabs({ pathname }: { pathname: string }) {
  return (
    <nav
      className="mb-6 flex gap-1 overflow-x-auto border-b border-border/70 pb-px"
      aria-label="돌아보기 목차"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 rounded-t-lg px-3.5 py-2 text-label-md transition",
              active
                ? "border-b-2 border-primary text-primary"
                : "text-text-muted hover:text-primary",
            )}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
