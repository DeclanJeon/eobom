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
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-serif text-3xl leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      {description ? (
        <p className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function SurfaceCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[0_10px_30px_-24px_rgba(40,40,20,0.45)]",
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
      <p className="font-serif text-xl text-foreground">{title}</p>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </SurfaceCard>
  );
}

export function SoftBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-sage-light/70 px-2.5 py-0.5 text-xs font-medium text-sage-dark">
      {children}
    </span>
  );
}
