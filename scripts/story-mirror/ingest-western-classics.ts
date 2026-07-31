/**
 * 이야기 거울 코퍼스 확장 - 서양 고전 Phase 4
 *
 * 그리스 신화·셰익스피어·유럽 고전 20편을 보강한다.
 * excerpt는 150~350자 4층 구조(사건→감정→전환→응축).
 */
import { db } from "@/lib/db";

const CORPUS_VERSION = "v4.2-seed-1";

type TaleInput = {
  id: string;
  slug: string;
  title: string;
  titleOriginal?: string;
  author?: string;
  era: string;
  excerpt: string;
  themes: string[];
  emotions: string[];
  situations: string[];
  locator?: string;
};

const TALES: TaleInput[] = [
  {
    id: "western-orpheus",
    slug: "western-orpheus",
    title: "오르페우스",
    titleOriginal: "Orpheus",
    era: "그리스 신화",
    excerpt:
      "오르페우스는 죽은 에우리디케를 데려오려 저승까지 내려갔습니다. 하데스를 노래로 감동시켰지만, 지상 직전 뒤를 돌아보는 순간 그녀를 다시 잃었습니다. 사랑이 규칙을 어기게 했고, 그 한 번의 불안이 영원한 이별이 되었습니다. 붙잡으려 돌아보는 마음이 때로 가장 아끼는 것을 놓칩니다.",
    themes: ["상실", "사랑", "후회", "예술"],
    emotions: ["그리움", "불안", "절망"],
    situations: ["되돌리려는 사랑", "금지된 뒤돌아봄", "한순간의 실수"],
  },
  {
    id: "western-prometheus",
    slug: "western-prometheus",
    title: "프로메테우스",
    titleOriginal: "Prometheus",
    era: "그리스 신화",
    excerpt:
      "프로메테우스는 인간에게 불을 주기 위해 신의 질서를 거스렀습니다. 그 대가로 바위에 묶여 끝없이 고통을 받았습니다. 그는 문명의 가능성을 열었지만 자신은 해방되지 못했습니다. 타인을 위한 선물이 때로 주는 이의 사슬이 됩니다. 문명을 연 손이 스스로 사슬을 찬 형국입니다.",
    themes: ["희생", "반항", "문명", "고통"],
    emotions: ["결의", "고통", "고독"],
    situations: ["금기를 깸", "대가를 짊", "약자를 위함"],
  },
  {
    id: "western-icarus",
    slug: "western-icarus",
    title: "이카루스",
    titleOriginal: "Icarus",
    era: "그리스 신화",
    excerpt:
      "이카루스는 아버지 다이달로스가 만든 날개로 미궁을 탈출했습니다. 높이 나는 흥분에 태양에 가까워지자 밀랍이 녹아 바다로 떨어졌습니다. 자유의 날개가 경고를 잊게 만들었습니다. 날 수 있게 된 순간이야말로 절제가 가장 필요한 때입니다. 날개가 생긴 뒤에야 절제의 무게를 배웁니다.",
    themes: ["자유", "자만", "한계", "경고"],
    emotions: ["흥분", "황홀", "추락"],
    situations: ["탈출의 기쁨", "경계를 넘음", "추락"],
  },
  {
    id: "western-sisyphus",
    slug: "western-sisyphus",
    title: "시시포스",
    titleOriginal: "Sisyphus",
    era: "그리스 신화",
    excerpt:
      "시시포스는 바위를 산 정상까지 굴려 올리지만, 정점에 닿으면 다시 굴러떨어집니다. 끝없는 반복이 형벌이 되었습니다. 그러나 그 무의미해 보이는 노동 안에서도 사람은 태도를 선택할 수 있습니다. 끝나지 않는 일 앞에서 의미를 부여하는 힘이 남습니다. 반복되는 바위 앞에서도 태도는 선택할 수 있습니다.",
    themes: ["반복", "부조리", "인내", "태도"],
    emotions: ["피로", "허무", "고집"],
    situations: ["끝없는 과제", "다시 시작", "의미 찾기"],
  },
  {
    id: "western-antigone",
    slug: "western-antigone",
    title: "안티고네",
    titleOriginal: "Antigone",
    author: "소포클레스",
    era: "고대 그리스",
    excerpt:
      "안티고네는 왕의 금령을 어기고 오빠를 묻어 주었습니다. 법과 혈육의 도리가 충돌하는 자리에서 그는 죽음을 각오한 선택을 했습니다. 옳음이 둘로 갈라질 때, 사람은 어떤 법을 따를지 물어야 합니다. 양심의 법은 때로 세상의 법과 맞서게 합니다. 양심의 법은 때로 세상의 법과 정면으로 맞섭니다.",
    themes: ["양심", "법", "가족", "저항"],
    emotions: ["결단", "비장", "슬픔"],
    situations: ["금령을 어김", "도리의 충돌", "목숨을 건 선택"],
  },
  {
    id: "western-medea",
    slug: "western-medea",
    title: "메데이아",
    titleOriginal: "Medea",
    author: "에우리피데스",
    era: "고대 그리스",
    excerpt:
      "메데이아는 이아손을 돕기 위해 모든 것을 걸었지만, 배신당한 뒤 복수의 길을 택했습니다. 사랑했던 만큼 상처가 깊었고, 그 상처는 파멸로 번졌습니다. 배신이 사랑을 분노로 바꿀 때 이야기는 회복보다 파국에 가깝습니다. 돌이킬 수 없는 복수는 복수한 이도 함께 태웁니다.",
    themes: ["배신", "복수", "사랑", "파멸"],
    emotions: ["분노", "절망", "광기"],
    situations: ["배신당한 헌신", "복수 결심", "돌이킬 수 없는 행동"],
  },
  {
    id: "western-achilles",
    slug: "western-achilles",
    title: "아킬레우스",
    titleOriginal: "Achilles",
    era: "그리스 서사",
    excerpt:
      "아킬레우스는 불명예를 견디지 못해 전투를 떠났다가, 친구 파트로클로스의 죽음 앞에서 다시 전장으로 돌아왔습니다. 분노가 그를 움직였고, 상실이 그를 깨웠습니다. 자존심과 우정 사이에서 영웅의 방향이 바뀌었습니다. 가장 강한 이도 잃은 친구 앞에서는 무너집니다. 강한 이도 벗을 잃으면 무너지고 다시 일어납니다.",
    themes: ["분노", "우정", "명예", "상실"],
    emotions: ["분노", "비통", "복수심"],
    situations: ["자존심 상함", "벗의 죽음", "전장으로 복귀"],
  },
  {
    id: "western-king-lear",
    slug: "western-king-lear",
    title: "리어왕",
    titleOriginal: "King Lear",
    author: "셰익스피어",
    era: "르네상스",
    excerpt:
      "리어왕은 권력을 나누어 주며 딸들의 아첨을 사랑으로 착각했습니다. 진실한 코딜리어를 내쫓은 뒤, 그는 광야에서 뒤늦게 눈을 떴습니다. 권좌에 있을 때 보지 못한 것을 잃은 자리에서야 보았습니다. 권력을 내려놓은 뒤에야 사람의 진심이 드러납니다. 권력을 내려놓은 뒤에야 진심이 보이기 시작합니다.",
    themes: ["오판", "가족", "권력", "깨달음"],
    emotions: ["자만", "배신감", "후회"],
    situations: ["아첨을 믿음", "진실한 이를 거절", "뒤늦은 각성"],
  },
  {
    id: "western-macbeth",
    slug: "western-macbeth",
    title: "맥베스",
    titleOriginal: "Macbeth",
    author: "셰익스피어",
    era: "르네상스",
    excerpt:
      "맥베스는 예언과 야망에 이끌려 왕을 죽이고 왕좌에 올랐습니다. 그러나 피의 자리는 평안 대신 의심과 악몽을 주었습니다. 한 번의 금기 위반이 다음 폭력을 불렀습니다. 욕망이 문을 열면, 양심은 쉽게 잠들지 못합니다. 한 번의 금기 위반이 양심의 밤을 부르고, 평안 대신 의심을 남깁니다.",
    themes: ["야망", "죄책", "권력", "타락"],
    emotions: ["탐욕", "공포", "광기"],
    situations: ["금지된 야망", "첫 범죄", "커지는 의심"],
  },
  {
    id: "western-tempest",
    slug: "western-tempest",
    title: "템페스트의 프로스페로",
    titleOriginal: "Prospero",
    author: "셰익스피어",
    era: "르네상스",
    excerpt:
      "프로스페로는 섬에서 마법으로 복수를 준비하다, 끝내 용서와 화해를 선택합니다. 적을 손아귀에 넣고도 복수 대신 지팡이를 부러뜨립니다. 힘을 가질수록 놓아줄 용기가 필요합니다. 진짜 회복은 지배가 아니라 화해에서 옵니다. 힘을 정점에서 내려놓을 때 비로소 화해와 회복이 시작됩니다.",
    themes: ["용서", "권력", "화해", "놓아줌"],
    emotions: ["분노", "연민", "평온"],
    situations: ["복수 기회", "힘의 절정", "용서 선택"],
  },
  {
    id: "western-faust",
    slug: "western-faust",
    title: "파우스트",
    titleOriginal: "Faust",
    author: "괴테",
    era: "독일",
    excerpt:
      "파우스트는 지식의 한계에 지쳐 메피스토펠레스와 거래합니다. 순간적인 충족을 위해 영혼을 걸었고, 욕망은 채워져도 갈증은 남았습니다. 더 많은 것을 아는 길이 항상 더 자유로운 삶은 아닙니다. 채울 수 없는 갈망이 위험한 약속을 부릅니다. 채울 수 없는 갈망이 위험한 거래를 부릅니다.",
    themes: ["욕망", "거래", "지식", "공허"],
    emotions: ["권태", "유혹", "불안"],
    situations: ["한계에 부딪힘", "위험한 계약", "채우지 못하는 갈증"],
  },
  {
    id: "western-beowulf",
    slug: "western-beowulf",
    title: "베오울프",
    titleOriginal: "Beowulf",
    era: "중세",
    excerpt:
      "베오울프는 그렌델을 물리치고 영웅이 되었지만, 말년에는 용과 맞서다 목숨을 겁니다. 공동체를 지키려는 용기가 그를 끝까지 전장에 세웠습니다. 젊음의 승리와 노년의 희생이 한 생애에 겹칩니다. 지키는 자의 자리는 영광 뒤에 외로움을 남기기도 합니다. 지키는 자의 자리는 영광 뒤에 외로움을 남깁니다.",
    themes: ["용기", "수호", "희생", "노년"],
    emotions: ["비장", "책임", "고독"],
    situations: ["공동체의 위협", "영웅의 귀환", "최후의 전투"],
  },
  {
    id: "western-dante",
    slug: "western-dante",
    title: "단테의 여행",
    titleOriginal: "The Divine Comedy",
    author: "단테",
    era: "중세",
    excerpt:
      "단테는 어둠의 숲에서 길을 잃고 지옥·연옥·천국을 지나갑니다. 안내자를 따라 자신의 죄와 희망을 마주하며 시야를 넓혀 갑니다. 길을 잃는 일이 곧 여정의 시작이 되기도 합니다. 내려가는 용기가 있어야 다시 올라갈 수 있습니다. 길을 잃는 순간이 더 깊은 여정의 입구가 됩니다.",
    themes: ["회개", "여정", "안내", "희망"],
    emotions: ["두려움", "경외", "갈망"],
    situations: ["길을 잃음", "안내자를 만남", "내면을 직면"],
  },
  {
    id: "western-robinson",
    slug: "western-robinson",
    title: "로빈슨 크루소",
    titleOriginal: "Robinson Crusoe",
    author: "디포",
    era: "18세기",
    excerpt:
      "로빈슨은 무인도에 표류해 혼자 삶을 다시 세웁니다. 고립 속에서 도구를 만들고 일상을 조직하며 생존을 넘어 질서를 회복합니다. 문명의 바깥에서 그는 문명의 의미를 다시 배웁니다. 혼자 남겨질 때 사람은 무엇이 필수인지 알게 됩니다. 혼자 남겨질 때 사람은 필수만을 다시 세웁니다.",
    themes: ["고립", "생존", "자립", "질서"],
    emotions: ["절망", "인내", "안도"],
    situations: ["표류", "혼자의 일상", "자급자족"],
  },
  {
    id: "western-moby-dick",
    slug: "western-moby-dick",
    title: "에이허브",
    titleOriginal: "Ahab",
    author: "멜빌",
    era: "19세기",
    excerpt:
      "에이허브 선장은 흰 고래 모비딕에게 다리를 잃고 복수에만 삶을 겁니다. 선원들까지 그 집념의 항해에 휘말리고, 배는 파멸로 향합니다. 한 사람의 상처가 공동체의 진로가 될 때 위험합니다. 복수가 나침반이 되면 항구는 사라집니다. 복수가 나침반이 되면 배는 항구를 잃습니다.",
    themes: ["집착", "복수", "파멸", "리더십"],
    emotions: ["증오", "광기", "비장"],
    situations: ["깊은 상처", "강박적 추격", "공동체의 희생"],
  },
  {
    id: "western-don-quixote",
    slug: "western-don-quixote",
    title: "돈키호테",
    titleOriginal: "Don Quixote",
    author: "세르반테스",
    era: "17세기",
    excerpt:
      "돈키호테는 기사 소설에 빠져 풍차를 거인과 싸우듯 돌진합니다. 세상은 그를 웃지만, 그는 이상 없는 현실을 거부합니다. 어리석어 보이는 신념이 시대의 건조함을 비춥니다. 현실과 어긋난 꿈도 사람에게 방향을 줄 수 있습니다. 시대와 어긋난 꿈도 건조한 현실을 비출 수 있습니다.",
    themes: ["이상", "현실", "신념", "조롱"],
    emotions: ["열정", "당황", "애틋"],
    situations: ["시대착오적 도전", "비웃음을 받음", "이상을 지킴"],
  },
  {
    id: "western-frankenstein",
    slug: "western-frankenstein",
    title: "프랑켄슈타인",
    titleOriginal: "Frankenstein",
    author: "메리 셸리",
    era: "19세기",
    excerpt:
      "빅터 프랑켄슈타인은 생명을 창조하고도 그 존재를 외면합니다. 버림받은 피조물은 이해받지 못한 채 복수와 고독으로 기울어집니다. 만든 이에 대한 책임 없는 창조는 재앙이 됩니다. 능력이 열 수 있는 문은 돌봄 없이 열면 안 됩니다. 돌봄 없는 창조는 관계를 원한으로 바꿉니다.",
    themes: ["책임", "소외", "창조", "고독"],
    emotions: ["공포", "혐오", "외로움"],
    situations: ["창조 후 방치", "이해받지 못함", "관계가 복수가 됨"],
  },
  {
    id: "western-jane-eyre",
    slug: "western-jane-eyre",
    title: "제인 에어",
    titleOriginal: "Jane Eyre",
    author: "샬롯 브론테",
    era: "19세기",
    excerpt:
      "제인 에어는 의존과 무시 속에서도 자신의 존엄을 포기하지 않습니다. 사랑을 원하면서도 불평등한 관계에는 서지 않았고, 자립한 뒤에야 동등한 만남으로 돌아옵니다. 사랑은 자기를 지우라는 뜻이 아닙니다. 자존을 지킬 때 관계도 바로 섭니다. 자존을 지킬 때 사랑도 비로소 바로 섭니다.",
    themes: ["자존", "사랑", "자립", "평등"],
    emotions: ["외로움", "결단", "희망"],
    situations: ["불공정한 의존", "떠남의 용기", "동등한 재회"],
  },
  {
    id: "western-scrooge",
    slug: "western-scrooge",
    title: "스크루지",
    titleOriginal: "Ebenezer Scrooge",
    author: "디킨스",
    era: "19세기",
    excerpt:
      "스크루지는 인색함으로 관계를 끊고 살다, 과거의 후회와 미래의 고독을 환상으로 봅니다. 공포가 그를 깨우고, 그는 나눔의 삶으로 돌아섭니다. 늦었다고 생각한 순간이 변화가 시작되는 문일 수 있습니다. 굳은 마음도 진실을 직면하면 녹을 수 있습니다. 굳은 마음도 진실을 직면하면 녹을 수 있습니다.",
    themes: ["회개", "탐욕", "변화", "나눔"],
    emotions: ["냉담", "공포", "기쁨"],
    situations: ["고립된 부", "과거를 직면", "삶의 전환"],
  },
  {
    id: "western-aesop-lion-mouse",
    slug: "western-aesop-lion-mouse",
    title: "사자와 쥐",
    titleOriginal: "The Lion and the Mouse",
    author: "이솝",
    era: "고대",
    excerpt:
      "사자는 보잘것없어 보이는 쥐를 살려 주었다가, 훗날 그물에 걸렸을 때 쥐의 도움으로 풀려납니다. 강자가 약자에게 베푼 여유가 자신의 위기를 구합니다. 사소한 친절이 어디에 씨앗을 심는지는 모릅니다. 오늘의 연민이 내일의 밧줄을 갉아 줄 수 있습니다. 오늘의 연민이 내일의 밧줄을 풀어 줄 수 있습니다.",
    themes: ["은혜", "겸손", "상호성", "약자"],
    emotions: ["연민", "고마움", "놀라움"],
    situations: ["약자를 살림", "강자의 위기", "작은 도움"],
  },
];

