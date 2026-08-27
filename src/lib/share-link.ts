/**
 * src/lib/share-link.ts
 * 한 사람에게 건네기 — Journey F MVP (설계 02§8, E7-1).
 *
 * 계약:
 * - 공유 내용은 사용자가 고른 한 문장 + 선택 성구뿐. 원문(reflectionBody 등)은
 *   이 서비스/뷰어 어디에도 저장·반환하지 않는다.
 * - 링크는 만료(expiry) 또는 철회(revoke)될 때까지 유효. resolve는 만료/철회를
 *   동일하게 null로 처리해 존재 여부를 누설하지 않는다.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { parseJsonArray, toJsonArray } from "@/lib/utils";

export const SHARE_SENTENCE_MAX_CHARS = 300;
export const SHARE_SCRIPTURE_REFS_MAX = 5;
/** 만료 옵션(일). null = 무기한(철회 전까지). */
export const SHARE_EXPIRY_CHOICES = [7, 30] as const;
export type ShareExpiryDays = (typeof SHARE_EXPIRY_CHOICES)[number] | null;

export type ShareLinkDto = {
  id: string;
  entryId: string;
  token: string;
  selectedSentence: string;
  scriptureRefs: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

function toDto(row: {
  id: string;
  entryId: string;
  token: string;
  selectedSentence: string;
  scriptureRefsJson: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}): ShareLinkDto {
  return {
    id: row.id,
    entryId: row.entryId,
    token: row.token,
    selectedSentence: row.selectedSentence,
    scriptureRefs: parseJsonArray(row.scriptureRefsJson),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function newShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createShareLink(input: {
  userId: string;
  entryId: string;
  selectedSentence: string;
  scriptureRefs?: string[];
  expiresInDays?: ShareExpiryDays;
}): Promise<ShareLinkDto> {
  const sentence = input.selectedSentence.trim();
  if (!sentence || sentence.length > SHARE_SENTENCE_MAX_CHARS) {
    throw new Error(`공유 문장은 1~${SHARE_SENTENCE_MAX_CHARS}자여야 합니다.`);
  }
  const refs = (input.scriptureRefs ?? [])
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, SHARE_SCRIPTURE_REFS_MAX);

  // 소유권 검증 — 타인 기록 share 불가(IDOR).
  const entry = await db.reflectionEntry.findFirst({
    where: { id: input.entryId, userId: input.userId, deletedAt: null },
    select: { id: true },
  });
  if (!entry) throw new Error("기록을 찾을 수 없습니다.");

  const expiresAt =
    input.expiresInDays == null
      ? null
      : new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

  const created = await db.entryShareLink.create({
    data: {
      userId: input.userId,
      entryId: input.entryId,
      token: newShareToken(),
      selectedSentence: sentence,
      scriptureRefsJson: toJsonArray(refs),
      expiresAt,
    },
  });
  return toDto(created);
}

export async function revokeShareLink(userId: string, linkId: string): Promise<boolean> {
  const link = await db.entryShareLink.findFirst({
    where: { id: linkId, userId },
    select: { id: true, revokedAt: true },
  });
  if (!link) return false;

  if (!link.revokedAt) {
    await db.entryShareLink.update({ where: { id: link.id }, data: { revokedAt: new Date() } });
  }
  return true;
}

export async function listShareLinks(userId: string): Promise<ShareLinkDto[]> {
  const rows = await db.entryShareLink.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toDto);
}

export async function listEntryShareLinks(userId: string, entryId: string): Promise<ShareLinkDto[]> {
  const rows = await db.entryShareLink.findMany({
    where: { userId, entryId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map(toDto);
}

export type ResolvedShare = {
  selectedSentence: string;
  scriptureRefs: string[];
};

/** 공개 뷰어용 resolve — 원문 필드는 존재하지 않는 것과 같다(저장 안 함). */
export async function resolveShareLink(token: string, now = new Date()): Promise<ResolvedShare | null> {
  if (!token || token.length > 128) return null;
  const row = await db.entryShareLink.findUnique({
    where: { token },
    select: { selectedSentence: true, scriptureRefsJson: true, expiresAt: true, revokedAt: true },
  });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt <= now) return null;
  return {
    selectedSentence: row.selectedSentence,
    scriptureRefs: parseJsonArray(row.scriptureRefsJson),
  };
}
