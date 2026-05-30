export interface Technician {
  id: string;
  name: string;
  nickname: string;
  specialty: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface Appointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  technician_id: string;
  technician_nickname: string;
  service_id: string;
  service_name: string;
  service_duration: number;
  client_nickname: string;
  client_phone: string;
  status: string;
  price: number;
  telegram_id?: string;
}

export interface Shift {
  id: string;
  technician_id: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date?: string;
}

export interface Stats {
  todayCount: number;
  todayRevenue: number;
  monthCount: number;
  monthRevenue: number;
}

export interface TechStat {
  nickname: string;
  bookings: number;
  revenue: number;
}

export type Tab = "appointments" | "schedule" | "stats" | "technicians" | "clients" | "services";
export type DateRange = "today" | "tomorrow" | "week";
