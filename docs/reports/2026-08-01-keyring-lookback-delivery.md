# 이어봄 구현·배포 보고서 — 2026-08-01

- 범위: 키링 접근 제어, 돌아보기 재설계, 리뷰 보안·견고성 수정, 최종 후속 리스크 해소
- 브랜치: `main`
- 상태: 커밋·푸시·배포 전

---

## 1. 요약

키링 claim·기기 인증 경계를 재작성하고, `/lookback` 중심의 회고 흐름을 정리했으며,
리뷰·이미지 생성·업로드·callback URL 경로의 보안 및 견고성 결함을 수정했다.
최종 후속 작업으로 동시 기기 등록 cap race와 redirect host fallback도 해소했다.

---

## 2. 완료 작업

### 2.1 키링 접근 제어

- `UserDevice` 모델 추가
- 32바이트 기기 토큰 발급, DB에는 SHA-256 해시만 저장
- 사용자당 활성 기기 5개 제한 및 오래된 기기 revoke
- `/j/[slug]` 접근 분기 재작성
  - unclaimed 게스트
  - unclaimed 로그인 사용자
  - claimed 소유자 기기
  - claimed 소유자 미등록 기기
  - claimed 비소유자·게스트
- claim API를 명시적 POST로 제한
- claim API GET은 405 반환
- claim 성공 시 기기 쿠키 발급
- `claimSeat` CAS 적용으로 동시 claim race 차단
- OAuth signup에서 claim을 `personalSlug` 확정 전에 수행
- 번호형 slug 정규화(`e1`, `e00001` → `e01`)
- malformed JSON shape를 400으로 거부
- device route의 cross-site Fetch Metadata 요청 차단
- 동시 기기 등록 시 사용자 row write lock으로 cap sequence 직렬화

### 2.2 돌아보기 재설계

- `/lookback`: 회고 목록 및 최신 시각화 썸네일
- `/lookback/[id]`: 회고 본문·이야깃거리·시각화 한 화면 흐름
- `/reviews`, `/reviews/[id]`: 요청 origin을 유지하는 literal 301 redirect
- `/reviews` middleware 보호 게이트 제거
- `LookbackTabs` 삭제 및 호출처 정리
- story-mirror breadcrumb 정리
- `/lookback` robots disallow 반영
- 썸네일 image URL 재파싱 제거

### 2.3 리뷰·보안·견고성

- SSH image generation 원격 인자 검증 및 remote path 인용
- callback URL open redirect 방지
- uploads API 인증 경계 보강
- 외부 API timeout 적용
- visualization/RAG rate limit 보강
- story-mirror feedback을 실제 match feedback API에 연결
- story-mirror runs N+1 조회 제거
- visualization fingerprint에 `updatedAt` 반영
- 불필요한 feedback GET 제거

### 2.4 증명·문서

- `docs/design/keyring-invariants-proof-v1.md`
- `docs/design/keyring-access-control-v1.md`
- `docs/design/lookback-redesign-v1.md`
- 관련 work-order 3건
- 키링 소유권·인증 경계·개인정보 비노출·claim 원자성·slug parser·외부 호출 경계 증명

---

## 3. 검증

| 항목 | 결과 |
|---|---|
| 전체 테스트 | **262 pass / 0 fail** |
| TypeScript | `npx tsc --noEmit` clean |
| Production build | `bun run build` 성공 |
| 변경 파일 lint | clean |
| 동시 기기 cap 테스트 | 통과 |
| 301 redirect origin 테스트 | 통과 |

주요 테스트 파일:

- `tests/claim-api.test.ts`
- `tests/keyring-access.test.ts`
- `tests/lookback-redesign.test.ts`
- `tests/safe-callback-url.test.ts`
- `tests/seats.test.ts`
- `tests/story-mirror-cache.test.ts`

---

## 4. 독립 리뷰

- SecurityReview: **APPROVE** (초기 지적 수정 후 회신)
- ArchReview: 초기 지적 확인·수정 완료
- PostFixReview: **APPROVE** (네임스페이스·소유권/동의 게이트 재검토)

---

## 5. 의도적으로 남긴 범위

- middleware는 DB session을 읽지 않는 soft gate이며, 실제 권한은 서버/API 인증 경계가 담당한다.
- 로그인 세션·외부 AI 키를 사용하는 live browser E2E는 실행하지 않았다.
- 배포는 `deploy/deploy.sh`의 rsync 경로를 사용한다. production DB·`.env`·uploads·시각화 자산은 rsync 제외 대상이다.

---

## 6. 커밋·푸시·배포 체크

| 항목 | 상태 | 증거 |
|---|---|---|
| 로컬 커밋 | ✅ | `d7c9e98`, `f3b17ef`, `52c31e1` |
| `origin/main` 푸시 | ✅ | `main` push 완료, 최신 `52c31e1` |
| production 배포 | ✅ | `deploy/deploy.sh --remote` 성공, systemd `active`, `home:200` |
| production health | ✅ | `GET https://eobom.ponslink.com/api/health` → **200**, `{"ok":true,"service":"eobom"}` |

---

## 7. 종료 판정

코드 커밋·push·rsync 배포·health check는 완료됐다.
`/reviews?cachebust=...`와 `/reviews/[id]`는 canonical public URL + `no-store`를 반환한다.
다만 Cloudflare가 이전 exact `/reviews` 301을 edge에 캐시하고 있어, purge 권한을 확보하기 전까지
캐시 HIT 요청은 기존 `localhost` Location을 반환할 수 있다. origin 수정은 완료됐고 cache TTL 만료 또는
Cloudflare URL purge 후 정상 상태가 된다.
