#!/usr/bin/env bash
# 식자재 구매·평가 보드 배포: 빌드 → 커밋 → push → Pages HTTP 200 확인
# 사용법: bash deploy.sh ["커밋 메시지"]
set -e
cd "$(dirname "$0")"
node build.js
node --check app.js
git add -A
if git diff --cached --quiet; then echo "변경 없음"; else
  git -c user.email="lfjwlee@insaengfood.com" -c user.name="lfjwlee-cmd" commit -q -m "${1:-deploy}"
  git push -q origin main; echo "push 완료: $(git rev-parse --short HEAD)"
fi
BASE="https://lfjwlee-cmd.github.io/foodcost-purchase"
for f in "" app.js config.js; do echo "  /$f → $(curl -s -o /dev/null -w '%{http_code}' "$BASE/$f")"; done
