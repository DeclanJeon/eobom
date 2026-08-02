"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SoftBadge } from "@/components/ui-blocks";
import { TogetherActions } from "@/components/together-actions";
import { TogetherImageGrid } from "@/components/together-image-grid";
import { formatDateShort } from "@/lib/utils";

export type TogetherFeedItem = {
  id: string;
  publicBody: string;
  imageUrls?: string[];
  scriptureRefs: string[];
  topicTags: string[];
  pseudonym: string;
  publishedAt: string | Date;
  counts: Record<string, number>;
};

export function TogetherFeedCard({
  item,
  index = 0,
}: {
  item: TogetherFeedItem;
  index?: number;
}) {
  const reduceMotion = useReducedMotion();
  const imageUrls = item.imageUrls ?? [];

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.28, delay: Math.min(index * 0.04, 0.24) }
      }
      className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-surface-shared/40 transition hover:border-accent-gold/35 hover:bg-surface-shared/70"
    >
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-warm text-label-md font-semibold text-gold-ink">
            {(item.pseudonym || "익").slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-label-md text-primary">
                {item.pseudonym || "익명의 순례자"}
              </p>
              <span className="text-label-sm text-text-muted">·</span>
              <span className="text-label-sm text-text-muted">
                {formatDateShort(item.publishedAt)}
              </span>
            </div>

            <Link href={`/together/${item.id}`} className="mt-2 block">
              {item.scriptureRefs.length ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {item.scriptureRefs.map((ref) => (
                    <span key={ref} className="chip-gold">
                      {ref}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="whitespace-pre-wrap text-[16px] leading-7 text-text-main sm:text-[17px]">
                {item.publicBody}
              </p>

              {imageUrls.length ? (
                <div className="mt-3">
                  <TogetherImageGrid urls={imageUrls} />
                </div>
              ) : null}

              {item.topicTags.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.topicTags.map((tag) => (
                    <SoftBadge key={tag}>#{tag}</SoftBadge>
                  ))}
                </div>
              ) : null}
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-border/60 px-4 py-2.5 sm:px-5">
        <TogetherActions id={item.id} counts={item.counts} />
      </div>
    </motion.article>
  );
}
