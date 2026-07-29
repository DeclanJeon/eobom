# 이야기 거울 (Story Mirror) — 검토 반영 설계문서 v1.1

- 작성: 2026-07-28
- 상태: 설계 검토 완료, 구현 전 승인본
- 범위: 고전·성경 이야기와 사용자의 묵상 기록을 연결하는 개인 기능
- 선행 문서: `docs/brand-message.md`, `docs/meditation_journal_prd_v1.0.md`

> 이 문서는 제품·데이터·저작권·개인정보·AI 품질을 함께 다루는 설계 기준이다. 구현자는 이 문서의 수용 기준과 금지사항을 우선한다.

---

## 0. 검토 결론

기존 v1.0은 방향은 타당했지만 그대로 구현하기에는 다음 문제가 있었다.

1. **퍼블릭 도메인과 이용 허가를 혼동했다.** Project Gutenberg의 `copyright=false`는 미국 기준이며, 한국에서의 재배포 가능성을 보증하지 않는다. 한국 고전 데이터 API와 Project Jikji도 소스별 이용 조건을 개별 확인해야 한다.
2. **500권과 인물 카드의 관계가 정의되지 않았다.** 책 500권을 확보하는 것만으로 검색 가능한 인물·장면 데이터가 만들어지지 않는다.
3. **StoryCharacter 하나로 작품·판본·장면·인용·권리·출처를 모두 표현하려 했다.** provenance와 삭제·갱신·권리 철회가 어렵다.
4. **벡터 DB 선택이 미정이었다.** `sqlite-vec`과 Qdrant를 동시에 후보로 두면 구현 계약이 없다. 500개 안팎의 카드에는 별도 벡터 DB가 필요하지 않다.
5. **매칭 점수 0.6/0.4와 임계값 0.4가 근거 없이 고정되어 있었다.** 평가 데이터 없이 숫자를 고정하면 그럴듯하지만 검증되지 않은 추천이 된다.
6. **개인정보 동의·외부 AI 전송·매칭 결과 보존·원문 삭제 연계가 부족했다.** 묵상 원문은 종교적 신념과 민감한 사적 내용을 포함할 수 있다.
7. **GET 요청이 `refresh=true`로 생성 작업을 수행하도록 설계되었다.** 읽기와 비용 발생 작업을 분리해야 한다.
8. **자동 생성된 인물 카드와 매칭 문구의 검수·평가·실패 처리·콘텐츠 경고가 부족했다.**

따라서 다음과 같이 수정한다.

- **500권은 후보 작품 풀의 목표**로 두고, 초기 출시 품질 기준은 `검수 완료 StoryCard` 수로 정의한다.
- 첫 출시에는 50~80개 작품에서 100~160개 StoryCard를 수동·반자동 검수하여 제공한다. 500권은 검수 가능한 속도로 확장한다.
- 한국 사용자에게 노출하는 콘텐츠는 **한국 법역에서의 권리 상태가 확인된 항목만** production corpus에 넣는다.
- 500개 안팎의 카드에는 기존 SQLite에 메타데이터와 임베딩을 저장하고, 애플리케이션에서 제한된 전수 cosine scan을 사용한다. 별도 Qdrant 도입은 카드 수·트래픽·검색 품질이 이를 요구할 때 재검토한다.
- 초기 매칭은 결정적 태그·키워드 기반으로 출시하고, 외부 임베딩과 AI 설명은 별도 동의와 feature flag 뒤에 둔다.

---

## 1. 제품 목적과 비목표

### 1.1 목적

사용자의 묵상 기록에서 반복되는 주제·감정·질문·상황을 확인하고, 비슷한 질문이나 긴장을 지닌 고전 속 이야기와 연결한다. 사용자가 자신의 경험을 다른 서사와 나란히 보며 스스로 해석하도록 돕는다.

핵심 문장:

> 수천 년 전의 사람도 같은 질문을 했습니다.

AI와 이야기의 역할은 판정·처방·예언이 아니라 **비교 가능한 관점과 읽을 거리의 제공**이다.

### 1.2 비목표

- 사용자를 특정 인물의 성격·유형·운명으로 분류하지 않는다.
- 사용자의 신앙 상태, 죄, 소명, 하나님의 뜻을 판정하지 않는다.
- 정신건강 진단, 상담, 위기 대응, 관계·결혼·이별의 결론을 제공하지 않는다.
- 사용자의 기록을 소설·전기·성공담으로 자동 각색하지 않는다.
- 공개 피드에 매칭 결과나 원문을 자동 게시하지 않는다.
- 500권 전체를 전문 검색 가능한 공개 도서관으로 제공하지 않는다.

---

## 2. 제품 원칙

| 원칙 | 설계 규칙 |
|------|-----------|
| 거울, 해석 아님 | `당신은 X입니다` 대신 `최근 기록의 X라는 주제가 Y의 이야기와 일부 닮아 보입니다`를 사용한다. |
| 근거 있는 연결 | 매칭 이유에는 최소 2개의 서로 다른 날짜의 사용자 기록 또는 `단일 기록 기반의 잠정 연결` 표시가 필요하다. |
| 사용자가 해석자 | 매칭을 숨기기·관련 없음·민감함·도움 됨으로 표시할 수 있다. 매칭 결과는 정답 화면처럼 제시하지 않는다. |
| 비공개 기본 | 사용자 기록은 기본 비공개이며, Story Mirror 결과도 사용자 본인만 볼 수 있다. |
| 저작권 우선 | 소스·판본·번역·권리 지역·허가 범위를 항목별로 기록하고, 권리 상태가 불명확하면 노출하지 않는다. |
| 충분하지 않으면 말하지 않음 | 후보가 없거나 근거가 약하면 추천하지 않고 이유를 설명한다. |
| 다양성과 균형 | 한 문화권·한 장르·한 종교적 해석에 결과가 몰리지 않도록 corpus와 랭킹에 다양성 제약을 둔다. |
| 조용한 제품 | 점수·랭킹·스트릭·자동 알림을 사용하지 않는다. 내부 점수는 UI에 표시하지 않는다. |

---

## 3. corpus의 단위와 목표

### 3.1 단위를 분리한다

`작품 수`와 `검색·노출 가능한 이야기 수`는 다르다.

```text
StorySource       권리와 원문을 제공한 외부 또는 내부 출처
  └─ StoryWork     작품 또는 서사 단위
       └─ StoryEdition  사용한 판본·번역·전자 텍스트
            └─ StoryCard  인물·관계·장면·모티프 단위의 검수 카드
                 └─ StoryPassage  출처를 추적할 수 있는 짧은 장면·인용
```

