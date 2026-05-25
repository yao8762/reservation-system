-- ============================================
-- 按摩/美容預約系統 - Supabase Schema
-- Version: 1.0
-- ============================================

-- 技師表
CREATE TABLE technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nickname TEXT NOT NULL UNIQUE,
  specialty TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 服務項目表
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 班表表
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'night')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(technician_id, date, shift_type)
);

-- 預約表
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  client_nickname TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 初始資料
-- ============================================

-- 插入服務項目
INSERT INTO services (name, duration_minutes, price) VALUES
  ('輕紆壓按摩', 60, 800),
  ('深層組織按摩', 90, 1200),
  ('全身舒壓按摩', 120, 1600);

-- 插入技師
INSERT INTO technicians (name, nickname, specialty) VALUES
  ('王小美', '小美', '深層組織按摩'),
  ('林志傑', '阿傑', '輕壓舒緩'),
  ('張雅文', '雅文', '全身舒壓'),
  ('黃大雄', '大雄', '運動按摩'),
  ('陳琳琳', '琳琳', '臉部美容');

-- 插入測試班表（未來7天，每天3班）
DO $$
DECLARE
  tech_record RECORD;
  day_offset INTEGER;
  shift_types TEXT[] := ARRAY['morning', 'afternoon', 'night'];
  shift_times TEXT[][] := ARRAY[
    ['06:00', '14:00'],
    ['14:00', '22:00'],
    ['22:00', '06:00']
  ];
BEGIN
  FOR tech_record IN SELECT id FROM technicians LOOP
    FOR day_offset IN 0..6 LOOP
      INSERT INTO shifts (technician_id, shift_type, start_time, end_time, date)
      VALUES
        (tech_record.id, 'morning', '06:00'::TIME, '14:00'::TIME, CURRENT_DATE + day_offset),
        (tech_record.id, 'afternoon', '14:00'::TIME, '22:00'::TIME, CURRENT_DATE + day_offset),
        (tech_record.id, 'night', '22:00'::TIME, '06:00'::TIME, CURRENT_DATE + day_offset);
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- RLS 政策（Row Level Security）
-- ============================================

-- 啟用 RLS
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 技師：可以讀取自己的資料
CREATE POLICY "Technicians can view own data" ON technicians
  FOR SELECT USING (true);

-- 服務：所有人可讀
CREATE POLICY "Services are public readable" ON services
  FOR SELECT USING (true);

-- 班表：所有人可讀
CREATE POLICY "Shifts are public readable" ON shifts
  FOR SELECT USING (true);

-- 預約：所有人可新增（不需要登入也能預約）
CREATE POLICY "Appointments are public insertable" ON appointments
  FOR INSERT WITH CHECK (true);

-- ============================================
-- View：用於計算時段可用性
-- ============================================

CREATE VIEW available_slots AS
SELECT
  s.technician_id,
  s.date,
  s.shift_type,
  s.start_time,
  s.end_time,
  s.id as shift_id,
  t.nickname as technician_nickname,
  -- 計算該技師在這班的所有已預約時段
  COALESCE(
    (SELECT json_agg(json_build_array(a.start_time, a.end_time))
     FROM appointments a
     WHERE a.technician_id = s.technician_id
       AND a.date = s.date
       AND a.status = 'confirmed'),
    '[]'
  ) as booked_times
FROM shifts s
JOIN technicians t ON t.id = s.technician_id
WHERE s.date >= CURRENT_DATE;

-- ============================================
-- 函數：用於檢查時段是否可用
-- ============================================

CREATE OR REPLACE FUNCTION is_slot_available(
  p_technician_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_service_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  duration INTEGER;
  conflict_count INTEGER;
BEGIN
  -- 取得服務時長
  SELECT duration_minutes INTO duration FROM services WHERE id = p_service_id;
  
  -- 檢查是否有衝突（同一技師、同一天、重疊時段）
  SELECT COUNT(*) INTO conflict_count
  FROM appointments a
  WHERE a.technician_id = p_technician_id
    AND a.date = p_date
    AND a.status = 'confirmed'
    AND (
      -- 新時段與現有時段重疊
      (p_start_time < a.end_time AND p_end_time > a.start_time)
    );
  
  RETURN conflict_count = 0;
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
  BEFORE UPDATE ON technicians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();