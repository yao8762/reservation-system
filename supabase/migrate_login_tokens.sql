-- Migration: create login_tokens table for Telegram OAuth flow
-- Flow: user clicks link from bot → web checks token → logs in

CREATE TABLE IF NOT EXISTS login_tokens (
  id UUID DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast token lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_login_tokens_token ON login_tokens(token);
CREATE INDEX IF NOT EXISTS idx_login_tokens_telegram_id ON login_tokens(telegram_id);
CREATE INDEX IF NOT EXISTS idx_login_tokens_expires_at ON login_tokens(expires_at);

-- RLS: anyone can insert, only service role can read/write
ALTER TABLE login_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert (webhook writes tokens)
DROP POLICY IF EXISTS "login_tokens_insert" ON login_tokens;
CREATE POLICY "login_tokens_insert" ON login_tokens FOR INSERT WITH CHECK (true);

-- Allow service role to do everything
DROP POLICY IF EXISTS "login_tokens_service_all" ON login_tokens;
CREATE POLICY "login_tokens_service_all" ON login_tokens USING (true);