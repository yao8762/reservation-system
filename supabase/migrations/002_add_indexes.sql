-- 預約查詢最常用：technician_id + date
CREATE INDEX IF NOT EXISTS idx_appointments_technician_date ON appointments(technician_id, date);

-- status 過濾常用
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- 師傅班表查詢：technician_id + date
CREATE INDEX IF NOT EXISTS idx_shifts_technician_date ON shifts(technician_id, date);

-- Telegram ID 查詢
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON telegram_users(telegram_id);
