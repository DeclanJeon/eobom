import { z } from "zod";

export const matchInputSchema = z.object({
  topicTags: z.array(z.string().min(1).max(40)).max(12),
  helpModes: z.array(z.string().min(1).max(40)).max(6),
  role: z.enum(["peer", "mentor", "prayer_partner"]).nullable(),
  scopeKey: z.literal("private"),
});

export const providerCandidateSchema = z.object({
  profileId: z.string().min(1),
  signalLabels: z.array(z.string().min(1).max(40)).max(6),
  reasonSummary: z.string().min(1).max(240),
});

export const providerResultSchema = z.array(providerCandidateSchema).max(3);

export type MatchInput = z.infer<typeof matchInputSchema>;
export type ProviderCandidate = z.infer<typeof providerCandidateSchema>;

/** Provider boundary: only structured, non-sensitive signals cross it. */
export interface CompanionMatchProvider {
  readonly name: string;
  generate(input: MatchInput, signal: AbortSignal): Promise<ProviderCandidate[]>;
}

export function validateProviderResult(value: unknown): ProviderCandidate[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((candidate) => providerCandidateSchema.safeParse(candidate))
    .filter((result): result is { success: true; data: ProviderCandidate } => result.success)
    .map((result) => result.data)
    .filter((candidate) =>
    candidate.signalLabels.every((label) => !/[\n\r]|https?:\/\/|www\.|전화번호|카톡|텔레그램|학대|폭력|응급|진단|처방|법률|자해|죽고 싶/i.test(label)) &&
    !/[\n\r]|https?:\/\/|www\.|전화번호|카톡|텔레그램|학대|폭력|응급|진단|처방|법률|자해|죽고 싶/i.test(candidate.reasonSummary),
    )
    .slice(0, 3);
}
