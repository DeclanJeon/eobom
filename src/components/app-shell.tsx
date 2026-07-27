"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CircleUserRound,
  Home,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/today", label: "오늘", icon: Home },
  { href: "/entries", label: "기록", icon: BookOpen },
  { href: "/reviews", label: "회고", icon: Sparkles },
  { href: "/together", label: "함께", icon: Users },
  { href: "/me", label: "내 정보", icon: CircleUserRound },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  title,
  action,
  bare = false,
  wide = false,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  bare?: boolean;
  /** wider reading column for desktop (default false = content max-w-3xl) */
  wide?: boolean;
}) {
  const pathname = usePathname();
  const showPageHeader = Boolean(title || action) && !bare;

  return (
    <div className="min-h-dvh bg-background text-text-main">
      {/* Desktop / tablet top site chrome */}
      <header className="sticky top-0 z-40 hidden border-b border-[#E0DDD7]/80 bg-background/90 backdrop-blur-md md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
              {nav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-lg px-3.5 py-2 text-sm font-medium transition duration-200",
                      active
                        ? "bg-primary/5 text-primary"
                        : "text-text-muted hover:bg-surface-low hover:text-primary",
                    )}
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
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
            >
              기록하기
            </Link>
            <Link
              href="/me"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E0DDD7] bg-white text-primary transition hover:border-accent-gold/40"
              aria-label="내 정보"
            >
              <CircleUserRound className="h-5 w-5" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile top bar (brand only — primary nav is bottom) */}
      <header className="sticky top-0 z-40 border-b border-[#E0DDD7]/70 bg-background/95 backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
            href="/entries/new"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
          >
            기록
          </Link>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6 lg:px-8",
          wide ? "max-w-6xl" : "max-w-3xl",
          // room for mobile bottom nav only
          "pb-28 md:pb-12",
        )}
      >
        {showPageHeader ? (
          <div className="flex items-end justify-between gap-4 border-b border-[#E0DDD7]/70 py-5 md:py-8">
            <div className="min-w-0">
              {title ? (
                <h1 className="truncate text-2xl font-semibold tracking-tight text-primary md:text-3xl">
                  {title}
                </h1>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        ) : null}

        <main className={cn(showPageHeader ? "py-5 md:py-8" : "py-5 md:py-8")}>
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation only */}
      <nav
        className="fixed bottom-0 left-0 z-50 w-full border-t border-[#E0DDD7]/70 bg-surface/95 pb-safe shadow-[0_-4px_20px_0_rgba(0,0,0,0.04)] backdrop-blur-md md:hidden"
        aria-label="모바일 메뉴"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1.5">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition active:scale-95",
                  active ? "text-primary" : "text-text-muted",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 h-1 w-1 rounded-full",
                    active ? "bg-accent-terracotta" : "bg-transparent",
                  )}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
