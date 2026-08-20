# Rate Limit v1 — Redis 분산 + In-Memory Fallback

## 목표
단일 인스턴스 Map 슬라이딩 윈도에서 분산 환경으로 확장하되, Redis 장애 시에도 서비스가 중단되지 않도록 fallback을 보장한다.

## 결정
- 구현 위치: `src/lib/rate-limit.ts` — `checkRateLimit(key, {limit, windowMs, now?})`
- 분산 저장소: **Redis (ioredis optional)**. `REDIS_URL` env가 있으면 활성화, 없거나 모듈 미설치 시 `null`로 비활성화.
- Import: `try { require("ioredis") } catch { redis = null }` — optional peer, 빌드 타임 의존성 아님.
- Fallback: 기존 `Map<string, number[]>` 슬라이딩 윈도 그대로 유지. Redis 에러 시 catch 후 메모리 경로로 폴백.

## 동작

### Redis 분산 경로
```
key = `ratelimit:${원본key}`   // 예: ratelimit:rag:stream:<userId>
pipeline:
  INCR ratelimit:<key>
  PEXPIRE ratelimit:<key> <windowMs> NX   // 첫 생성 시에만 TTL 부여 → 고정 윈도
exec → count
if count > limit:
  PTTL ratelimit:<key> → retryAfterSec = ceil(pttl/1000)
  return {ok:false, retryAfterSec}
else:
  return {ok:true, remaining: limit - count}
```
- `PEXPIRE ... NX`로 매 요청마다 TTL이 리셋되지 않아 카운터가 윈도 종료 시 자동 소멸한다.
- `count > limit`인 요청은 증가된 카운터를 유지하나 윈도가 끝나면 리셋되므로 별도 보상 불필요.
- Redis 장애/타임아웃 시 catch → 메모리 폴백.

### In-Memory Fallback 경로
```
cutoff = now - windowMs
active = buckets.get(key).filter(t => t > cutoff)
if active.length >= limit:
  retryAfterSec = ceil((active[0] + windowMs - now)/1000)
  return {ok:false}
active.push(now)
buckets.set(key, active)
return {ok:true, remaining: limit - active.length}
```
- 프로세스 재시작 시 리셋 — 단일 인스턴스 배포에서 허용된 제약.
- `HOUR_MS`, `MINUTE_MS` 상수 유지.

### API
```ts
export async function checkRateLimit(
  key: string,
  opts: {limit:number; windowMs:number; now?:number}
): Promise<RateLimitResult>

export type RateLimitResult = {ok:true; remaining:number} | {ok:false; retryAfterSec:number}
export function resetRateLimitForTests(): void // Map clear + redis flushall best-effort
export function getRedisClient(): RedisLike | null
```

## 호출처
모든 호출처는 `await checkRateLimit(...)`로 변경됨 (async 확장):
- `src/app/api/story-mirror/visualize/route.ts` — `visualize:generate:<userId>`
- `src/app/api/story-mirror/rag/runs/stream/route.ts` — `rag:stream:<userId>`
- `src/app/api/uploads/route.ts`, `src/app/api/together/media/route.ts` — `uploads:<userId>`
- `src/app/api/contact/route.ts`, `src/app/api/reviews/route.ts`, `src/app/api/together/route.ts`, `src/app/api/together/tags/route.ts`
- `src/app/api/story-mirror/story-visual/route.ts`

`LIMITS`는 `RATE_LIMITS` 상수에 정의 — `reviewsCreate 5/min`, `togetherCreate 20/min`, `uploads 40/min`, `visualizationGenerate 10/min`, `ragStream 30/min` 등.

## 운영
- `REDIS_URL` 미설정 환경(로컬/테스트): 메모리 경로만 동작, 추가 인프라 불필요.
- Redis 설정 환경(프로덕션 분산): 모든 인스턴스가 동일한 카운터를 공유.
- 모니터링: `getRedisClient()`로 연결 상태 확인 가능.

## 테스트
- `tests/rate-limit.test.ts` — 메모리 경로 (limit, window slide, retryAfter, body shape)
- Redis 경로는 통합 테스트에서 `REDIS_URL` 설정 후 수동 검증; 단위 테스트는 fallback 경로만 커버.

## 비고
- YAGNI: Lua 스크립트, sliding log(ZSET) 등 정교한 알고리즘은 트래픽이 고정 윈도로 충분하므로 도입하지 않음.
- 향후 필요 시 ZSET 기반 sliding window로 교체 가능 — 인터페이스는 유지.
