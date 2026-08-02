"use client";

import { cn } from "@/lib/utils";

export function TogetherImageGrid({
  urls,
  className,
  sizes = "(max-width: 768px) 100vw, 560px",
}: {
  urls: string[];
  className?: string;
  sizes?: string;
}) {
  if (!urls.length) return null;
  const count = Math.min(urls.length, 4);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-white/70",
        count === 1 && "aspect-[4/5] sm:aspect-[5/4]",
        count === 2 && "grid grid-cols-2 gap-0.5",
        count === 3 && "grid grid-cols-2 grid-rows-2 gap-0.5",
        count >= 4 && "grid grid-cols-2 grid-rows-2 gap-0.5",
        className,
      )}
    >
      {urls.slice(0, 4).map((url, index) => (
        // Community media is auth-gated and dynamic; plain img avoids next/image remote config.
        <img
          key={url}
          src={url}
          alt=""
          sizes={sizes}
          className={cn(
            "h-full w-full object-cover",
            count === 1 && "min-h-[220px]",
            count === 2 && "aspect-square min-h-[160px]",
            count === 3 && (index === 0 ? "row-span-2 min-h-full aspect-auto" : "aspect-square min-h-[120px]"),
            count >= 4 && "aspect-square min-h-[120px]",
          )}
          loading="lazy"
        />
      ))}
    </div>
  );
}
