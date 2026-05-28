-- ============================================
-- 登入驗證碼資料表（取代 in-memory storage）
-- ============================================

CREATE TABLE IF NOT EXISTS login_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  phone TEXT NOT NULL,
  telegram_id TEXT,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：加速以 code 查詢
CREATE INDEX IF NOT EXISTS login_codes_code_idx ON login_codes(code);

-- 索引：加速以 phone 查詢
CREATE INDEX IF NOT EXISTS login_codes_phone_idx ON login_codes(phone);

-- ============================================
-- RLS：公开读写（简单方案）
-- ============================================
ALTER TABLE login_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_codes public" ON login_codes;
CREATE POLICY "login_codes public" ON login_codes
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 自動清理：刪除 10 分鐘前的舊記錄
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_login_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM login_codes WHERE expires_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- 定期執行（如果 Supabase 支援 pg_cron）
-- 或在 API 裡每次順便清理