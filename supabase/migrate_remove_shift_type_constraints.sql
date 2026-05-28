-- ============================================
-- Migration: Remove shift_type constraints
-- Date: 2026-05-27
--
-- 目的：廢除以 shift_type 作為班別分類的設計，
-- 未來班別只靠 start_time / end_time 決定。
-- 刪除 CHECK constraint 讓 shift_type 可以任意值或 null，
-- 刪除 UNIQUE constraint 讓同一天可以有多筆班表。
-- ============================================

BEGIN;

-- 1. 移除 CHECK constraint (shift_type IN ('morning','afternoon','night','custom'))
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_shift_type_check;

-- 2. 移除 UNIQUE constraint (technician_id, date, shift_type)
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_technician_id_date_shift_type_key;

-- 3. （選擇性）允許 shift_type 為 NULL
-- 原本 NOT NULL，但如果前端不再傳這個欄位，null 也沒問題
-- 註解掉，等確定沒問題再執行：
-- ALTER TABLE shifts ALTER COLUMN shift_type DROP NOT NULL;

COMMIT;