- 작품 1권에서 StoryCard가 0개일 수 있다. 시·에세이·철학서는 인물 대신 `motif` 또는 `voice` 카드가 적합하다.
- 작품 1권에서 여러 StoryCard가 나올 수 있다.
- 자동 추출만 된 카드는 검색 후보로도 production에 넣지 않는다.
- `500권`은 후보 작품 풀의 크기이며, 서비스 품질은 검수 완료 StoryCard 수·근거 정확성으로 판단한다.

### 3.2 권장 corpus 단계

| 단계 | 작품 | 검수 카드 | 사용 범위 |
|------|------|-----------|-----------|
| 파일럿 | 20~30 | 40~60 | 내부 테스트와 품질 평가 |
| 초기 출시 | 50~80 | 100~160 | 사용자에게 노출 |
| 확장 | 200~300 | 300~600 | 장르·문화·언어 다양성 확대 |
| 장기 목표 | 후보 약 500 | 검수 결과에 따라 결정 | 품질 게이트 통과분만 production |

500권을 채우기 위해 품질 낮은 자동 요약을 넣지 않는다.

---

## 4. 출처와 저작권 설계

### 4.1 권리 상태는 소스 전체가 아니라 항목별로 판정한다

각 작품·판본·번역에 다음 필드를 남긴다.

- `sourceUrl`, `landingPageUrl`, `downloadUrl`
- 원저자, 번역자, 편집자, 삽화가
- 저작자 사망 연도, 공표 연도, 판본 연도
- 권리 지역: `KR`, `US`, `world`, `unknown`
- 권리 근거: `public_domain`, `cc0`, `open_license`, `permission`, `link_only`, `unknown`
- 라이선스 URL과 원문 보관 위치
- 허용 행위: 저장, 변환, 임베딩, 요약, 인용, 공개 재배포
- 확인일, 확인자, 검토 메모
- 원문 checksum과 수집 버전
- 상태: `candidate`, `review`, `approved`, `restricted`, `rejected`, `withdrawn`

`approved`가 아니면 production corpus에 들어갈 수 없다.

### 4.2 소스별 결정

#### Project Gutenberg / Gutendex

- Gutendex의 `copyright=false`는 **미국에서 퍼블릭 도메인으로 표시된 책**을 의미한다.
- Project Gutenberg도 미국 외 지역에서는 현지 법률에 따라 자유 이용 여부를 직접 확인하라고 안내한다.
- 따라서 한국 서비스에서 자동으로 `public_domain(KR)`로 승격하지 않는다.
- 우선은 작품·저자·링크 메타데이터와 내부 검토용 후보로 수집하고, 한국 법역 검토를 통과한 판본만 저장·변환·노출한다.
- Project Gutenberg 명칭을 상품명·홍보 문구로 활용하는 경우 상표 조건을 별도로 준수한다. 개별 작품 출처 링크와 서지정보를 표시한다.
- Gutendex API는 검색·메타데이터 수집용이며 장기 운영 시 자체 캐시 또는 자체 Gutendex 인스턴스를 검토한다. API 응답 구조와 `next` URL을 기준으로 페이지를 순회하고, MIME type은 `text/plain` prefix로 찾는다.

#### Standard Ebooks

- Standard Ebooks는 미국 퍼블릭 도메인 작품만 다룬다고 명시한다.
- Standard Ebooks가 제작한 콘텐츠는 CC0로 전용되지만, 웹사이트에 표시되는 제3자 콘텐츠는 별도 권리일 수 있다.
- 개별 ebook의 제작 주체·라이선스·판본·번역자 정보를 manifest에 저장한다.
- 미국 퍼블릭 도메인이라는 사실만으로 한국 내 재배포 가능성을 확정하지 않는다.

#### 한국문학번역원·한국고전번역원·한국고전종합DB

- 공공데이터 제공 또는 API 존재는 해당 텍스트 전체의 재배포·2차적 저작물·임베딩·AI 처리 허가를 자동으로 의미하지 않는다.
- 데이터셋별 이용약관, 공공누리 유형, 번역자·편집자 권리, API 호출 조건을 확인한다.
- 조건이 `출처표시`인지 `비영리`인지 `변경금지`인지 구분하고, 내부 저장·AI 요약·서비스 공개를 각각 승인한다.
- 확인되지 않은 한국어 번역문은 저장하지 않고 출처 링크만 제공한다.

#### Project Jikji

- 원작이 퍼블릭 도메인이라는 사실과 사이트가 제공하는 한국어 번역의 권리는 별개다.
- AI 번역 결과라고 해서 자동으로 퍼블릭 도메인이라고 가정하지 않는다.
- 사이트의 명시적 이용허가, 번역 결과의 사용 조건, 재배포·상업 이용 범위를 확인하기 전에는 production corpus에서 제외한다.

#### 성경 본문

- 성경 원전·고대 텍스트와 현대 한국어 번역본의 권리를 분리한다.
- 권리 확인이 된 번역본만 짧은 인용을 저장한다. 그 외에는 성구 주소와 공식 본문 열기 링크만 제공한다.
- StoryCard는 본문을 해석하거나 신앙적 정답을 제시하지 않는다.

### 4.3 법률 운영 게이트

- 서비스 운영 지역은 우선 대한민국으로 명시한다.
- 권리 검토는 법률 자문이 필요한 영역이며, 이 문서는 법률 의견이 아니다.
- 권리 매니페스트 없이 다운로드·임베딩·생성·공개를 수행하지 않는다.
- 권리 철회 또는 조건 변경 시 `withdrawn`으로 전환하고 관련 StoryCard·임베딩·캐시를 비활성화한다.
- 사용자 화면에는 작품명, 저자, 판본·번역자, 출처 링크, 라이선스 또는 권리 고지를 표시한다.
- 서비스가 원문 전문을 제공할 필요가 없으면 전문 저장을 피하고, 검수된 요약·짧은 인용·출처 링크만 저장한다.

---

## 5. 데이터 모델

기존 `StoryCharacter` 하나에 모든 내용을 넣지 않는다. 아래는 구현 방향을 나타내는 Prisma 설계안이며, 실제 적용 전 현재 `User`·`ReflectionEntry` 관계와 migration 전략을 확인한다.

