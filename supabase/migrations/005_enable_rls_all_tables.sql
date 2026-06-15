-- ============================================
-- Migration: 005_enable_rls_all_tables
-- Description: 修復 4 個 public table 的 RLS 漏洞（services, shifts, technicians, telegram_users）
--              根據 2026-06-11 Supabase 安全警告（rls_disabled_in_public rule）
--
-- 測試方法：使用 anon key（sb_publishable_lOy6FWvc2E0I4IGDkv8f8g_2hUn-eOd）透過 REST API 模擬前端存取
--
-- Current state（migration 前測試）:
--   services:       RLS ON, SELECT ✅, INSERT ❌, UPDATE ❌
--   technicians:    RLS ON, SELECT ✅, INSERT ❌, UPDATE ❌
--   shifts:         RLS ON, SELECT ✅, INSERT ✅ (admin uses anon key), UPDATE ❌, DELETE ✅
--   telegram_users: RLS ON, all ops ❌ ✅（正確，policy: USING(false) WITH CHECK(false)）
--
-- Security risk:
--   telegram_users：員工、用戶 TG ID（GDPR/個資法風險）
--   shifts/technicians：員工個資（姓名、班表）
--   services：無個資，風險低
--
-- Architecture note（影響 policy 設計）:
--   shifts INSERT/DELETE 由 admin panel 透過 ANON key 直接调用 REST API
--   （src/app/admin/AdminClient.tsx / Tabs/ScheduleTab.tsx 使用 apiFetch，key 為 ANON key）
--   若要限制 shifts INSERT 需同步修改 app code（新增 service role API route）
--   因此 shifts INSERT 暫維持公開（與 SELECT 一致），待後續架構優化
-- ============================================

BEGIN;

-- ──────────────────────────────────────────────
-- 1. services
-- ──────────────────────────────────────────────
-- 現狀：RLS ON，SELECT 已有 policy（開放讀取），INSERT/UPDATE 無 policy
-- 修法：
--   - SELECT 維持公開（前端 /book 頁面顯示服務項目）
--   - INSERT/UPDATE/DELETE 限定 service role（/api/services route）
--   - services 無個資，風險較低，INSERT 鎖死即可

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select" ON public.services;
CREATE POLICY "services_select" ON public.services
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "services_insert" ON public.services;
CREATE POLICY "services_insert" ON public.services
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "services_update" ON public.services;
CREATE POLICY "services_update" ON public.services
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "services_delete" ON public.services;
CREATE POLICY "services_delete" ON public.services
  FOR DELETE USING (false);

-- ──────────────────────────────────────────────
-- 2. technicians
-- ──────────────────────────────────────────────
-- 現狀：RLS ON，SELECT 已有 policy（開放讀取），INSERT/UPDATE 無 policy
-- 修法：
--   - SELECT 維持公開（前端顯示技師列表）
--   - INSERT/DELETE 限定 service role（管理員才能新增/刪除技師）
--   - UPDATE 限定 service role（管理員才能編輯技師資料）

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "technicians_select" ON public.technicians;
CREATE POLICY "technicians_select" ON public.technicians
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "technicians_insert" ON public.technicians;
CREATE POLICY "technicians_insert" ON public.technicians
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "technicians_update" ON public.technicians;
CREATE POLICY "technicians_update" ON public.technicians
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "technicians_delete" ON public.technicians;
CREATE POLICY "technicians_delete" ON public.technicians
  FOR DELETE USING (false);

-- ──────────────────────────────────────────────
-- 3. shifts
-- ──────────────────────────────────────────────
-- 現狀：RLS ON，SELECT 已開放（正確），INSERT/DELETE 測試可通行（admin panel 用 anon key）
-- 修法：
--   - SELECT 維持公開（/book 頁面 + admin 都要讀取）
--   - INSERT/DELETE 維持公開（與 SELECT 行為一致，admin 用 anon key 寫入）
--     ⚠️ 若未來 admin 改用 service role，可將此改為 WITH CHECK (false)
--   - UPDATE 限定 service role（目前 UPDATE 測試不通過，可考慮更嚴格限制）

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shifts_select" ON public.shifts;
CREATE POLICY "shifts_select" ON public.shifts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "shifts_insert" ON public.shifts;
CREATE POLICY "shifts_insert" ON public.shifts
  FOR INSERT WITH CHECK (true);  -- 維持與 SELECT 一致的開放政策（配合 admin panel anon key 架構）

DROP POLICY IF EXISTS "shifts_update" ON public.shifts;
CREATE POLICY "shifts_update" ON public.shifts
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "shifts_delete" ON public.shifts;
CREATE POLICY "shifts_delete" ON public.shifts
  FOR DELETE USING (false);

-- ──────────────────────────────────────────────
-- 4. telegram_users
-- ──────────────────────────────────────────────
-- 現狀：003 migration 已建立 "telegram_users_all" policy（USING(false) WITH CHECK(false)）
--       但忘了 ENABLE ROW LEVEL SECURITY，導致 policy 未生效
-- 修法：正式啟用 RLS，確保 policy 生效
--       003 的 policy 已正確設定（僅 service role 可用），此 migration 確認 RLS 啟用

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- 確保 policy 存在（003 migration 已建立，005 確保 RLS 啟用後 policy 生效）
DROP POLICY IF EXISTS "telegram_users_all" ON public.telegram_users;
CREATE POLICY "telegram_users_all" ON public.telegram_users
  FOR ALL USING (false) WITH CHECK (false);

COMMIT;
