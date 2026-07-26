"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CircleUserRound,
  PenLine,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/today", label: "홈", icon: PenLine },
  { href: "/entries", label: "기록", icon: BookOpen },
  { href: "/reviews", label: "회고", icon: Sparkles },
  { href: "/together", label: "함께", icon: Users },
  { href: "/me", label: "나", icon: CircleUserRound },
];

export function AppShell({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const showHeader = Boolean(title || action);

  return (
    <div className="min-h-dvh bg-[var(--cream)] text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
        {showHeader ? (
          <header className="sticky top-0 z-20 border-b border-border/60 bg-[color-mix(in_oklab,var(--cream)_94%,white)]/95 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Link
                  href="/today"
                  className="font-serif text-lg tracking-tight text-primary"
                >
                  이어봄
                </Link>
                {title ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{title}</p>
                ) : null}
              </div>
              {action}
            </div>
          </header>
        ) : null}

        <main className={cn("flex-1 px-4 pb-28", showHeader ? "py-5" : "pt-6")}>
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-[color-mix(in_oklab,var(--cream)_96%,white)]/95 backdrop-blur-md">
          <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-1 py-2">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
