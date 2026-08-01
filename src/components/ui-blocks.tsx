import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  description,
  className,
  titleClassName,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow ? <p className="text-label-sm text-accent-terracotta">{eyebrow}</p> : null}
      <h1 className={cn("text-display-lg text-primary", titleClassName)}>{title}</h1>
      {description ? (
        <p className="max-w-prose text-body-md text-text-muted">{description}</p>
      ) : null}
    </div>
  );
}
export function Breadcrumb({
  href,
  label,
  current,
  ariaLabel = "페이지 이동",
  className,
}: {
  href: string;
  label: string;
  current?: ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <nav className={cn("flex flex-wrap items-center gap-x-2 text-label-sm", className)} aria-label={ariaLabel}>
      <Link href={href} className="inline-flex min-h-11 items-center text-leaf transition hover:text-primary">
        ← {label}
      </Link>
      {current ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-text-muted">{current}</span>
        </>
      ) : null}
    </nav>
  );
}

export function SurfaceCard({
  children,
  className,
  tone = "light",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "dark";
  variant?: "default" | "flat" | "outlined";
}) {
  return (
    <div
      className={cn(
        "paper-card p-5",
        tone === "dark" && "surface-card-dark",
        variant === "flat" && "border-transparent bg-transparent shadow-none",
        variant === "outlined" && "bg-transparent shadow-none",
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
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <SurfaceCard className="text-center">
      {icon ? (
        <div className="mb-3 flex justify-center" aria-hidden="true">
          {icon}
        </div>
      ) : null}
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
      className="group flex min-h-11 items-start justify-between gap-3 border-b border-border/60 py-3 transition last:border-b-0 hover:bg-surface-low/50 active:scale-[0.98]"
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