```prisma
model StoryWork {
  id              String   @id @default(cuid())
  slug            String   @unique
  title           String
  titleOriginal   String?
  author          String?
  translator      String?
  sourceKind      String   // gutenberg | standard_ebooks | korean_open_data | bible | internal
  language        String
  culture         String   // korean | western | eastern | biblical | mixed
  era             String?
  sourceUrl       String
  landingPageUrl  String?
  licenseUrl      String?
  rightsRegion    String   // KR | US | world | unknown
  rightsBasis     String   // public_domain | cc0 | open_license | permission | link_only | unknown
  rightsStatus    String   @default("candidate")
  rightsCheckedAt DateTime?
  rightsNotes     String?
  checksum        String?
  corpusVersion   String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  editions        StoryEdition[]
  cards           StoryCard[]

  @@index([rightsStatus])
  @@index([sourceKind])
  @@index([culture])
}

model StoryEdition {
  id             String   @id @default(cuid())
  workId         String
  editionLabel   String?
  sourceUrl      String
  licenseUrl     String?
  rightsStatus   String   @default("review")
  textChecksum   String?
  textStored     Boolean  @default(false)
  accessedAt     DateTime
  createdAt      DateTime @default(now())

  work           StoryWork @relation(fields: [workId], references: [id], onDelete: Cascade)
  passages       StoryPassage[]

  @@index([workId])
}

model StoryCard {
  id              String   @id @default(cuid())
  workId          String
  kind            String   // character | relationship | scene | motif | voice
  name            String
  aliases         String   @default("[]")
  locale          String   @default("ko")
  summary         String
  arc             String?
  themes          String   @default("[]")
  emotions        String   @default("[]")
  situations      String   @default("[]")
  counterPatterns String   @default("[]")
  contentWarnings String   @default("[]")
  reviewStatus    String   @default("draft") // draft | reviewed | published | withdrawn
  reviewNotes     String?
  reviewedAt      DateTime?
  cardVersion     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  work            StoryWork @relation(fields: [workId], references: [id], onDelete: Cascade)
  passages        StoryPassage[]
  embeddings      StoryCardEmbedding[]
  matches         StoryMirrorMatch[]

  @@index([workId])
  @@index([reviewStatus])
  @@index([locale])
}

model StoryPassage {
  id              String   @id @default(cuid())
  cardId          String
  editionId       String
  locator         String   // chapter, page, section, or source anchor
  text            String?
  sourceUrl       String
  rightsStatus    String
  citationAllowed Boolean  @default(false)
  createdAt       DateTime @default(now())

  card            StoryCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  edition         StoryEdition @relation(fields: [editionId], references: [id], onDelete: Cascade)

  @@index([cardId])
}

model StoryCardEmbedding {
  id          String   @id @default(cuid())
  cardId      String
  provider    String
  modelName   String
  dimensions  Int
  vectorJson  String
  corpusVersion String
  createdAt   DateTime @default(now())

  card        StoryCard @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@unique([cardId, modelName, corpusVersion])
}

model StoryMirrorRun {
  id              String   @id @default(cuid())
  userId          String
  inputFingerprint String
  corpusVersion   String
  matcherVersion  String
  modelName       String?
  status          String   @default("pending") // pending | complete | failed | expired
  consentSnapshot Boolean
  createdAt       DateTime @default(now())
  completedAt     DateTime?
  expiresAt       DateTime?

  user            User @relation(fields: [userId], references: [id], onDelete: Cascade)
  matches         StoryMirrorMatch[]

  @@index([userId, createdAt])
  @@index([inputFingerprint, corpusVersion, matcherVersion])
}

model StoryMirrorMatch {
  id              String   @id @default(cuid())
  runId           String
  cardId          String
  internalScore   Float
  confidence      String   // high | medium | low | insufficient
  matchReason     String
  narrativeBridge String?
  state           String   @default("active") // active | dismissed | withdrawn
  createdAt       DateTime @default(now())

  run             StoryMirrorRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  card            StoryCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  evidence        StoryMirrorEvidence[]
  feedback        StoryMirrorFeedback[]

  @@index([runId])
  @@index([cardId])
}

model StoryMirrorEvidence {
  id         String   @id @default(cuid())
  matchId    String
  entryId    String
  excerpt    String
  relevance  String   // supporting | counter | context
  createdAt  DateTime @default(now())

  match      StoryMirrorMatch @relation(fields: [matchId], references: [id], onDelete: Cascade)
  entry      ReflectionEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)

  @@index([matchId])
  @@index([entryId])
}

model StoryMirrorFeedback {
  id         String   @id @default(cuid())
  matchId    String
  userId     String
  type       String   // helpful | inaccurate | unrelated | sensitive | hide
  createdAt  DateTime @default(now())

  match      StoryMirrorMatch @relation(fields: [matchId], references: [id], onDelete: Cascade)
  user       User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([matchId, userId, type])
}
```
실제 Prisma 적용 시 기존 모델에도 다음 역방향 relation 필드를 추가한다.

```prisma
model User {
  storyMirrorRuns     StoryMirrorRun[]
  storyMirrorFeedback StoryMirrorFeedback[]
}

model ReflectionEntry {
  storyMirrorEvidence StoryMirrorEvidence[]
}
```

`StorySource`는 수집 manifest의 개념적 엔터티로 두고, 초기 런타임 DB에서는 `StoryWork`의 source·권리 필드에 materialize한다. 소스별 다수 작품·권리 문서·철회 이력을 DB에서 운영해야 할 때 별도 모델로 승격한다.


설계상 중요한 점:

- `StoryMirrorMatch`를 `userId + cardId`로 unique하게 두지 않는다. corpus·매칭 버전·기간이 바뀌면 같은 카드도 다른 결과가 된다.
- 사용자 원문과 연결된 evidence는 JSON 배열이 아니라 FK로 관리하여 기록 삭제 시 cascade한다.
- `inputFingerprint`는 원문이 아니라 정규화된 entry ID·수정시각·선택 범위의 해시다.
- `consentSnapshot`, `corpusVersion`, `matcherVersion`을 저장해 결과를 재현하고 철회할 수 있게 한다.
- `vectorJson`은 초기 500개 규모에서 충분하다. vector DB 도입 전까지 외부 인프라를 추가하지 않는다.

---

## 6. 데이터 수집·검수 파이프라인

```text
소스 목록 등록
  → 권리 매니페스트 작성
  → rights gate
  → 원문/메타데이터 수집
  → checksum·원본 URL 저장
  → 텍스트 정규화
  → 작품·판본 분리
  → StoryCard 초안 생성
  → 출처·사실·표현·민감도 사람 검수
  → 검수 완료 카드만 publish
  → 임베딩 생성
  → corpus manifest 고정
```

