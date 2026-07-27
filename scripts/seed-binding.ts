import { createEntry, getEntry } from "../src/lib/entries";
import { db } from "../src/lib/db";
import { getPassageBySlug } from "../src/lib/bible";

let user = await db.user.findFirst({ where: { email: "qa-scripture@eobom.local" } });
if (!user) {
  user = await db.user.create({
    data: {
      email: "qa-scripture@eobom.local",
      name: "QA",
      displayName: "QA 테스터",
      personalSlug: "qa-scripture",
      preferredBibleTranslation: "한국어 성경 (Open Bibles)",
    },
  });
}
const p = getPassageBySlug("PSA-23-1");
if (!p) throw new Error("no passage");
const entry = await createEntry(user.id, {
  title: "목자",
  reflectionBody: "agbrowse QA 본문입니다. 선택 바인딩 검증.",
  scriptureBindings: [p.binding],
});
console.log(JSON.stringify({
  id: entry.id,
  refs: entry.scriptureRefs,
  bindings: entry.scriptureBindings,
  excerpt: entry.scriptureExcerpt?.slice(0, 40),
}, null, 2));
const got = await getEntry(user.id, entry.id);
console.log("roundtrip", got?.scriptureBindings?.[0]?.slug, got?.scriptureBindings?.[0]?.display);
const legacy = await db.reflectionEntry.create({
  data: {
    userId: user.id,
    entryDate: new Date(),
    title: "레거시",
    reflectionBody: "bindings 없는 구 데이터",
    scriptureRefs: JSON.stringify(["시편 1:1"]),
    scriptureExcerpt: "복 있는 사람은",
    scriptureBindings: "[]",
  },
});
const leg = await getEntry(user.id, legacy.id);
console.log("legacy", leg?.scriptureRefs, leg?.scriptureBindings?.length);
console.log("ENTRY_ID", entry.id);
console.log("USER_ID", user.id);
await db.$disconnect();
