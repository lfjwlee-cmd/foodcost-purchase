// ── Supabase 접속 설정 (예시) ──
//  새로 설치할 때: 이 파일을 config.js 로 복사한 뒤 아래 두 값만 바꾸세요.
//  값 위치: Supabase 대시보드 → Project Settings → API (또는 Connect)
//    · SUPABASE_URL      = Project URL            예) https://abcdefghijk.supabase.co
//    · SUPABASE_ANON_KEY = Publishable(anon) key  예) sb_publishable_xxxx  또는 eyJ... 로 시작하는 anon 키
//  ⚠ secret(서비스용 비밀) 키는 절대 넣지 마세요. 이 파일은 브라우저에 그대로 공개됩니다.
//    공개 키가 노출돼도 괜찮은 이유: 데이터 보호는 supabase-setup.sql 의 RLS 정책이 담당합니다.
window.PUR_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-PUBLISHABLE-OR-ANON-KEY",
};