function assertExcerpt(tale: TaleInput) {
  if (tale.excerpt.length < 150 || tale.excerpt.length > 350) {
    throw new Error(`excerpt 길이 오류: ${tale.title} (${tale.excerpt.length})`);
  }
}

async function upsertTale(tale: TaleInput) {
  assertExcerpt(tale);

  const existing = await db.storyWork.findFirst({
    where: { OR: [{ id: tale.id }, { slug: tale.slug }] },
  });

  if (existing && existing.id !== tale.id) {
    console.log(`  [skip] ${tale.title} (slug 충돌: ${existing.id})`);
    return "skipped" as const;
  }

  const workData = {
    title: tale.title,
    titleOriginal: tale.titleOriginal ?? null,
    author: tale.author ?? null,
    era: tale.era,
    corpusVersion: CORPUS_VERSION,
    rightsStatus: "approved" as const,
    culture: "western",
    language: "ko",
  };

  const chunkData = {
    title: tale.title,
    locator: tale.locator ?? null,
    text: tale.excerpt,
    excerpt: tale.excerpt.slice(0, 200),
    summary: tale.excerpt,
    themes: JSON.stringify(tale.themes),
    emotions: JSON.stringify(tale.emotions),
    situations: JSON.stringify(tale.situations),
    corpusVersion: CORPUS_VERSION,
    rightsStatus: "approved",
    language: "ko",
  };

  if (existing) {
    await db.storyWork.update({ where: { id: tale.id }, data: workData });
    await db.storyChunk.upsert({
      where: { id: `${tale.id}-chunk` },
      create: {
        id: `${tale.id}-chunk`,
        workId: tale.id,
        chunkIndex: 0,
        citationAllowed: true,
        sourceUrl: null,
        checksum: null,
        ...chunkData,
      },
      update: chunkData,
    });
    console.log(`  [upd] ${tale.title} (len:${tale.excerpt.length})`);
    return "updated" as const;
  }

  await db.storyWork.create({
    data: {
      id: tale.id,
      slug: tale.slug,
      translator: null,
      sourceKind: "gutenberg",
      sourceUrl: "https://www.gutenberg.org",
      landingPageUrl: null,
      licenseUrl: null,
      rightsRegion: "world",
      rightsBasis: "public_domain",
      rightsCheckedAt: null,
      rightsNotes: null,
      checksum: null,
      ...workData,
    },
  });

  await db.storyChunk.create({
    data: {
      id: `${tale.id}-chunk`,
      workId: tale.id,
      chunkIndex: 0,
      citationAllowed: true,
      sourceUrl: null,
      checksum: null,
      ...chunkData,
    },
  });

  console.log(`  [ok] ${tale.title} (len:${tale.excerpt.length})`);
  return "created" as const;
}

async function main() {
  console.log(`[ingest-western] ${TALES.length}편 서양 고전 처리 시작`);
  let created = 0;
  let skipped = 0;

  for (const tale of TALES) {
    const result = await upsertTale(tale);
    if (result === "skipped") skipped++;
    else created++;
  }

  console.log(`\n[ingest-western] 완료: ${created}편 처리, ${skipped}편 건너뜀`);
}

main().catch((err) => {
  console.error("[ingest-western] 실패:", err);
  process.exit(1);
});