### 6.1 수집 산출물

```text
data/story-mirror/
  sources.manifest.json       # 항목별 권리·출처·checksum·상태
  works.json                  # 승인된 작품 메타데이터
  cards.draft.jsonl           # AI/수동 초안
  cards.reviewed.jsonl        # 검수 완료 카드
  passages.jsonl              # 출처 추적 가능한 구절
  corpus-manifest.json       # 버전·카드 수·모델·생성일
  README.md                  # 출처와 재현 절차

scripts/story-mirror/
  fetch-gutendex.ts
  fetch-standard-ebooks.ts
  import-korean-open-data.ts
  import-bible-cards.ts
  normalize-source.ts
  build-card-drafts.ts
  validate-rights.ts
  validate-cards.ts
  build-embeddings.ts
  seed-corpus.ts
```

### 6.2 자동 구조화의 한계

AI는 등장인물·장면·주제를 추출하는 보조 도구일 뿐이다.

- 자동 생성 카드에는 `draft` 상태를 부여한다.
- 원문에 없는 사건·감정·인과관계를 추가하지 않는 검수 항목을 둔다.
- 인물의 행동을 사용자에게 권고하는 문장으로 바꾸지 않는다.
- 시대적 차별·폭력·성적 착취·자해·전쟁·학대가 있는 작품은 `contentWarnings`를 필수화한다.
- 1개 카드에 1개 작품·판본·장면의 근거를 연결한다.

### 6.3 텍스트 보존 정책

- 전문 저장은 권리 매니페스트의 `allow_storage`가 true인 경우에만 허용한다.
- 전문을 저장하지 않는 소스는 카드의 요약·짧은 허용 인용·출처 링크만 저장한다.
- 임베딩은 카드의 검수된 요약·태그를 우선 사용하고, 사용자 원문과 소스 전문을 불필요하게 결합하지 않는다.
- 수집 원문은 운영 DB와 분리된 quarantine 영역에 두고, rights gate 통과 후에만 production artifact로 승격한다.
- 삭제·권리 철회 시 원문, 카드, passage, 임베딩, 캐시를 함께 비활성화한다.

---

## 7. 사용자 입력과 개인정보 처리

### 7.1 동의 경계

기존 `User.aiProcessingConsent`는 외부 AI 처리 동의의 기반으로 사용하되, Story Mirror를 별도 토글로 관리한다.

권장 설정:

- `storyMirrorEnabled`: 기능 사용 여부
- `storyMirrorExternalProcessingConsent`: 묵상 일부를 외부 임베딩·LLM에 보낼 수 있는지
- `storyMirrorLastConsentVersion`: 동의 문서 버전

외부 처리 동의가 없으면 다음 경로만 허용한다.

1. 사용자가 직접 입력한 태그·감정·성구 주소
2. 로컬 결정적 키워드·빈도 매칭
3. 승인된 StoryCard 메타데이터의 전수 비교

외부 처리 동의가 있더라도 AI에 보내는 텍스트는 최소화하고, 사용자 이름·이메일·정확한 장소·제3자 식별정보를 scrub한다.

### 7.2 입력 범위

기본 입력은 최근 10개, 최대 30개 기록의 다음 필드로 제한한다.

- entry ID와 날짜
- 사용자가 선택한 태그·감정
- 성구 주소
- 회고에 이미 저장된 관찰의 주제와 근거 ID
- 필요한 경우에만 scrub된 짧은 본문 excerpt

`privateNote`와 공유하지 않은 첨부파일은 기본적으로 제외한다.

### 7.3 결과 보존과 삭제

- 결과는 기본적으로 사용자만 볼 수 있다.
- 사용자가 기능을 끄면 새 매칭을 생성하지 않고 기존 결과를 즉시 숨긴다.
- 계정·기록 삭제 시 run, match, evidence, feedback, 임베딩 캐시를 삭제하거나 비활성화한다.
- 결과에는 만료일과 corpus/matcher 버전을 저장한다.
- 로그에는 원문·생성 프롬프트·매칭 이유 전체를 남기지 않는다.

---

## 8. 매칭 알고리즘

### 8.1 단계별 출시 전략

#### Phase A: 외부 처리 없는 기준선

- controlled vocabulary로 태그·감정·상황을 정규화한다.
- 사용자 프로파일과 StoryCard의 교집합, 날짜 다양성, 근거 수, 문화·장르 다양성을 계산한다.
- 결과는 내부 카드 점수만 사용하고 UI에는 점수를 표시하지 않는다.
- 충분한 근거가 없으면 `insufficient`로 종료한다.

#### Phase B: 선택적 임베딩

- 사용자 동의가 있을 때만 프로파일 요약을 임베딩한다.
- 카드 임베딩은 corpus build 때 미리 생성한다.
- 500개 안팎은 SQLite의 vector JSON을 순회하여 cosine similarity를 계산한다.
- provider·model·dimensions·corpusVersion을 임베딩별로 저장한다.

#### Phase C: 설명 생성

- 후보 Top-K와 허용된 evidence만 LLM에 전달한다.
- 출력은 JSON schema로 제한한다.
- 출처 없는 사실·신앙 권위·사용자 성격 단정이 있으면 폐기하고 결정적 템플릿으로 대체한다.
- 설명 생성 실패는 원문 저장 실패가 아니며, 매칭 자체를 숨기거나 `설명이 준비되지 않음`으로 표시한다.

### 8.2 후보 선정

고정된 `0.6 × vector + 0.4 × keyword`와 `0.4` 임계값은 사용하지 않는다. 파일럿 평가 후 보정한다.

초기 내부 랭킹 구성:

```text
eligibility gate
  - rightsStatus = approved
  - reviewStatus = published
  - locale 지원
  - content warning 정책 통과

candidate score
  - theme overlap
  - emotion/situation overlap
  - semantic similarity (활성화된 경우만)
  - 최소 2개 날짜 근거 보너스
  - 반례·상충 기록 고려
  - 동일 작품·동일 문화권 과다 노출 감점
  - 최근 결과·dismissed 카드 감점 또는 제외
```

- 최소 노출 조건과 threshold는 `matcherVersion`별 설정으로 관리한다.
- 파일럿에서는 `precision@3`, `unrelated rate`, `overclaim rate`를 보고 threshold를 정한다.
- 사용자의 기록이 1개뿐이면 `단일 기록 기반의 잠정 연결`로 표시하고 확정적 문구를 금지한다.
- Top-K가 모두 약하면 결과를 만들지 않는다.
- 사용자가 결과를 숨겼다고 해당 인물을 영구적으로 삭제하지 않는다. 숨김 범위와 재노출 정책을 명시한다.

