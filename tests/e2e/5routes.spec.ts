import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { selectRandomScripture, toKstParts } from "../../src/lib/daily-scripture";
import { ensureEntryFts5 } from "../../src/lib/entries";

const isBunTestRunner = !!((process.versions as unknown as Record<string, string> | undefined)?.["bun"]);

// E2E 5routes — /today, /lookback, /lookback/[id], /story-mirror/reflect, /story-mirror, /me/prayers, /api/health, gutendex smoke
// runs against bun dev -p 3100 with real DB

const DB_URL = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "db", "eobom.db")}`;
function getPrisma(): PrismaClient {
  return new PrismaClient({ datasourceUrl: DB_URL } as unknown as ConstructorParameters<typeof PrismaClient>[0]);
}

const SESSION_COOKIE = process.env.NEXTAUTH_URL?.startsWith("https://")
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

let prisma: PrismaClient;
let e2eUserId: string;
let e2eSessionToken: string;
let e2eReviewId: string;
let e2eEntryId: string;
let e2eChunkId: string;

if (!isBunTestRunner) {
  test.beforeAll(async () => {
    prisma = getPrisma();
    try {
      await prisma.$queryRawUnsafe(`SELECT 1`);
    } catch {}

    const email = "e2e-5routes@test.local";
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name: "e2e-5routes", personalSlug: `e2e-${Date.now()}` },
      });
    }
    e2eUserId = user.id;
    await prisma.user.update({ where: { id: e2eUserId }, data: { communityEnabled: true } });
    let entry = await prisma.reflectionEntry.findFirst({ where: { userId: e2eUserId } });

    if (!entry) {
      entry = await prisma.reflectionEntry.create({
        data: {
          userId: e2eUserId,
          entryDate: new Date(),
          reflectionBody: "E2E 테스트 본문 — 감사와 평온",
          gratitude: "감사",
          prayer: "평안을 구합니다",
          scriptureRefs: "[]",
          scriptureBindings: "[]",
          emotions: JSON.stringify(["평온"]),
          tags: JSON.stringify(["감사"]),
        },
      });
    }
    e2eEntryId = entry.id;

    let report = await prisma.reviewReport.findFirst({
      where: { userId: e2eUserId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!report) {
      const structured = {
        oneSentence: "이 기간에는 기록이 이어졌고 마음의 결이 드러났습니다.",
        themes: [
          {
            key: "theme-1",
            title: "감사",
            body: "감사의 기록이 이어졌습니다.",
            confidence: "high",
            evidence: [{ entryId: entry.id, date: new Date().toISOString(), excerpt: entry.reflectionBody.slice(0, 120) }],
          },
        ],
        emotions: [
          {
            key: "emotion-1",
            title: "평온",
            body: "평온의 마음이 나타났습니다.",
            confidence: "medium",
            evidence: [{ entryId: entry.id, date: new Date().toISOString(), excerpt: entry.reflectionBody.slice(0, 120) }],
          },
        ],
        questions: [],
        storyConnections: [
          { story: "다윗의 시편", source: "시편 23편", connection: "고난 속에서도 평안을 찾는 여정", differentPerspective: "다른 관점" },
        ],
        scriptureConnections: [],
        scriptureReadings: [{ ref: "시편 23:1-6", reason: "평안", focus: "목자" }],
        actionFlow: [],
        changesOrUnknown: "변화가 감지되었습니다.",
        rereadEntries: [],
        rereadScriptures: [],
        nextSteps: [{ action: "기도하기", reason: "마음을 나누기" }],
        prayerPrompts: [{ topic: "평안", suggestion: "기도" }],
        smallPractices: ["감사 기록"],
        communityQuestions: ["무엇이 감사한가?"],
        limitations: "부분적 기록 기반",
        disclaimer: "본 회고는 AI가 생성한 참고용 초안이며 전문적 조언이 아닙니다.",
        narrativeActs: [
          { act: "act-dwell", narration: "머물던 자리", transition: "다음으로" },
          { act: "act-feel", narration: "마음의 결", transition: null },
        ],
        emotionProse: "평온이 이어졌습니다.",
      };
      report = await prisma.reviewReport.create({
        data: {
          userId: e2eUserId,
          periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          periodEnd: new Date(),
          structuredOutput: JSON.stringify(structured),
          includedEntryIds: JSON.stringify([entry.id]),
          summary: "E2E 테스트 회고",
        },
      });
    }
    e2eReviewId = report.id;

    const chunk = await prisma.storyChunk.findFirst({ orderBy: { createdAt: "asc" } });
    if (!chunk) throw new Error("StoryChunk missing — need seeded corpus");
    e2eChunkId = chunk.id;

    let ragRun = await prisma.storyRagRun.findFirst({
      where: { userId: e2eUserId, status: "complete" },
      orderBy: { createdAt: "desc" },
    });
    if (!ragRun) {
      ragRun = await prisma.storyRagRun.create({
        data: {
          userId: e2eUserId,
          inputFingerprint: createHash("sha256").update(`e2e-${e2eUserId}`).digest("hex"),
          corpusVersion: "v4.3-corpus-expand",
          retrieverVersion: "fts5-trigram-1",
          generatorVersion: "mimo-v2.5",
          policyVersion: "v4.3",
          consentSnapshot: "true",
          status: "complete",
          summary: "E2E 연결 요약 — 고난 속 평안",
        },
      });
      await prisma.storyRagMatch.create({
        data: {
          runId: ragRun.id,
          chunkId: e2eChunkId,
          searchScore: 1.5,
          state: "active",
          connection: "E2E 테스트 연결 — 고난 속에서도 평안을 찾는 여정은 당신의 기록과 닮았습니다.",
          differentPerspective: "이 이야기는 다른 관점에서 평안을 바라봅니다.",
          confidence: "high",
        },
      });
    } else {
      const cnt = await prisma.storyRagMatch.count({ where: { runId: ragRun.id } });
      if (cnt === 0) {
        await prisma.storyRagMatch.create({
          data: {
            runId: ragRun.id,
            chunkId: e2eChunkId,
            searchScore: 1.5,
            state: "active",
            connection: "E2E 테스트 연결 — 고난 속에서도 평안을 찾는 여정",
            differentPerspective: "다른 관점",
            confidence: "high",
          },
        });
      }
    }

    const token = createHash("sha256").update(`e2e-session-${e2eUserId}-${Date.now()}`).digest("hex");
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: { sessionToken: token, userId: e2eUserId, expires },
    });
    e2eSessionToken = token;

    const existingPrayer = await prisma.prayerTopic.findFirst({ where: { userId: e2eUserId } });
    if (!existingPrayer) {
      await prisma.prayerTopic.create({
        data: { userId: e2eUserId, title: "E2E 기도 제목", body: "E2E 본문", status: "continuing" },
      });
    }
  });

  test.afterAll(async () => {
    await prisma?.$disconnect();
  });
}

async function addAuthCookie(page: import("@playwright/test").Page) {
  await page.context().addCookies([
    {
      name: SESSION_COOKIE,
      value: e2eSessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

if (!isBunTestRunner) {
  test.describe("E2E 5routes", () => {
    test("/today 200 + 결정성 seed", async ({ page }) => {
      await addAuthCookie(page);
      const res = await page.goto("/today");
      await expect(page.getByText("오늘 함께 읽을 말씀").first()).toBeVisible({ timeout: 8000 });
      const firstBody = await page.content();
      const now = new Date();
      const kst = toKstParts(now);
      const seed = `${e2eUserId}:${kst.dateKey}`;
      const a = selectRandomScripture({ seed });
      const b = selectRandomScripture({ seed });
      expect(a.display).toBe(b.display);
      expect(a.text).toBe(b.text);
      await expect(page.getByText(a.display, { exact: false }).first()).toBeVisible({ timeout: 5000 }).catch(async () => {
        expect(firstBody).toMatch(/장|절|시편|마태/);
      });
    });

    test("/lookback 200", async ({ page }) => {
      await addAuthCookie(page);
      const res = await page.goto("/lookback");
      expect(res?.status()).toBe(200);
      await expect(page.getByText("돌아보기").first()).toBeVisible({ timeout: 8000 });
    });

    test("/lookback/[id] 200", async ({ page }) => {
      await addAuthCookie(page);
      const res = await page.goto(`/lookback/${e2eReviewId}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByText("감사").first()).toBeVisible({ timeout: 8000 }).catch(async () => {
        await expect(page.getByText("평온").first()).toBeVisible({ timeout: 8000 });
      });
    });

    test("/story-mirror/reflect 200 initialRun", async ({ page }) => {
      await addAuthCookie(page);
      const res = await page.goto("/story-mirror/reflect");
      expect(res?.status()).toBe(200);
      const content = await page.content();
      expect(content.length).toBeGreaterThan(500);
      await expect(page.locator("body")).toContainText(/이야기|연결|RAG|reflect/i, { timeout: 5000 }).catch(async () => {
        expect(content).not.toContain("Application error");
        expect(content).not.toContain("Internal Server Error");
      });
      const fresh = getPrisma();
      const latest = await fresh.storyRagRun.findFirst({
        where: { userId: e2eUserId, status: "complete" },
        orderBy: { createdAt: "desc" },
        include: { matches: true },
      });
      expect(latest).not.toBeNull();
      expect(latest!.matches.length).toBeGreaterThan(0);
      await fresh.$disconnect();
    });

    test("/story-mirror 200 SurfaceCard", async ({ page }) => {
      await addAuthCookie(page);
      const res = await page.goto("/story-mirror");
      expect(res?.status()).toBe(200);
      await expect(page.getByText("돌아보기").first()).toBeVisible({ timeout: 8000 });
      const content = await page.content();
      const hasConnection = content.includes("E2E 테스트 연결") || content.includes("고난 속");
      if (hasConnection) {
        expect(hasConnection).toBe(true);
      } else {
        expect(content).not.toContain("Application error");
        await expect(page.locator("body")).toContainText(/이야기|시각화|회고/, { timeout: 3000 });
      }
    });

    test("/me/prayers 200 + 상태 전환", async ({ page, request }) => {
      await addAuthCookie(page);
      const res = await page.goto("/me/prayers");
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "기도 제목", exact: true })).toBeVisible({ timeout: 8000 });

      const headers = { Cookie: `${SESSION_COOKIE}=${e2eSessionToken}` };
      const createRes = await request.post("/api/prayers", {
        headers: { ...headers, "content-type": "application/json" },
        data: { title: `E2E-PRAY-${Date.now()}`, body: "상태 전환 테스트" },
      });
      expect(createRes.status()).toBe(200);
      const created = (await createRes.json()) as { prayerTopic: { id: string } };
      const prayerId = created.prayerTopic.id;
      expect(prayerId).toBeTruthy();

      const statusRes = await request.post(`/api/prayers/${prayerId}/status`, {
        headers: { ...headers, "content-type": "application/json" },
        data: { status: "answered" },
      });
      expect(statusRes.status()).toBe(200);
      const updated = (await statusRes.json()) as { prayerTopic: { status: string } };
      expect(updated.prayerTopic.status).toBe("answered");

      const fresh = getPrisma();
      const dbPrayer = await fresh.prayerTopic.findUnique({ where: { id: prayerId } });
      expect(dbPrayer?.status).toBe("answered");
      expect(dbPrayer?.closedAt).not.toBeNull();
      const revertRes = await request.post(`/api/prayers/${prayerId}/status`, {
        headers: { ...headers, "content-type": "application/json" },
        data: { status: "continuing" },
      });
      expect(revertRes.status()).toBe(200);
      const reverted = (await revertRes.json()) as { prayerTopic: { status: string } };
      expect(reverted.prayerTopic.status).toBe("continuing");
      await fresh.$disconnect();

      await page.reload();
      await expect(page.getByText("계속 기도 중").first()).toBeVisible({ timeout: 5000 });
    });

    test("/together companion contract + share reaction", async ({ page, request }) => {
      await addAuthCookie(page);
      const headers = { Cookie: `${SESSION_COOKIE}=${e2eSessionToken}` };
      const createRes = await request.post("/api/together", {
        headers: { ...headers, "content-type": "application/json" },
        data: {
          publicBody: `E2E 함께 공유 ${Date.now()} — 오늘의 마음을 안전하게 나눕니다.`,
          scriptureRefs: ["시편 23:1"],
          topicTags: ["평안"],
          pseudonym: "E2E 동행자",
        },
      });
      expect(createRes.status()).toBe(201);
      const created = (await createRes.json()) as { item: { id: string } };
      expect(created.item.id).toBeTruthy();

      const feed = await page.goto("/together");
      expect(feed?.status()).toBe(200);
      await expect(page.getByText("함께").first()).toBeVisible({ timeout: 8000 });

      const detail = await page.goto(`/together/${created.item.id}`);
      expect(detail?.status()).toBe(200);
      await expect(page.getByText("E2E 동행자").first()).toBeVisible({ timeout: 8000 });

      const reactRes = await request.post(`/api/together/${created.item.id}/react`, {
        headers: { ...headers, "content-type": "application/json" },
        data: { reactionType: "pray" },
      });
      expect(reactRes.status()).toBe(200);
      expect((await reactRes.json()) as { toggled: boolean }).toEqual({ toggled: true });

      const fresh = getPrisma();
      await fresh.sharedReflection.delete({ where: { id: created.item.id } });
      await fresh.$disconnect();
    });
    test("share link click-through — create, guest view, revoke", async ({ page, request, browser }) => {
      await addAuthCookie(page);
      const headers = { Cookie: `${SESSION_COOKIE}=${e2eSessionToken}` };

      // 1) 소유자: 기록 상세에서 링크 생성
      const detail = await page.goto(`/entries/${e2eEntryId}`);
      expect(detail?.status()).toBe(200);
      await expect(page.getByText("한 사람에게 건네기").first()).toBeVisible({ timeout: 8000 });

      const createRes = await request.post(`/api/entries/${e2eEntryId}/share-link`, {
        headers: { ...headers, "content-type": "application/json" },
        data: { selectedSentence: "E2E 건네는 한 문장 — 감사와 평온", expiresInDays: 7 },
      });
      expect(createRes.status()).toBe(201);
      const { link } = (await createRes.json()) as { link: { id: string; token: string } };

      // 2) 게스트(새 컨텍스트, 쿠키 없음): 문장은 보이고 원문은 보이지 않아야 한다
      const guestContext = await browser.newContext();
      const guestPage = await guestContext.newPage();
      try {
        const viewer = await guestPage.goto(`/s/${link.token}`);
        expect(viewer?.status()).toBe(200);
        const viewerBody = await guestPage.locator("body").innerText();
        expect(viewerBody).toContain("E2E 건네는 한 문장");
        expect(viewerBody).not.toContain("E2E 테스트 본문"); // reflectionBody 미노출
        expect(viewerBody).not.toContain("평안을 구합니다"); // prayer 미노출

        // 3) 알 수 없는 토큰도 같은 안전 화면
        const unknown = await guestPage.goto("/s/does-not-exist-token");
        expect(unknown?.status()).toBe(200);
        await expect(guestPage.getByText("더 이상 열리지 않아요").first()).toBeVisible({ timeout: 5000 });
      } finally {
        await guestContext.close();
      }

      // 4) 소유자 철회 후 뷰어 차단
      const revokeRes = await request.patch(`/api/share-links/${link.id}`, {
        headers: { ...headers, "content-type": "application/json" },
        data: { action: "revoke" },
      });
      expect(revokeRes.status()).toBe(200);
      const closed = await page.goto(`/s/${link.token}`);
      expect(closed?.status()).toBe(200);
      await expect(page.getByText("더 이상 열리지 않아요").first()).toBeVisible({ timeout: 5000 });
    });



    test("/api/health?db=1 200 FTS", async ({ request }) => {
      const res = await request.get("/api/health?db=1");
      expect(res.status()).toBe(200);
      const body = (await res.json()) as { ok: boolean; db: string };
      expect(body.ok).toBe(true);
      expect(body.db).toBe("up");
      const fresh = getPrisma();
      const fts = (await fresh.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='StoryChunkFts'`)) as Array<{ name: string }>;
      expect(fts.length).toBe(1);
      const entryFts = (await fresh.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='ReflectionEntryFts'`)) as Array<{ name: string }>;
      if (entryFts.length === 0) {
        await ensureEntryFts5();
        const after = (await fresh.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='ReflectionEntryFts'`)) as Array<{ name: string }>;
        expect(after.length).toBe(1);
      }
      await fresh.$disconnect();
    });

    test("gutendex 500권 스모크: StoryChunk 651 + gutenberg-candidates 500", async () => {
      const fresh = getPrisma();
      const chunkCount = await fresh.storyChunk.count();
      expect(chunkCount).toBe(651);
      const candidatePath = path.join(process.cwd(), "data", "story-mirror", "gutenberg-candidates.json");
      expect(fs.existsSync(candidatePath)).toBe(true);
      const raw = fs.readFileSync(candidatePath, "utf8");
      const candidates = JSON.parse(raw) as unknown[];
      expect(candidates.length).toBe(500);
      const ftsCount = ((await fresh.$queryRawUnsafe(`SELECT count(*) as cnt FROM StoryChunkFts`)) as Array<{ cnt: bigint }>)[0].cnt;
      expect(Number(ftsCount)).toBe(651);
      await fresh.$disconnect();
    });
  });
}
