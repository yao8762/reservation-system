-- ============================================
-- Migration: 004_add_appointments_read_policy
-- Description: 啟用 appointments 的 RLS 並新增 SELECT policy
-- Fixes: /book 頁面無法正確讀取已預約時段（RLS 未啟用 + 缺少 SELECT policy）
-- Applied: 2026-06-01
-- ============================================

-- 啟用 Row Level Security（之前未啟用，導致 policies 不生效）
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 新增 SELECT policy：公開讀取（前端過濾顯示已預約/可用時段）
-- 之前 003 migration 漏掉了這個 policy
CREATE POLICY "appointments_read" ON public.appointments FOR SELECT
  USING (true);
