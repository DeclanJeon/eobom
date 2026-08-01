"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SoftBadge } from "@/components/ui-blocks";
import { TogetherActions } from "@/components/together-actions";
import { formatDateShort } from "@/lib/utils";

export type TogetherFeedItem = {
  id: string;
  publicBody: string;
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
  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.28, delay: Math.min(index * 0.04, 0.24) }
      }
      className="paper-card overflow-hidden bg-surface-shared/55 p-0 transition hover:border-accent-gold/35"
    >
      <Link href={`/together/${item.id}`} className="block px-5 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-bg-warm text-label-sm font-semibold text-gold-ink">
            {(item.pseudonym || "익").slice(0, 1)}
          </span>
          <p className="text-label-md text-primary">
            {item.pseudonym || "익명의 순례자"}
          </p>
          <span className="text-label-sm text-text-muted">
            {formatDateShort(item.publishedAt)}
          </span>
        </div>

        {item.scriptureRefs.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.scriptureRefs.map((ref) => (
              <span key={ref} className="chip-gold">
                {ref}
              </span>
            ))}
          </div>
        ) : null}

        <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-body-md leading-relaxed text-text-main">
          {item.publicBody}
        </p>

        {item.topicTags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.topicTags.map((tag) => (
              <SoftBadge key={tag}>#{tag}</SoftBadge>
            ))}
          </div>
        ) : null}
      </Link>

      <div className="mt-4 border-t border-border-subtle/70 px-5 py-3">
        <TogetherActions id={item.id} counts={item.counts} />
      </div>
    </motion.article>
  );
}