### 8.3 설명 계약

허용 예:

> 최근 두 기록에서 `관계의 망설임`과 `먼저 다가가고 싶은 마음`이 함께 나타났습니다. 이 카드는 그 긴장이 작품 속 인물의 선택과 함께 나타나는 장면을 보여 줍니다. 두 경험이 같다는 뜻은 아닙니다.

금지 예:

- 당신은 춘향과 같은 사람입니다.
- 이 인물에게서 배워야 합니다.
- 하나님은 당신에게 이 길을 원하십니다.
- 당신의 문제는 이 이야기로 해결됩니다.
- 이 관계를 계속하거나 끝내야 합니다.

설명에는 다음을 포함한다.

- 매칭된 주제 또는 상황
- 근거가 된 기록 날짜와 링크
- 이야기 측 근거 카드·passage
- 차이와 한계
- `정답이나 진단이 아닌 읽을 거리`라는 고지

---

## 9. 안전·콘텐츠 정책

### 9.1 사용자 기록 안전

기존 `content-scrub`와 `together-safety`를 재사용하되 Story Mirror 전용 경로를 만든다.

- 자해·타해·즉각적 위기·학대가 감지된 원문을 외부 설명 생성에 보내지 않는다.
- 위기 기록에 고전 인물을 연결하여 낭만화하거나 영적 처방으로 제시하지 않는다.
- 필요한 경우 이야기 거울을 숨기고 안전 안내를 우선한다.
- 정신건강·의료·법률·재정의 결론으로 이어질 수 있는 매칭 문구를 차단한다.

### 9.2 이야기 카드 안전

- `contentWarnings`를 카드 상세 상단에 표시한다.
- 폭력·성폭력·자해·노예제·인종차별·가부장적 규범 등 역사적 맥락을 삭제하지 않되 미화하지 않는다.
- 성경 인물도 신앙적 권위자로 추천하지 않고 서사·기록 출처를 분리한다.
- 작품 속 차별적 표현은 필요한 경우 직접 노출하지 않고 요약·출처 링크로 대체한다.

---

## 10. API와 UI

### 10.1 API 계약

모든 사용자 API는 `requireApiUser`, Zod schema, 사용자 소유권 확인, rate limit를 적용한다.

```text
GET  /api/story-mirror
  읽기 전용. 가장 최근 complete run과 active matches 반환.

POST /api/story-mirror/runs
  명시적 생성 요청. 기간·입력 범위·외부 처리 동의 확인.

GET  /api/story-mirror/runs/:id
  해당 사용자의 run만 조회.

POST /api/story-mirror/matches/:id/dismiss
  특정 match 숨김.

POST /api/story-mirror/matches/:id/feedback
  helpful | inaccurate | unrelated | sensitive 기록.

GET  /api/story-mirror/cards
  공개 가능한 카드 catalog만 반환. 사용자 근거를 포함하지 않음.

GET  /api/story-mirror/cards/:id
  published 카드와 출처·권리·경고·passage만 반환.
```

- `GET ?refresh=true`로 생성 작업을 수행하지 않는다.
- 생성은 POST이며 idempotency key 또는 동일 input fingerprint 캐시를 사용한다.
- 생성·임베딩·LLM 설명에는 사용자별 rate limit와 timeout을 둔다.
- 공개 catalog endpoint와 개인 match endpoint를 분리한다.
- 운영 오류 응답에 원문·프롬프트·외부 API 응답을 포함하지 않는다.

### 10.2 UI 위치

**별도 `/story-mirror` 화면을 canonical surface로 하고, 오늘 홈에는 읽기 전용 요약 카드만 둔다.**

이유:

- 오늘 홈 로딩마다 비싼 매칭을 수행하지 않는다.
- 사용자가 기능을 이해하고 끌 수 있다.
- 기록·회고·이야기를 독립적으로 탐색할 수 있다.

오늘 홈 카드 조건:

- 사용자가 기능을 켰다.
- complete run이 있다.
- 새 run을 자동 생성하지 않는다.
- 최대 1~2개만 요약한다.

상세 화면 구성:

1. 기능 목적과 한계
2. 최근 매칭 카드
3. `왜 연결되었나요?` — 사용자 근거와 이야기 근거
4. `닮지 않은 점과 한계`
5. 콘텐츠 경고
6. 원문·작품 출처 링크
7. 관련 없음·민감함·숨기기·도움 됨
8. 새로 찾기
9. 설정에서 끄기

- 내부 유사도 수치와 경쟁 순위를 보여 주지 않는다.
- 카드가 없을 때는 실패가 아니라 `아직 충분한 근거가 없습니다`로 안내한다.
- 인물 카드보다 이야기·장면 카드를 함께 사용하여 사용자를 인물 유형으로 고정하지 않는다.

---

## 11. 품질 평가와 관측성

### 11.1 파일럿 평가 세트

- 실제 원문을 복제하지 않은 비식별화·합성 시나리오 50개 이상을 만든다.
- 주제, 감정, 상황, 금지 사례, 매칭 없음 사례를 균형 있게 포함한다.
- 각 시나리오에 독립 검토자가 관련 카드와 비관련 카드를 표시한다.
- 문화·언어·성경 카드의 과대표집 여부를 따로 측정한다.

### 11.2 출시 게이트

다음 기준을 모두 통과해야 사용자 노출을 시작한다.

- 출처 passage 정확성: 100%
- 권리 상태 미확인 카드 노출: 0건
- 사용자 evidence 소유권 누출: 0건
- 금지 권위·진단·명령 문구: 0건
- 위기 입력의 외부 설명 전송: 0건
- 파일럿 `unrelated` 비율: 기준값을 정하고 회귀 테스트로 유지
- 사용자가 기록 삭제 후 관련 evidence가 남지 않음
- LLM 실패·timeout·빈 응답에서 원문 손실 없음

`precision@3`, `recall@k`, `unrelated rate`, `overclaim rate`, `citation accuracy`, `latency`, `external-processing count`를 matcher/corpus 버전별로 기록한다.

### 11.3 회귀 테스트

