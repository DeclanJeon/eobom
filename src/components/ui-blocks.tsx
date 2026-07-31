import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 space-y-2">
      {eyebrow ? <p className="text-label-sm text-accent-terracotta">{eyebrow}</p> : null}
      <h1 className="text-display-lg text-primary">{title}</h1>
      {description ? (
        <p className="max-w-prose text-body-md text-text-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function SurfaceCard({
  children,
  className,
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "paper-card p-5",
        tone === "dark" && "surface-card-dark",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <SurfaceCard className="text-center">
      <p className="text-headline-sm text-primary">{title}</p>
      {description ? (
        <p className="mt-2 text-body-md text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </SurfaceCard>
  );
}

export function SoftBadge({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}

export function EntryRow({
  href,
  date,
  title,
  excerpt,
}: {
  href: string;
  date: string;
  title: string;
  excerpt?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-11 items-start justify-between gap-3 border-b border-border/60 py-3 transition last:border-b-0 hover:bg-surface-low/50 active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <p className="text-label-xs text-text-muted">{date}</p>
        <p className="mt-0.5 truncate text-label-md text-primary group-hover:text-leaf">
          {title}
        </p>
        {excerpt ? (
          <p className="mt-0.5 line-clamp-1 text-label-sm text-text-muted">
            {excerpt}
          </p>
        ) : null}
      </div>
      <span className="mt-1 shrink-0 text-label-sm text-text-muted group-hover:text-leaf">
        ›
      </span>
    </Link>
  );
}
