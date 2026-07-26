import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = "test-user@eobom.local";
  await db.communityReaction.deleteMany({});
  await db.sharedReflection.deleteMany({});
  await db.reviewEvidence.deleteMany({});
  await db.reviewReport.deleteMany({});
  await db.actionStep.deleteMany({});
  await db.prayerTopic.deleteMany({});
  await db.reflectionEntry.deleteMany({});
  await db.session.deleteMany({});
  await db.account.deleteMany({});
  await db.consentRecord.deleteMany({});
  await db.contactInquiry.deleteMany({});
  await db.user.deleteMany({ where: { email } });

  const user = await db.user.create({
    data: {
      email,
      name: "테스트 순례자",
      displayName: "테스트 순례자",
      personalSlug: "test-pilgrim",
      aiProcessingConsent: true,
    },
  });

  const entries = [] as { id: string }[];
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const e = await db.reflectionEntry.create({
      data: {
        userId: user.id,
        entryDate: d,
        title: `기록 ${i + 1}`,
        scriptureRefs: JSON.stringify([i % 2 ? "시편 23:1" : "빌립보서 1:6"]),
        reflectionBody: `오늘은 마음에 남는 묵상 ${i + 1}. 인정받고 싶은 마음과 평안을 구하는 마음이 함께 있었습니다.`,
        prayer: i % 3 === 0 ? "주님, 제 마음을 지켜 주세요." : null,
        actionStep: i % 4 === 0 ? "한 사람에게 먼저 연락하기" : null,
        emotions: JSON.stringify(i % 2 ? ["평안"] : ["부담", "감사"]),
        tags: JSON.stringify(i % 2 ? ["관계"] : ["소명"]),
      },
    });
    entries.push(e);
  }

  await db.sharedReflection.create({
    data: {
      ownerUserId: user.id,
      sourceEntryId: entries[0].id,
      publicBody:
        "인정받으려 애쓰던 마음이 말씀 앞에서 조금 누그러졌습니다. 완벽하지 않아도 걸을 수 있기를.",
      scriptureRefs: JSON.stringify(["빌립보서 1:6"]),
      topicTags: JSON.stringify(["평안"]),
      pseudonym: "익명의 순례자",
      visibility: "public",
    },
  });

  console.log(
    JSON.stringify({
      userId: user.id,
      slug: user.personalSlug,
      entryId: entries[0].id,
    }),
  );
}

main().finally(() => db.$disconnect());
