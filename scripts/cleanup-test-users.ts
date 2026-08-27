/**
 * 테스트 계정 정리 — 운영 DB 정화 (2026-08-27 QA)
 *
 * 보존:
 *  - 실사용자 (syas0301@gmail.com = Declan)
 *  - 기록이 1건이라도 있는 유저 (익명 "민서" — 실사용 흔적)
 *    ※ 단, 테스트 픽스처가 만든 기록은 예외로 한다 (아래 제외 조건 참고).
 *
 * 삭제:
 *  - 테스트 픽스처 이메일: @test.local, @example.com
 *  - 이번 QA 세션에서 만든 계정: slug가 diag-, qa-, ab-, abk- 로 시작하는 행
 *  - displayName 없는 익명 더미 (cmt9jzx* slug, account-link 테스트 잔여)
 *
 * 규칙: 기록(ReflectionEntry)이 1건이라도 있는 유저는 예외 없이 보존한다.
 *       (단, 그 기록이 QA 시나리오용 더미 기록인 경우에도 보존 — 안전 우선)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: `file:${process.cwd()}/db/eobom.db`,
});

const TEST_EMAIL_RE = /@(test\.local|example\.com)$/i;
const QA_SLUG_RE = /^(diag-|qa-|ab-|abk-)/;

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      personalSlug: true,
      _count: { select: { reflectionEntries: true } },
    },
  });

  const deleteIds: string[] = [];
  const keep: Array<{ who: string; why: string }> = [];

  for (const u of users) {
    const email = u.email ?? "";
    const isFixtureEmail = TEST_EMAIL_RE.test(email);
    const isQaSession = QA_SLUG_RE.test(u.personalSlug);
    const isDummyAnon = !u.email && !u.displayName;
    const hasEntries = u._count.reflectionEntries > 0;

    let shouldDelete = false;
    let reason = "";
    if (isFixtureEmail) {
      shouldDelete = true;
      reason = "테스트 픽스처 이메일";
    } else if (isQaSession) {
      shouldDelete = true;
      reason = "QA 세션 계정";
    } else if (isDummyAnon) {
      shouldDelete = true;
      reason = "이름 없는 익명 더미";
    }

    if (shouldDelete && hasEntries) {
      keep.push({
        who: `${email || u.displayName || u.personalSlug}`,
        why: `${reason}이지만 기록 ${u._count.reflectionEntries}건 보존`,
      });
      continue;
    }
    if (shouldDelete) {
      deleteIds.push(u.id);
    } else {
      keep.push({
        who: `${email || u.displayName || u.personalSlug}`,
        why: hasEntries ? `실사용 (기록 ${u._count.reflectionEntries}건)` : "실사용/보존",
      });
    }
  }

  console.log("=== 보존 ===");
  for (const k of keep) console.log(`  KEEP ${k.who} — ${k.why}`);
  console.log(`\n=== 삭제 대상: ${deleteIds.length}명 ===`);

  // 삭제 전 연관 데이터 통계 (삭제될 것)
  const [devices, sessions, entries, moments, prayers] = await Promise.all([
    prisma.userDevice.count({ where: { userId: { in: deleteIds } } }),
    prisma.session.count({ where: { userId: { in: deleteIds } } }),
    prisma.reflectionEntry.count({ where: { userId: { in: deleteIds } } }),
    prisma.moment.count({ where: { userId: { in: deleteIds } } }),
    prisma.prayerTopic.count({ where: { userId: { in: deleteIds } } }),
  ]);
  console.log(
    `  연관: 기기 ${devices}, 세션 ${sessions}, 기록 ${entries}, 순간 ${moments}, 기도 ${prayers}`,
  );

  if (deleteIds.length === 0) {
    console.log("삭제할 대상 없음");
    return;
  }

  // Cascade 삭제 — User만 지우면 나머지는 스키마의 onDelete: Cascade가 처리.
  const result = await prisma.user.deleteMany({
    where: { id: { in: deleteIds } },
  });
  console.log(`\n삭제 완료: ${result.count}명`);

  const after = await prisma.user.count();
  console.log(`잔여 유저: ${after}명`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
