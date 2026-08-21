import { NextResponse } from "next/server";
import { z } from "zod";
import { ACTION_STATUSES } from "@/lib/action-status";

export const VALIDATION = "VALIDATION" as const;

const scriptureBindingSchema = z.object({
  code: z.string().min(1),
  chapter: z.number().int().positive(),
  startVerse: z.number().int().positive(),
  endVerse: z.number().int().positive(),
  display: z.string().optional(),
  excerpt: z.string().optional(),
  translation: z.string().optional(),
  slug: z.string().optional(),
});

export const entryBodySchema = z.object({
  entryDate: z.string().optional(),
  title: z.string().nullable().optional(),
  scriptureRefs: z.array(z.string()).optional(),
  scriptureExcerpt: z.string().nullable().optional(),
  scriptureBindings: z.array(scriptureBindingSchema).max(5).optional(),
  reflectionBody: z.string(),
  gratitude: z.string().nullable().optional(),
  question: z.string().nullable().optional(),
  prayer: z.string().nullable().optional(),
  actionStep: z.string().nullable().optional(),
  emotions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  templateType: z.string().optional(),
  privateNote: z.string().nullable().optional(),
  cellShareSummary: z.string().nullable().optional(),
  shareVisibility: z.enum(["public", "private"]).optional(),
});

export const reviewCreateSchema = z.object({
  reportType: z.enum(["15d", "monthly", "quarterly", "yearly"]).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  excludedEntryIds: z.array(z.string()).optional(),
});

export const togetherCreateSchema = z.object({
  sourceEntryId: z.string().optional(),
  publicBody: z.string(),
  scriptureRefs: z.array(z.string()).max(5).optional(),
  topicTags: z.array(z.string()).max(5).optional(),
  imageUrls: z.array(z.string()).max(4).optional(),
  pseudonym: z.string().optional(),
});

export const togetherTagsSchema = z.object({
  publicBody: z.string(),
  scriptureRefs: z.array(z.string()).max(5).optional(),
});

export const mePatchSchema = z.object({
  displayName: z.string().optional(),
  preferredBibleTranslation: z.string().optional(),
  aiProcessingConsent: z.boolean().optional(),
  communityEnabled: z.boolean().optional(),
  pastTodayEnabled: z.boolean().optional(),
  storyMirrorEnabled: z.boolean().optional(),
  storyMirrorExternalConsent: z.boolean().optional(),
});

export const contactSchema = z.object({
  name: z.string(),
  email: z.string(),
  subject: z.string(),
  message: z.string(),
  kind: z.enum(["contact", "suggest"]).optional(),
  category: z.enum(["feature", "redesign", "improve", "other"]).optional(),
});

export const actionPatchSchema = z.object({
  status: z.enum(ACTION_STATUSES).optional(),
  reflectionOnResult: z.string().nullable().optional(),
});

/** 카드 한 줄 → quick 기록 (GATE-1). shareVisibility는 서버에서 private 강제되므로 스키마에 없음. */
export const quickEntrySchema = z.object({
  body: z.string().min(1, "한 줄 본문을 입력해 주세요.").max(500, "한 줄 본문은 500자 이내로 입력해 주세요."),
  scriptureRefs: z.array(z.string()).max(5).optional(),
  scriptureBindings: z.array(scriptureBindingSchema).max(5).optional(),
  scriptureExcerpt: z.string().max(500).nullable().optional(),
});

export const reactionSchema = z.object({
  reactionType: z.enum(["empathize", "pray", "same_scripture", "bookmark"]),
});

export const claimIntentSchema = z.object({
  slug: z.string().min(1),
});

function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "입력 값이 올바르지 않습니다.";
  const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}` || "입력 값이 올바르지 않습니다.";
}

export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: firstIssueMessage(parsed.error),
        code: VALIDATION,
      },
      { status: 400 },
    ),
  };
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "JSON 본문을 읽을 수 없습니다.", code: VALIDATION },
        { status: 400 },
      ),
    };
  }
  return parseWithSchema(schema, raw);
}
