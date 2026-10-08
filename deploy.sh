#!/usr/bin/env bash
# 식자재 구매·평가 보드 배포: 빌드 → 커밋 → push → GitHub Pages 응답 확인
# 사용법: bash deploy.sh ["커밋 메시지"]
# 저장소 주소(origin)에서 Pages 주소를 자동으로 계산하므로 다른 계정·저장소에서도 그대로 쓸 수 있다.
set -e
cd "$(dirname "$0")"

if [ ! -f config.js ]; then echo "★ config.js 가 없습니다. config.example.js 를 복사해 Supabase 값을 넣으세요."; exit 1; fi
if grep -q "YOUR-PROJECT-REF" config.js; then echo "★ config.js 에 Supabase 주소·공개 키를 아직 넣지 않았습니다."; exit 1; fi

node build.js
node --check app.js

git add -A
if git diff --cached --quiet; then echo "변경 없음(푸시 생략)"; else
  git commit -q -m "${1:-deploy}"
  git push -q origin HEAD; echo "push 완료: $(git rev-parse --short HEAD)"
fi

# origin 주소 → https://<계정>.github.io/<저장소>
REMOTE="$(git remote get-url origin)"
SLUG="$(echo "$REMOTE" | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')"
OWNER="${SLUG%%/*}"; REPO="${SLUG##*/}"
BASE="https://${OWNER}.github.io/${REPO}"
echo "=== 배포 확인 (반영까지 1~2분): $BASE/ ==="
for f in "" app.js config.js; do echo "  /$f → $(curl -s -o /dev/null -w '%{http_code}' "$BASE/$f")"; done
