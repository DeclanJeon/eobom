"use client";

import dynamic from "next/dynamic";
import type { EntryFormValues } from "@/components/entry-form";

const EntryForm = dynamic(
  () => import("@/components/entry-form").then((module) => module.EntryForm),
  { ssr: false, loading: () => <p className="text-body-sm text-text-muted">기록 양식을 불러오는 중…</p> },
);

export function EntryFormClient({
  seedScripture,
  entryId,
  initial,
}: {
  seedScripture?: string;
  entryId?: string;
  initial?: EntryFormValues;
}) {
  return <EntryForm seedScripture={seedScripture} entryId={entryId} initial={initial} />;
}