- 권리 gate: `unknown`, `US-only`, `KR-approved`, `withdrawn`
- 매칭 없음·단일 기록·상충 기록·다문화 결과
- dismissed/feedback 후 재생성
- entry 수정·삭제 cascade
- 동의 없음·동의 철회
- 위기·개인정보 scrub
- API IDOR와 다른 사용자의 run 접근
- LLM 구조화 응답 오류·금지 문구·출처 불일치

---

## 12. 구현 단계와 수용 기준

### Phase 0 — 권리·콘텐츠 파일럿

산출물:

- `sources.manifest.json`
- 권리 검토 표
- 20~30개 작품, 40~60개 카드
- 카드 검수 체크리스트
- 50개 이상 평가 시나리오

수용 기준:

- 각 카드에 출처·판본·권리 상태·검수자가 있다.
- `unknown`과 `US-only`는 production에서 조회되지 않는다.
- 자동 생성 카드는 `draft`이며 사용자에게 노출되지 않는다.

### Phase 1 — 기준선 매칭

산출물:

- `StoryWork`, `StoryEdition`, `StoryCard`, `StoryPassage`
- 외부 처리 없는 태그·키워드 매칭
- `/api/story-mirror/runs`와 조회 API
- 최소 UI와 feedback/dismiss

수용 기준:

- 동의가 없으면 외부 API가 호출되지 않는다.
- 두 날짜 이상의 evidence 또는 단일 기록 잠정 라벨이 표시된다.
- 사용자 소유권·삭제 cascade 테스트가 통과한다.
- 내부 점수는 사용자 화면에 노출되지 않는다.

### Phase 2 — 선택적 임베딩·설명

산출물:

- `StoryCardEmbedding`
- provider interface와 model/corpus versioning
- scrubbed input 기반 설명 생성
- 금지 문구·citation validator

수용 기준:

- 외부 처리 동의 철회 후 새 임베딩·설명 요청이 발생하지 않는다.
- provider timeout은 결정적 기준선 또는 무결한 실패 상태로 처리된다.
- 설명에 없는 사실과 출처 불일치가 차단된다.
- 비용·호출 수·지연시간이 관측된다.

### Phase 3 — corpus 확장과 시각화 연계

산출물:

- 검수 완료 카드 100~160개 이상
- 장르·문화·언어 균형 보고서
- 기록 주제와 이야기 카드의 연결 시각화
- 필요할 때만 500권 후보 풀 확대

수용 기준:

- 카드 수가 늘어도 품질·권리·안전 gate가 자동으로 적용된다.
- story mirror 그래프는 점수나 사용자 평가 등급을 표시하지 않는다.
- 삭제·권리 철회 이벤트가 전체 파생 산출물에 반영된다.

### 구현 순서의 원칙

`500권 수집 → 한 번에 AI 매칭`을 하지 않는다.

```text
권리 확인 → 소규모 검수 corpus → 기준선 매칭 → 평가
→ 동의 기반 임베딩 → 설명 생성 → corpus 확장 → 시각화
```

---

## 13. 성능·운영

- 초기 카드 500개 이내에서는 SQLite 메타데이터 + vector JSON 전수 비교로 시작한다.
- 임베딩 계산은 수집·배포 시점에 미리 수행한다. 사용자 요청마다 모든 카드를 재임베딩하지 않는다.
- AI 설명은 run 단위로 캐시하고 input fingerprint·corpusVersion·matcherVersion이 달라질 때만 재생성한다.
- 생성 작업은 요청-응답 안에서 긴 시간 실행하지 않고, 현재 앱의 단순 배포 제약을 고려해 우선 짧은 동기 처리 + timeout으로 구현한다. 지연이 늘면 job 상태 모델로 전환한다.
- 수집 스크립트는 운영 웹 요청과 분리하고, source URL·checksum·실패 원인·재시도 횟수를 기록한다.
- DB 백업·복구 시 사용자 기록과 public corpus를 분리한다.
- corpus는 코드와 함께 고정 버전을 배포하며, 운영 중 원격 소스 내용을 즉시 반영하지 않는다.

---

## 14. 위험과 대응

| 위험 | 수준 | 대응 |
|------|------|------|
| 미국 기준 퍼블릭 도메인을 한국 재배포 가능으로 오판 | 매우 높음 | 권리 지역별 manifest와 법률 검토. 불명확하면 link-only 또는 제외 |
| AI 번역·최근 번역의 별도 저작권 누락 | 매우 높음 | 번역자·판본·라이선스 확인. Project Jikji는 명시적 허가 전 제외 |
| 500권을 자동 처리해 사실 오류·환각 카드 생성 | 높음 | 카드 단위 사람 검수, draft/published gate, passage 검증 |
| 사용자를 인물 유형으로 고정 | 높음 | character 외 scene/motif 카드, 점수 숨김, 차이·한계 필수 |
| 민감한 묵상 외부 전송 | 매우 높음 | 별도 동의, scrub, 최소 입력, 위기 경로 차단, 호출 감사 지표 |
| 근거 기록 삭제 후 evidence 잔존 | 높음 | FK cascade, 삭제 회귀 테스트, 파생 캐시 삭제 |
| 매칭 품질 낮음 | 높음 | 기준선부터 평가, no-match, 사용자 feedback, threshold 버전 관리 |
| 홈 로딩·반복 새로고침으로 AI 비용 증가 | 중간 | GET mutation 제거, 명시적 POST, fingerprint 캐시, rate limit |
| 역사적 폭력·차별의 낭만화 | 높음 | content warning, 맥락·한계 표시, 위험 문구 차단 |
| 외부 소스 변경·삭제 | 중간 | landing URL·checksum·corpus snapshot·재현 가능한 manifest |

---

## 15. 공식 참고 출처

검토일: 2026-07-28

- Project Gutenberg 권한·지역 주의: <https://www.gutenberg.org/policy/permission.html>
- Gutendex API 문서와 `copyright` 의미: <https://gutendex.com/>
- Standard Ebooks collection policy와 미국 퍼블릭 도메인 범위: <https://standardebooks.org/contribute/collections-policy>
- Standard Ebooks feeds: <https://standardebooks.org/feeds>
- 한국문학번역원 고전자료 API 안내: <https://www.ltikorea.or.kr/kr/board/API_LIST/boardView.do?bbsIdx=15280&pageIndex=1>
- 한국고전번역원 고전원문 공공데이터: <https://www.data.go.kr/data/15022432/fileData.do>
- 대한민국 국가법령정보센터 저작권법: <https://www.law.go.kr/법령/저작권법>
- 한국저작권위원회: <https://www.copyright.or.kr/>

