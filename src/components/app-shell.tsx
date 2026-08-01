"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CircleUserRound,
  Home,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const desktopNav = [
  { href: "/today", label: "오늘", icon: Home },
  { href: "/entries", label: "기록", icon: BookOpen },
  { href: "/lookback", label: "돌아보기", icon: Sparkles },
  { href: "/together", label: "함께", icon: Users },
] as const;

const mobileNavLeft = [
  { href: "/today", label: "오늘", icon: Home },
  { href: "/entries", label: "기록", icon: BookOpen },
] as const;

const mobileNavRight = [
  { href: "/lookback", label: "돌아보기", icon: Sparkles },
  { href: "/together", label: "함께", icon: Users },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/lookback") {
    return (
      pathname === "/lookback" ||
      pathname.startsWith("/lookback/") ||
      pathname.startsWith("/reviews") ||
      pathname.startsWith("/story-mirror")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  title,
  titleClassName,
  action,
  bare = false,
  wide = false,
  publicLogo = false,
}: {
  children: React.ReactNode;
  title?: string;
  titleClassName?: string;
  action?: React.ReactNode;
  bare?: boolean;
  /** wider content container for desktop (default false = content max-w-3xl) */
  wide?: boolean;
  /** keep the logo on the public landing page for unauthenticated surfaces */
  publicLogo?: boolean;
}) {
  const pathname = usePathname();
  const showPageHeader = Boolean(title || action) && !bare;

  return (
    <div className="min-h-dvh bg-background text-text-main">
      {/* Desktop / tablet top site chrome */}
      <header className="sticky top-0 z-40 hidden border-b border-border/80 bg-background/90 backdrop-blur-md md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-8">
            <Link
              href={publicLogo ? "/" : "/today"}
              className="flex min-h-11 shrink-0 items-center gap-2.5"
            >
              <img
                src="/logo.svg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg"
              />
              <span className="font-journal text-lg font-semibold tracking-tight text-primary">
                이어봄
              </span>
            </Link>
            <nav className="flex items-center gap-1" aria-label="주요 메뉴">
              {desktopNav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center rounded-lg border-b-2 border-transparent px-3.5 py-2 text-sm font-medium transition duration-200",
                      active
                        ? "border-accent-gold bg-primary/[0.06] text-primary"
                        : "text-text-muted hover:bg-surface-low hover:text-primary",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/entries/new"
              className="cta-primary px-4 text-sm"
            >
              새 묵상
            </Link>
            <Link
              href="/me"
              className="inline-flex min-h-11 w-11 items-center justify-center rounded-xl border border-border bg-white text-primary transition hover:border-accent-gold/40"
              aria-label="내 정보"
            >
              <CircleUserRound className="h-5 w-5" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href={publicLogo ? "/" : "/today"} className="flex min-h-11 items-center gap-2">
            <img
              src="/logo.svg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-md"
            />
            <span className="font-journal text-base font-semibold text-primary">
              이어봄
            </span>
          </Link>
          <Link
            href="/me"
            className="inline-flex min-h-11 w-11 items-center justify-center rounded-xl border border-border bg-white text-primary"
            aria-label="내 정보"
          >
            <CircleUserRound className="h-5 w-5" strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6 lg:px-8",
          "max-w-7xl",
          "pb-28 md:pb-12",
        )}
      >
        <div className={cn("mx-auto w-full", !wide && "max-w-3xl")}>
          {showPageHeader ? (
            <div className="flex items-end justify-between gap-4 border-b border-border/70 py-5 md:py-8">
              <div className="min-w-0">
                {title ? (
                  <h1
                    className={cn(
                      "truncate text-2xl font-semibold tracking-tight text-primary md:text-3xl",
                      titleClassName,
                    )}
                  >
                    {title}
                  </h1>
                ) : null}
              </div>
              {action ? <div className="shrink-0">{action}</div> : null}
            </div>
          ) : null}

          <main className="py-5 md:py-8">{children}</main>
        </div>
      </div>

      {/* Mobile bottom: 오늘 | 기록 | ＋ | 돌아보기 | 함께 */}
      <nav
        className="fixed bottom-0 left-0 z-50 w-full border-t border-border/70 bg-surface/95 pb-safe shadow-[0_-4px_20px_0_rgba(0,0,0,0.04)] backdrop-blur-md md:hidden"
        aria-label="모바일 메뉴"
      >
        <div className="mx-auto flex max-w-lg items-end justify-around px-1 pt-1.5">
          {mobileNavLeft.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition active:scale-[0.98]",
                  active ? "text-primary" : "text-text-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-label-xs font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <Link
            href="/entries/new"
            className="-mt-5 flex min-h-14 min-w-14 flex-col items-center justify-center"
            aria-label="새 묵상 쓰기"
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition active:scale-[0.98]">
              <Plus className="h-7 w-7" strokeWidth={2.25} />
            </span>
          </Link>

          {mobileNavRight.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition active:scale-[0.98]",
                  active ? "text-primary" : "text-text-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-label-xs font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
