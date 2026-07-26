# 이어봄 (eobom)

흩어진 묵상을 이어, 어제의 믿음이 오늘의 방향이 되게 하는 개인 묵상 기록 웹 서비스.

- 프로덕션: `https://eobom.ponslink.com` (app port 3120 behind nginx)
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

## 운영 체크리스트

1. Google Cloud Console OAuth 승인된 리디렉션 URI에 추가:
   - `https://eobom.ponslink.com/api/auth/callback/google`
   - `http://localhost:3100/api/auth/callback/google`
2. `.env`에 `MIMO_API_KEY` 입력 후 `sudo systemctl restart eobom`
3. 서버 경로: `/home/declan/apps/eobom`
4. 서비스: `sudo systemctl status eobom`

## SSL 자동 갱신

운영 서버(`ponslink`)는 Let's Encrypt `certbot.timer`(1일 2회)가 enabled/active 상태다.
- 인증서: `/etc/letsencrypt/live/eobom.ponslink.com/`
- renew conf: `authenticator=nginx`, `installer=nginx`, `renew_before_expiry = 30 days`
- deploy hook: `/etc/letsencrypt/renewal-hooks/deploy/00-reload-nginx.sh` (갱신 후 `nginx -t && systemctl reload nginx`)
- 만료 전 30일 이내면 자동 갱신되며, 만료되어도 timer가 계속 시도한다.

확인:
```bash
ssh ponslink 'systemctl status certbot.timer --no-pager'
ssh ponslink 'sudo certbot certificates | sed -n "/eobom/,+8p"'
ssh ponslink 'sudo certbot renew --cert-name eobom.ponslink.com --dry-run'
```
