-- ============================================
-- 按摩/美容預約系統 - Supabase Schema
-- Version: 2.0 (2026-05-26)
-- ============================================

-- 技師表
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nickname TEXT NOT NULL UNIQUE,
  specialty TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 服務項目表
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 班表表
-- date = 這天是「服務日」，代表凌晨時段屬於這天
-- 例：date=2026-05-27 的 night shift = 2026-05-27 22:00 ~ 2026-05-28 06:00，涵蓋 05-28 00:00-02:00
-- end_date = 班表實際結束日期（跨日班時為 date + 1 天，一般班同 date）
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 預約表
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  client_nickname TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  date DATE NOT NULL,                          -- 服務發生的日曆日（用於夜班的「服務日」邏輯）
  start_time TIME NOT NULL,                   -- 服務開始時間（可能是 00:00 表示凌晨）
  end_time TIME NOT NULL,                      -- 服務結束時間（slotStart + serviceDuration）
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  telegram_id TEXT                              -- Telegram 用戶 ID（可為 NULL）
);

-- ============================================
-- 登入驗證碼資料表
-- ============================================
CREATE TABLE IF NOT EXISTS login_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  phone TEXT NOT NULL,                         -- 實際存 first_name
  telegram_id TEXT,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS login_codes_code_idx ON login_codes(code);
CREATE INDEX IF NOT EXISTS login_codes_phone_idx ON login_codes(phone);
CREATE INDEX IF NOT EXISTS login_codes_expires_at ON login_codes(expires_at);

-- ============================================
-- Telegram 用戶（白名單/黑名單）
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  is_whitelisted BOOLEAN DEFAULT FALSE,
  is_blacklisted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telegram_users_telegram_id_idx ON telegram_users(telegram_id);

-- ============================================
-- RLS 政策（Row Level Security）
-- ============================================
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

-- 技師/服務/班表：公開讀取
CREATE POLICY "technicians_read" ON technicians FOR SELECT USING (true);
CREATE POLICY "services_read" ON services FOR SELECT USING (true);
CREATE POLICY "shifts_read" ON shifts FOR SELECT USING (true);

-- 預約：公開新增（準系統保安，取決於前端簡單驗證）
CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "appointments_read" ON appointments FOR SELECT USING (true);

-- login_codes / telegram_users：公開讀寫（Bot webhook 寫入，前端讀取驗證）
CREATE POLICY "login_codes_all" ON login_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "telegram_users_all" ON telegram_users FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 自動清理：刪除 10 分鐘前的舊登入碼
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_login_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM login_codes WHERE expires_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 觸發器：更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_technicians_updated_at
  BEFORE UPDATE ON technicians FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_telegram_users_updated_at
  BEFORE UPDATE ON telegram_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 初始資料（如果還沒有任何技師）
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM technicians LIMIT 1) THEN
    INSERT INTO services (name, duration_minutes, price) VALUES
      ('輕紆壓按摩', 60, 800),
      ('深層組織按摩', 90, 1200),
      ('全身舒壓按摩', 120, 1600);

    INSERT INTO technicians (name, nickname, specialty) VALUES
      ('王小美', '小美', '深層組織按摩'),
      ('林志傑', '阿傑', '輕壓舒緩'),
      ('張雅文', '雅文', '全身舒壓'),
      ('黃大雄', '大雄', '運動按摩'),
      ('陳琳琳', '琳琳', '臉部美容');

    -- 插入未來 7 天班表（每天 3 班）
    INSERT INTO shifts (technician_id, start_time, end_time, date, end_date)
    SELECT
      t.id,
      s.start_time,
      s.end_time,
      d.d::DATE,
      CASE WHEN s.start_time > s.end_time THEN d.d::DATE + 1 ELSE d.d::DATE END
    FROM technicians t
    CROSS JOIN (VALUES
      ('06:00'::TIME, '14:00'::TIME),
      ('14:00'::TIME, '22:00'::TIME),
      ('22:00'::TIME, '06:00'::TIME)
    ) AS s(start_time, end_time)
    CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', '1 day') AS d(d)
    ON CONFLICT (technician_id, date) DO NOTHING;
  END IF;
END $$;
