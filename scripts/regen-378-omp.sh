#!/usr/bin/env bash
set -euo pipefail
# 378절 템플릿 폴백 교체 — OMP 쿼터 리셋 후 실행
# 사용: ./scripts/regen-378-omp.sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
KEYS_JSON="/tmp/regen-314-keys.json"
if [[ ! -f "$KEYS_JSON" ]]; then
  echo "Keys file not found: $KEYS_JSON"
  echo "재생성: node -e \"...\"로 /tmp/regen-314-keys.json 생성"
  exit 1
fi
echo "Regenerating 378 template fallback verses via OMP (mimo-v2.5)"
# 1. 백업
cp data/reference/crossref-commentary-work.jsonl "data/reference/crossref-commentary-work.jsonl.bak-$(date +%Y%m%d-%H%M%S)"
# 2. 378키를 work.jsonl에서 제거 (pick이 다시 잡도록)
node <<'EOS'
const fs=require('fs');
const keys=new Set(JSON.parse(fs.readFileSync('/tmp/regen-314-keys.json','utf8')));
const lines=fs.readFileSync('data/reference/crossref-commentary-work.jsonl','utf8').trim().split('\n');
const keep=lines.filter(l=>!keys.has(JSON.parse(l).key));
fs.writeFileSync('data/reference/crossref-commentary-work.jsonl', keep.join('\n')+'\n');
console.log(`Filtered: keep ${keep.length}, removed ${keys.size}`);
EOS
# 3. OMP 4레인으로 재생성 (W=8, buckets 2,4,5,6,7에 분산)
echo "Starting OMP workers for remaining 378 (expect buckets 2,4,6,7)..."
node scripts/agent-commentary-pick.mjs status 8
echo "Run: use 'node scripts/agent-commentary-pick.mjs pick 8 <wid> 8' per bucket, generate via OMP, save, then flock build"
echo "After completion: flock /tmp/eobom-commentary-rebuild.lock env COMMENTARY_BUILD_ONLY=1 node scripts/generate-crossref-commentary.mjs && bun run test"
