# 식자재 구매·평가 보드

메뉴개발팀이 샘플 식자재를 **언제·어디서·얼마에 샀는지** 기록하고, 품목마다 **사용 가능 / 추후 사용 / 사용 불가**를 판정하는 웹 보드입니다.
로그인 없이 폰·PC 브라우저로 열고, 여러 사람이 입력한 내용이 실시간으로 공유됩니다.

- 운영 주소: https://lfjwlee-cmd.github.io/foodcost-purchase/
- 구성: 정적 웹페이지(GitHub Pages) + Supabase(데이터 저장)
- 빌드: `src/app.jsx` → `app.js` (Node로 JSX만 변환, 번들러 없음)

---

## 다른 PC에서 시작하기

### 준비물
| 도구 | 용도 | 설치 (Windows) |
|---|---|---|
| Git | 저장소 받기·올리기 | `winget install Git.Git` |
| Node.js 18 이상 | 빌드·로컬 미리보기 | `winget install OpenJS.NodeJS.LTS` |

처음 쓰는 PC라면 Git에 이름과 이메일을 한 번 등록합니다.
```bash
git config --global user.name "깃허브 아이디"
git config --global user.email "깃허브 이메일"
```

### A. 지금 쓰는 보드를 이어서 고칠 때 (같은 Supabase 사용)
`config.js`에 운영 중인 Supabase 공개 키가 이미 들어 있으므로 **추가 설정이 없습니다.**
```bash
git clone https://github.com/lfjwlee-cmd/foodcost-purchase.git
cd foodcost-purchase
npm install          # 빌드 도구(Babel) 설치, 최초 1회
node build.js        # src/app.jsx → app.js
node serve.js        # http://localhost:4600 에서 확인
```
고친 뒤 올리기: `bash deploy.sh "무엇을 바꿨는지"` (빌드 → 커밋 → push → 사이트 응답 확인까지 한 번에)

### B. 완전히 새로 만들 때 (새 Supabase · 새 저장소)
바꿔야 하는 건 **Supabase 주소와 공개 키 두 개뿐**입니다.

1. **Supabase 프로젝트 만들기** — https://supabase.com 에서 New project.
2. **테이블 만들기** — 대시보드 → SQL Editor → New query → [`sql/supabase-setup.sql`](sql/supabase-setup.sql) 전체 붙여넣고 **Run**.
   맨 아래 결과가 `삭제권한 false / 수정권한 true`면 정상입니다.
3. **공개 키 넣기** — `config.example.js`를 `config.js`로 복사하고 두 값을 바꿉니다.
   - 위치: Project Settings → API (또는 상단 Connect)
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = **Publishable(anon) 키**
   - ⚠ secret(서비스용 비밀) 키는 절대 넣지 마세요. 이 파일은 웹에 그대로 공개됩니다.
4. **로컬 확인** — `npm install` → `node build.js` → `node serve.js` → http://localhost:4600
5. **GitHub에 올리기** — GitHub에서 새 저장소(Public) 생성 후
   ```bash
   git remote set-url origin https://github.com/<계정>/<저장소>.git
   git push -u origin main
   ```
6. **사이트 켜기** — 저장소 Settings → Pages → Branch `main` / `/(root)` → Save.
   1~2분 뒤 `https://<계정>.github.io/<저장소>/` 에서 열립니다. 이후 수정은 `bash deploy.sh`.

---

## 폴더 구조
```
├─ index.html              페이지 뼈대 + CDN 라이브러리(React·Tailwind·Recharts·lucide·supabase-js)
├─ config.js               Supabase 주소·공개 키 (운영값)
├─ config.example.js       새로 설치할 때 복사해서 쓰는 예시
├─ src/app.jsx             ★ 화면 소스 — 고칠 곳은 여기
├─ app.js                  빌드 결과물 (직접 고치지 말 것, node build.js 가 덮어씀)
├─ build.js                JSX → JS 변환
├─ serve.js                로컬 미리보기 서버 (포트 4600)
├─ deploy.sh               빌드·커밋·push·배포 확인
├─ sql/
│  ├─ supabase-setup.sql   처음 설치용 전체 SQL
│  └─ migrations/          기존 DB를 고칠 때 쓴 변경 SQL (기록용)
└─ docs/개발기록.md         지금까지의 변경 이력과 설계 결정
```

## 주요 기능
- **구매 기록**: 입고일(필수·달력) · 품목 · 구매처 · 거래처 · 분류 · 브랜드
  - **개수로 샀어요**: `몇 봉 샀나요 × 1봉 가격 = 총액`, `1봉에 든 양`(600g, 10장)은 기록용 → kg당·장당 단가 자동
  - **무게로 샀어요**: 저울 무게(kg) + 영수증 결제 금액 → kg당 단가 자동
- **판정·한 줄 평**: 사용 가능 / 추후 사용 / 사용 불가 버튼 한 번에 저장, 태그·코멘트
- **보기**: 리스트(구매처 → 분류 → 품목 접기식) · 달력(날짜별 구매처 금액) · 통계(일자별·요일별·구매처별·거래처별·분류별 지출, 판정별 금액, 보류·불가 사유)
- **함께 쓰기**: 실시간 반영, 같은 날·품목·구매처 중복 입력 시 누가 넣었는지 경고, 동시에 판정을 바꾸면 충돌 안내
- **삭제**: 영구 삭제 대신 보관(되돌리기 가능)

## 데이터 구조 (`pur_items`)
| 칼럼 | 뜻 |
|---|---|
| `date` | 입고일(구매한 날) |
| `name` / `category` / `brand` | 품목명 / 분류 / 브랜드 |
| `purchase_place` / `supplier` | 구매처(어디서 샀나) / 거래처(제조·공급사) |
| `qty` / `unit` / `unit_price` | 구매 수량 / 구매 단위 / 단위 1개 가격 → **총액 = qty × unit_price** |
| `content_qty` / `content_unit` | 1개에 든 양 (총액 계산에 안 씀) |
| `ev_v` / `ev_tags` / `ev_comment` / `ev_by` / `ev_ver` | 판정 / 태그 / 한 줄 평 / 평가자 / 충돌 감지 버전 |
| `requester` / `archived` | 등록자 이름 / 보관 여부 |

## 알고 쓸 것
- **로그인이 없습니다.** 주소를 아는 사람은 누구나 가격·구매처를 보고 수정할 수 있습니다. 영구 삭제만 막혀 있습니다.
- 작성자 이름은 각 기기 브라우저에 저장됩니다(처음 접속 시 한 번 입력).
- 이 저장소는 **공개**입니다. 실제 구매 데이터·가격이 담긴 파일(백업 JSON, 데이터 이전 SQL)은 `.gitignore`로 제외합니다.

## 문제 해결
| 증상 | 원인·해결 |
|---|---|
| "pur_items 테이블이 없습니다" | `sql/supabase-setup.sql`을 아직 실행하지 않음 |
| "config.js에 … 아직 넣지 않았습니다" | `config.js`의 예시 값을 실제 Supabase 값으로 교체 |
| 화면이 하얗게 멈춤 | 브라우저 콘솔 확인. lucide-react 0.263.1에 없는 아이콘 이름을 쓰면 멈춤(예: `UserRound` → `User`) |
| 고쳤는데 사이트가 그대로 | Pages 반영에 1~2분. 강력 새로고침(Ctrl+F5) |
| 저장 시 칼럼 오류 | 예전 DB면 `sql/supabase-setup.sql`을 한 번 더 실행(빠진 칼럼만 추가됨) |
