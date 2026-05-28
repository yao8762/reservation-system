export interface Service {
  id: string
  name: string
  duration_minutes: number
  price: number
}

export interface Technician {
  id: string
  name: string
  nickname: string
  specialty: string
  photo_url?: string
}

export interface Shift {
  id: string
  technician_id: string
  shift_type: 'morning' | 'afternoon' | 'night'
  start_time: string
  end_time: string
  date: string
  end_date?: string
}

export interface Appointment {
  id: string
  technician_id: string
  service_id: string
  client_nickname: string
  client_phone: string
  date: string
  start_time: string
  end_time: string
  status: 'confirmed' | 'cancelled' | 'completed'
  created_at?: string
  // Joined fields
  technician_nickname?: string
  service_name?: string
  service_price?: number
}

export interface TimeSlot {
  time: string
  available: boolean
}

// 班表時段：讀取環境變數，若未設定則用預設值
const SHIFT_MORNING_START = process.env.NEXT_PUBLIC_SHIFT_MORNING_START || '06:00'
const SHIFT_MORNING_END = process.env.NEXT_PUBLIC_SHIFT_MORNING_END || '14:00'
const SHIFT_AFTERNOON_START = process.env.NEXT_PUBLIC_SHIFT_AFTERNOON_START || '14:00'
const SHIFT_AFTERNOON_END = process.env.NEXT_PUBLIC_SHIFT_AFTERNOON_END || '22:00'
const SHIFT_NIGHT_START = process.env.NEXT_PUBLIC_SHIFT_NIGHT_START || '22:00'
const SHIFT_NIGHT_END = process.env.NEXT_PUBLIC_SHIFT_NIGHT_END || '06:00'

export const SHIFT_LABELS = {
  morning: `早班 (${SHIFT_MORNING_START}-${SHIFT_MORNING_END})`,
  afternoon: `中班 (${SHIFT_AFTERNOON_START}-${SHIFT_AFTERNOON_END})`,
  night: `晚班 (${SHIFT_NIGHT_START}-${SHIFT_NIGHT_END})`
}

export const SHIFT_TIMES = {
  morning: { start: SHIFT_MORNING_START, end: SHIFT_MORNING_END },
  afternoon: { start: SHIFT_AFTERNOON_START, end: SHIFT_AFTERNOON_END },
  night: { start: SHIFT_NIGHT_START, end: SHIFT_NIGHT_END }
}