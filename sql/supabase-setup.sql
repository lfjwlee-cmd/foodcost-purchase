-- ============================================================
--  식자재 구매·평가 보드 — Supabase 테이블 & 보안 설정 (처음 설치용, 전체)
--  실행: Supabase 대시보드 → SQL Editor → New query → 전체 붙여넣고 Run
--  재실행 안전(if not exists). 같은 프로젝트의 다른 테이블에는 영향 없음 — 이름이 pur_ 로 분리됨.
--
--  가격 구조
--    총액 = qty(구매 수량) × unit_price(구매 단위 1개 가격)
--    content_qty / content_unit = 1개 안에 든 양(600g, 10장) — 총액 계산에 쓰지 않음, 환산단가 표시용
--    무게로 산 경우: unit = 'kg', qty = 무게, unit_price = 결제금액 ÷ 무게
-- ============================================================

create table if not exists public.pur_items (
  id             uuid primary key default gen_random_uuid(),
  no             bigint generated always as identity,          -- 화면 표시용 번호 (#12)
  date           date not null default current_date,           -- 입고일(구매한 날)
  name           text not null check (char_length(name) between 1 and 60),
  category       text not null default '기타',                 -- 육류·해산물·농산물·가공품·소스·양념·기타
  purchase_place text not null default '',                     -- 구매처(쿠팡·마트 등, 어디서 샀나)
  supplier       text not null default '',                     -- 거래처(제조·공급사)
  spec           text not null default '',                     -- 규격·원산지
  brand          text not null default '',
  qty            numeric not null check (qty > 0 and qty <= 1000000),   -- 구매 수량(개수) 또는 무게(kg)
  unit           text not null default '봉',                   -- 봉·팩·묶음·단·개·박스·병 / kg(무게 구매)
  unit_price     numeric not null default 0 check (unit_price >= 0 and unit_price <= 100000000),
  content_qty    numeric check (content_qty is null or content_qty > 0), -- 1개 안에 든 양(선택)
  content_unit   text not null default '',                     -- g·kg·ml·L·장·개
  note           text not null default '',
  requester      text not null default '',                     -- 등록한 사람(이름 직접 입력)
  -- 판정: usable 사용 가능 / later 추후 사용 / unusable 사용 불가 / null 평가 전
  ev_v           text check (ev_v in ('usable','later','unusable')),
  ev_tags        text[] not null default '{}',
  ev_comment     text not null default '' check (char_length(ev_comment) <= 200),
  ev_by          text,
  ev_at          timestamptz,
  ev_ver         integer not null default 0,                   -- 동시 편집 충돌 감지용 버전
  archived       boolean not null default false,               -- 삭제 대신 보관(되돌리기 가능)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_pur_items_date on public.pur_items(date desc);

-- 예전 버전으로 만든 테이블이면 빠진 칼럼만 추가 (새로 만든 테이블에서는 아무 일도 안 함)
alter table public.pur_items add column if not exists purchase_place text not null default '';
alter table public.pur_items add column if not exists content_qty    numeric;
alter table public.pur_items add column if not exists content_unit   text not null default '';

-- updated_at 자동 갱신
create or replace function public.pur_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_pur_touch on public.pur_items;
create trigger trg_pur_touch before update on public.pur_items
  for each row execute function public.pur_touch();

-- RLS: 로그인 없이 읽기·추가·수정 가능, 영구 삭제는 불가
alter table public.pur_items enable row level security;
drop policy if exists pur_select on public.pur_items;
drop policy if exists pur_insert on public.pur_items;
drop policy if exists pur_update on public.pur_items;
create policy pur_select on public.pur_items for select to public using (true);
create policy pur_insert on public.pur_items for insert to public with check (true);
create policy pur_update on public.pur_items for update to public using (true) with check (true);
-- delete 정책은 의도적으로 만들지 않는다.

revoke delete on public.pur_items from anon, authenticated, public;
grant select, insert, update on public.pur_items to anon, authenticated;

-- 실시간 반영 (다른 사람이 입력하면 새로고침 없이 화면에 뜸)
do $$ begin
  alter publication supabase_realtime add table public.pur_items;
exception when duplicate_object then null; end $$;

-- 검증: 기대값 → 삭제권한 false / 수정권한 true
select has_table_privilege('anon','public.pur_items','DELETE') as 삭제권한,
       has_table_privilege('anon','public.pur_items','UPDATE') as 수정권한;

-- [알고 쓸 것] 로그인이 없으므로 링크를 아는 사람은 누구나 가격·구매처를 보고 수정할 수 있다.
--             되돌릴 수 없는 손실(영구 삭제)만 막는다. 보관된 행 영구 삭제는 SQL Editor에서만 직접.
