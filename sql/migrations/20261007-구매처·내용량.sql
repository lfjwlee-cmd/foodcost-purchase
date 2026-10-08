-- ============================================================
--  2026-10-07 구매처·내용량 칼럼 추가 (비파괴 — 칼럼만 추가, 기존 행 값은 그대로)
--  실행 위치: https://supabase.com/dashboard/project/aosqvruvmhaumckwuidn/sql/new
--  재실행 안전.
--  가격 구조: 총액 = qty(구매 수량) × unit_price(구매 단위 1개 가격)
--             content_qty/content_unit = 1개 안에 든 양(600g, 10장) — 총액 계산에 쓰지 않음
-- ============================================================
alter table public.pur_items add column if not exists purchase_place text not null default '';   -- 구매처(쿠팡·퀀마트 등)
alter table public.pur_items add column if not exists content_qty   numeric;                     -- 내용량 숫자(선택)
alter table public.pur_items add column if not exists content_unit  text not null default '';    -- 내용량 단위 g·kg·ml·L·장·개

do $$ begin
  alter table public.pur_items add constraint pur_items_content_qty_chk check (content_qty is null or content_qty > 0);
exception when duplicate_object then null; end $$;

-- 확인: 새 칼럼 3개가 보이면 정상
select column_name, data_type, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'pur_items'
   and column_name in ('purchase_place', 'content_qty', 'content_unit');