이 출처 목록은 권리 승인을 대신하지 않는다. 실제 수집 시 작품·판본·번역·이용 조건별로 별도 확인 기록을 남긴다.

---

## 16. 시각화 — 사용자 기록의 입체적 표현

### 16.1 목적

사용자의 묵상 기록을 시각적으로 연결하여, 자기 자신의 서사를 입체적으로 이해하도록 돕는다. 이미지는 인물 카드의 장식이 아니라 **사용자 본인의 기록·주제·감정·시간의 흐름**을 보여주는 시각화다.

핵심: "어제의 나, 어제의 묵상들, 어제의 생각들을 하나로 모아서 AI가 정리하고, 나를 입체적으로 알 수 있게" 돕는 것.

### 16.2 시각화 유형

| 유형 | 설명 | 데이터 소스 | 출력 형태 |
|------|------|-------------|-----------|
| **여정 타임라인** | 날짜별 기록 밀도, 주제 분포를 시간축 위에 시각화 | `ReflectionEntry` (날짜, tags, emotions) | 이미지 또는 인터랙티브 그래프 |
| **생각의 네트워크** | 반복되는 주제들의 연결 관계를 그래프로 | 사용자 tags의 동시 출현 빈도 | 네트워크 그래프 |
| **감정 분포** | 시간에 따른 감정 변화를 시각화 | `ReflectionEntry.emotions` + 날짜 | 라인/영역 그래프 |
| **이야기 매칭 시각화** | 사용자 기록 ↔ 고전 인물의 연결을 그래프로 | `StoryMirrorMatch` + `StoryMirrorEvidence` | 이분 그래프 또는 연결선 |

### 16.3 도구

ponslink 서버에 이미 설치된 `~/bin/codex-imagen`을 사용한다. 이 도구는 ChatGPT OAuth 토큰을 통해 GPT Image 2 모델로 이미지를 생성하며, YouTube 썸네일 생성 워크플로우에서 이미 검증되었다.

- 경로: `~/bin/codex-imagen` → `~/apps/codex-imagen/scripts/codex-imagen.mjs`
- 모델: `gpt-image-2` (기본)
- 인증: `~/.codex/auth.json`의 ChatGPT OAuth 토큰 자동 사용
- 의존성: Node.js 22, `openai` 패키지 불필요 (OAuth 직접 호출)

### 16.4 사용법

```bash
~/bin/codex-imagen "prompt" -o output.png --timeout 900
~/bin/codex-imagen "prompt" -o output.png --model gpt-image-2 --quality medium
```

### 16.5 시각화별 설계

#### A. 여정 타임라인

```
[사용자의 시간축 위에 기록이 점으로 표시됨]

2026-07-01  ●  인내, 슬픔
2026-07-05  ●● 용기와 두려움, 불안
2026-07-10  ●  인내, 감사
2026-07-15  ●● 관계의 망설임, 두려움
2026-07-20  ●  회개, 후회
2026-07-28  ●● 인내, 소망
```

- 세로축: 날짜
- 점 크기: 해당일 기록 수
- 점 색상: 주요 감정 (팔레트 매핑)
- 연결선: 같은 주제가 반복되면 점을 선으로 연결

#### B. 생각의 네트워크

```
[주제들의 동시 출현 관계를 그래프로]

     인내 ─── 용기와 두려움
       │            │
     회개 ─── 신뢰와 의심
       │
    관계의 망설임 ─── 기다림
```

- 노드: 사용자가 기록한 주제 (tags에서 추출)
- 엣지: 같은 기록에서 함께 나타난 주제
- 노드 크기: 전체 빈도
- 엣지 두께: 동시 출현 빈도

#### C. 감정 분포

```
[시간에 따른 감정 비율 변화]

감정    7/1   7/5   7/10  7/15  7/20  7/28
슬픔    ████  ██    █     ███   ██    █
두려움  ██    ████  ███   ████  █     █
희망    █     █     ██    █     ███   ████
감사    █     █     ████  █     █     ███
```

- 가로축: 시간
- 세로축: 감정별 빈도 또는 비율
- 스택 영역 차트 또는 라인 차트

#### D. 이야기 매칭 시각화

```
[사용자 기록과 고전 인물의 연결]

사용자 기록 (왼쪽)          고전 인물 (오른쪽)

7/22 "관계에서의 망설임"  ─── 춘향 (인내)
7/25 "먼저 다가가고 싶다" ─── 춘향 (인내)
7/20 "회개하고 싶다"      ─── 다윗 (회개)
7/15 "혼자인 시간"        ─── 하갈 (외로움)
```

- 왼쪽: 사용자의 기록 (날짜 + 요약)
- 오른쪽: 매칭된 고전 인물
- 연결선: 매칭 근거 (주제·감정)
- 선 색상: 매칭 유형 (주제=forest, 감정=clay)

### 16.5 프롬프트 전략 (ChatGPT 검증 완료)

아래 프롬프트는 ChatGPT에서 이미지 생성 테스트를 통해 검증되었다.
테스트 이미지: `/home/declan/output/story-mirror-test/`

**1. Journey Timeline — Watercolor Data Landscape**
```
Create a square, editorial-quality infographic illustration visualizing a personal spiritual journey as an abstract timeline. No text, labels, numbers, icons with meaning, or typography. Represent the passage of time with a flowing horizontal path that gently curves through a serene watercolor landscape. Along the path, vary the density of soft organic marks, stones, leaves, or glowing brushstroke clusters to indicate changing entry frequency. Introduce subtle color transitions and symbolic natural motifs to suggest evolving meditation themes without explicit symbols. Use layered translucent watercolor washes, handmade paper texture, soft bleeding pigments, and delicate brush edges. Color palette strictly based on linen (#fbf9f6), forest (#061b0e), gold (#c5a059), and clay (#b36a5e). Warm, calm, contemplative atmosphere inspired by Korean minimal aesthetics. No faces, no people, no text, no interface elements. High visual clarity with elegant negative space, square composition.
```

**2. Thought Network — Organic Theme Constellation**
```
Create a square abstract visualization of interconnected meditation themes as a graceful node network. No text, labels, numbers, or recognizable diagrams with captions. Depict softly glowing watercolor circles connected by flowing ink-like lines, resembling roots, mycelium, river branches, or constellations. Clusters naturally emerge with varying densities to imply frequently co-occurring reflections. Balance complexity with generous breathing room, emphasizing harmony over technical precision. Handmade watercolor paper texture, layered transparent pigments, gentle blooms, subtle granulation, and soft feathered edges. Palette limited to linen (#fbf9f6), forest (#061b0e), gold (#c5a059), and clay (#b36a5e). Warm, peaceful, contemplative mood suitable for a Korean Christian meditation app. No faces, no text, no UI, no symbols with explicit religious imagery, square format.
```

