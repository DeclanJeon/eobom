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

export function AppShell({
  children,
  title,
  action,
  bare = false,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  bare?: boolean;
}) {
  const pathname = usePathname();
  const showHeader = Boolean(title || action) && !bare;

  return (
    <div className="min-h-dvh bg-background text-text-main">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1024px] flex-col">
        {showHeader ? (
          <header className="sticky top-0 z-40 border-b border-[#E0DDD7]/70 bg-background/95 px-5 py-4 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Link
                  href="/today"
                  className="font-journal text-title-journal text-primary"
                >
                  이어봄
                </Link>
                {title ? (
                  <p className="mt-0.5 text-label-sm text-text-muted">{title}</p>
                ) : null}
              </div>
              {action}
            </div>
          </header>
        ) : null}

        <main className={cn("flex-1 px-5 pb-32", showHeader ? "py-5" : "pt-5")}>
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-[#E0DDD7]/60 bg-surface/95 shadow-[0_-4px_20px_0_rgba(0,0,0,0.04)] backdrop-blur-md">
          <div className="mx-auto flex max-w-[1024px] items-center justify-around px-2 pb-safe pt-2">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-w-[56px] flex-col items-center justify-center px-2 py-1 transition duration-200 active:scale-90",
                    active ? "text-primary" : "text-text-muted hover:text-primary",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  <span className="mt-1 text-label-sm">{item.label}</span>
                  <span
                    className={cn(
                      "mt-1 h-1 w-1 rounded-full",
                      active ? "bg-accent-terracotta" : "bg-transparent",
                    )}
                  />
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
