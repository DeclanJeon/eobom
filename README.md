# 이어봄 (eobom)

흩어진 묵상을 이어, 어제의 믿음이 오늘의 방향이 되게 하는 개인 묵상 기록 웹 서비스.

- 프로덕션: `https://eobom.ponslink.com`
- 스택: Next.js 16, Tailwind, shadcn/ui, Prisma (SQLite), NextAuth Google OAuth, MiMo V2.5

## 로컬 실행

```bash
bun install
cp .env.example .env
# GOOGLE_*, NEXTAUTH_SECRET, SMTP_*, MIMO_API_KEY 설정
bun run db:push
bun run dev
```

앱은 `http://localhost:3100` 에서 실행됩니다.

## 주요 경로

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 |
| `/login` | Google 로그인 |
| `/today` | 오늘 홈 |
| `/entries` | 기록 목록/작성/상세 |
| `/reviews` | AI 회고 |
| `/together` | 익명 공유 |
| `/me` | 내 정보/설정/QR/내보내기 |
| `/j/[slug]` | 개인 묵상기록지 (QR 대상) |
| `/contact` | 문의하기 |

## 환경 변수

`.env.example` 참고. Google OAuth 콜백:

- 로컬: `http://localhost:3100/api/auth/callback/google`
- 운영: `https://eobom.ponslink.com/api/auth/callback/google`

MiMo:

- `MIMO_BASE_URL=https://api.xiaomimimo.com/v1`
- `MIMO_MODEL=mimo-v2.5-pro`
- `MIMO_API_KEY=` (사용자 입력)

## 배포

```bash
./deploy/deploy.sh
```

nginx 예시는 `deploy/nginx-eobom.conf` 를 참고하세요.
