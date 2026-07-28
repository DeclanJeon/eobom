/**
 * Pure helpers for /entries/new?scripture= seeding.
 * Draft content always wins over query seed.
 */

export type EntrySeedDraftFields = {
  reflectionBody?: string | null;
  title?: string | null;
  scriptureRefsText?: string | null;
  gratitude?: string | null;
  question?: string | null;
  prayer?: string | null;
  actionStep?: string | null;
};

export function hasSubstantiveEntryDraft(
  values: EntrySeedDraftFields,
  bindingsCount: number,
): boolean {
  return (
    bindingsCount > 0 ||
    Boolean(values.reflectionBody?.trim()) ||
    Boolean(values.title?.trim()) ||
    Boolean(values.scriptureRefsText?.trim()) ||
    Boolean(values.gratitude?.trim()) ||
    Boolean(values.question?.trim()) ||
    Boolean(values.prayer?.trim()) ||
    Boolean(values.actionStep?.trim())
  );
}

/**
 * Whether the form should fetch/parse seedScripture into bindings.
 * - no seed → false
 * - draft has content → false (draft priority)
 * - empty form + seed → true
 */
export function shouldApplyScriptureSeed(input: {
  seedScripture?: string | null;
  values: EntrySeedDraftFields;
  bindingsCount: number;
}): boolean {
  if (!input.seedScripture?.trim()) return false;
  if (hasSubstantiveEntryDraft(input.values, input.bindingsCount)) return false;
  return true;
}