**3. Emotion Distribution — Flowing Watercolor Layers**
```
Create a square abstract stacked-area composition expressing emotional balance across time without using charts, axes, labels, or text. Multiple translucent watercolor bands gently flow across the canvas like layered hills, rivers, mist, or rolling fabric, expanding and contracting to suggest changing emotional proportions. Smooth organic transitions, overlapping transparent washes, soft gradients, subtle pigment blooms, and visible watercolor texture create depth and serenity. Composition should evoke hope, reflection, peace, longing, gratitude, and renewal through color relationships alone. Use only linen (#fbf9f6), forest (#061b0e), gold (#c5a059), and clay (#b36a5e). Warm, contemplative lighting with generous negative space and refined Korean-inspired minimalism. No faces, no people, no text, no interface, square format.
```

**4. Story Matching — Symbolic Connection Map**
```
Create a square abstract bipartite-style composition visualizing meaningful connections between personal reflections and timeless narrative archetypes without text or recognizable characters. Two balanced columns of organic watercolor forms face one another across an open center, connected by elegant flowing brushstroke threads of varying thickness and transparency. The left side consists of unique abstract journal-like organic shapes; the right side contains distinct symbolic natural forms such as trees, mountains, vessels, stars, seeds, or pathways that suggest enduring stories without depicting people or explicit religious figures. Connections create a harmonious woven pattern emphasizing discovery and resonance. Handmade watercolor texture, soft bleeding pigments, layered washes, and delicate brushwork. Palette restricted to linen (#fbf9f6), forest (#061b0e), gold (#c5a059), and clay (#b36a5e). Warm, calm, contemplative mood with Korean minimalist sensibility. No faces, no people, no text, no UI elements, square composition.
```

### 16.6 테스트 결과

| 이미지 | 파일 | 크기 | 상태 |
|--------|------|------|------|
| Journey Timeline | `01-journey-timeline.png` | 1024x1024 | ✅ 검증 완료 |
| Thought Network | `02-thought-network.png` | 1024x1024 | ✅ 검증 완료 |
| Emotion Distribution | `03-emotion-distribution.png` | 1024x1024 | ✅ 검증 완료 |
| Story Matching | `04-story-matching.png` | 1024x1024 | ✅ 검증 완료 |

테스트 이미지 경로: `/home/declan/output/story-mirror-test/`
QR 코드: 각 이미지별 `-qr.png` 파일 생성 완료

검증 기준:
- 브랜드 팔레트(린넨, 포레스트, 골드, 클레이) 일치 ✅
- 텍스트 없음 ✅
- 인물 사진 없음 ✅
- 수채화 텍스처 ✅
- 정방형 포맷 ✅
- 한국적 묵상 분위기 ✅

### 16.7 Prisma 스키마 추가

```prisma
model UserVisualization {
  id              String   @id @default(cuid())
  userId          String
  kind            String   // timeline | network | emotion | story-match
  periodStart     DateTime
  periodEnd       DateTime
  imageUrl        String   // 생성된 이미지 경로
  imagePrompt     String   // 사용된 프롬프트
  dataJson        String   // 시각화 원본 데이터 (JSON)
  corpusVersion   String
  matcherVersion  String?
  createdAt       DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, kind, periodStart, periodEnd])
  @@index([userId])
}
```

### 16.8 API 추가

```
POST /api/story-mirror/visualize
  → body: { kind: "timeline"|"network"|"emotion"|"story-match", periodStart, periodEnd }
  → 해당 기간의 사용자 기록을 분석하여 시각화 이미지 생성
  → 기존 이미지가 있으면 기존 URL 반환 (캐시)

GET /api/story-mirror/visualize
  → 사용자의 최근 시각화 목록 반환
```

### 16.9 캐시 정책

- 동일 기간+유형의 시각화는 재사용. 새 기록 추가 시에만 재생성.
- `dataJson`에 시각화 원본 데이터를 저장하여 이미지 없이도 재현 가능.
- 이미지 파일은 `public/story-mirror/vis/`에 저장.
- 프로덕션 배포 시 `rsync`로 이미지 동기화.

### 16.10 비용·성능

| 항목 | 예상치 |
|------|--------|
| GPT Image 2 1장 | $0.04~0.06 |
| 생성 시간 | 10~20초 |
| 4종 시각화 1세트 | $0.16~0.24 |
| 이미지 크기 | 1024x1024 (정방형) |
| 캐시 유효기간 | 새 기록 추가 시까지 |

### 16.11 위험과 대응

| 위험 | 대응 |
|------|------|
| codex-imagen OAuth 만료 | `--force-refresh` 옵션. 에러 시 이미지 없이 데이터만 표시 |
| 이미지 품질 불만족 | 수동 재생성 + 프롬프트 조정 |
| OpenAI API 장애 | 데이터 기반 그래프를 HTML/CSS로 대체 rendering |
| 사용자 기록 부족 | 시각화 불가 시 "아직 충분한 기록이 없습니다" 안내 |
| 개인정보 노출 | 시각화에 사용자 이름·이메일 포함 금지. 태그·감정·날짜만 사용 |

---

## 17. 최종 결정 요약

1. **500권은 후보 목표이며, 출시 기준은 검수 완료 카드다.**
2. **Project Gutenberg·Standard Ebooks의 미국 퍼블릭 도메인 표시는 한국 서비스의 자동 허가가 아니다.**
3. **Project Jikji와 한국 고전 번역문은 권리 확인 전 production에서 제외한다.**
4. **작품·판본·카드·passage·권리 manifest를 분리한다.**
5. **초기는 SQLite 전수 매칭과 결정적 기준선으로 시작하고, 임베딩·LLM은 선택적 동의 뒤에 둔다.**
6. **GET은 읽기 전용, 생성은 POST이며 input fingerprint와 버전으로 재현·캐시한다.**
7. **모든 매칭에는 근거·차이·한계·피드백 경로가 있어야 하며, 매칭이 약하면 아무것도 추천하지 않는다.**
8. **저작권·개인정보·안전·품질 gate를 통과하지 못한 콘텐츠는 사용자에게 노출하지 않는다.**
9. **시각화는 사용자 본인의 기록·주제·감정·시간 흐름을 보여주는 것이며, 인물 카드 장식이 아니다.**
