"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CollapseDisclosure({
  label,
  openLabel,
  children,
  className,
  buttonClassName,
}: {
  label: string;
  openLabel?: string;
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex min-h-11 w-full items-center justify-between text-left text-label-sm text-leaf transition hover:text-primary",
          buttonClassName,
        )}
      >
        <span>{open && openLabel ? openLabel : label}</span>
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
