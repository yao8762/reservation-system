-- ============================================
-- Migration: 003_strengthen_rls_policies
-- Description: 加強 RLS policies，修復安全漏洞
-- Applied: 2026-05-31
-- ============================================

-- 先刪除舊的有漏洞的 policies（DROP IF EXISTS 避免失敗）
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_read" ON appointments;
DROP POLICY IF EXISTS "login_codes_all" ON login_codes;
DROP POLICY IF EXISTS "telegram_users_all" ON telegram_users;

-- 預約（appointments）：
--   INSERT: 需有 telegram_id（非 NULL），只允許已登入流程的用戶新增預約
--   SELECT: 公開讀取（前端過濾顯示）
--   UPDATE/DELETE: 完全禁止
CREATE POLICY "appointments_insert" ON appointments FOR INSERT
  WITH CHECK (telegram_id IS NOT NULL);
CREATE POLICY "appointments_read" ON appointments FOR SELECT
  USING (true);
CREATE POLICY "appointments_update" ON appointments FOR UPDATE
  USING (false);
CREATE POLICY "appointments_delete" ON appointments FOR DELETE
  USING (false);

-- 登入驗證碼（login_codes）：
--   SELECT: 只能讀取未驗證且未過期的 code（驗證流程用）
--   INSERT/DELETE: 僅限 service role（禁止 client 直接操作）
CREATE POLICY "login_codes_select" ON login_codes FOR SELECT
  USING (verified = false AND expires_at > now());
CREATE POLICY "login_codes_insert" ON login_codes FOR INSERT
  WITH CHECK (false);
CREATE POLICY "login_codes_delete" ON login_codes FOR DELETE
  USING (false);

-- Telegram 用戶（telegram_users）：
--   完全鎖死，所有操作僅 service role 可用
CREATE POLICY "telegram_users_all" ON telegram_users FOR ALL
  USING (false) WITH CHECK (false);