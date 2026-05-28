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

export const SHIFT_LABELS = {
  morning: '早班 (06:00-14:00)',
  afternoon: '中班 (14:00-22:00)',
  night: '晚班 (22:00-06:00)'
}

export const SHIFT_TIMES = {
  morning: { start: '06:00', end: '14:00' },
  afternoon: { start: '14:00', end: '22:00' },
  night: { start: '22:00', end: '06:00' }
}