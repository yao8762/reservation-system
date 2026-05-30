"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetchAllSafe } from "@/lib/api";
import type {
  Technician,
  Service,
  Appointment,
  Shift,
  Stats,
  TechStat,
} from "./types";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export function useAdminData() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [allReservations, setAllReservations] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({
    todayCount: 0,
    todayRevenue: 0,
    monthCount: 0,
    monthRevenue: 0,
  });
  const [techStats, setTechStats] = useState<TechStat[]>([]);
  const [calendarShifts, setCalendarShifts] = useState<Shift[]>([]);

  function buildCalendar() {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 13);
    const days: string[] = [];
    const start = new Date(today);
    while (start <= end) {
      days.push(start.toISOString().split("T")[0]);
      start.setDate(start.getDate() + 1);
    }
    const allShifts: Shift[] = [];
    days.forEach((day) => {
      technicians.forEach((tech) => {
        const existing = shifts.filter(
          (s) => s.technician_id === tech.id && s.date === day,
        );
        existing.forEach((s) => allShifts.push(s));
      });
    });
    setCalendarShifts(allShifts);
  }

  async function fetchData() {
    try {
      const today = getToday();
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStr = monthStart.toISOString().split("T")[0];

      const [allAppointments, techData, svcData, shiftData] = await Promise.all([
        apiFetchAllSafe<any>('appointments', `date=gte.${today}&order=date.asc,start_time.asc`),
        apiFetchAllSafe<any>('technicians', 'order=nickname.asc'),
        apiFetchAllSafe<any>('services'),
        apiFetchAllSafe<any>('shifts', `date=gte.${today}&order=date.asc`),
      ]);

      const techMap: Record<string, string> = {};
      techData.forEach((t: any) => {
        techMap[t.id] = t.nickname;
      });
      const svcMap: Record<
        string,
        { name: string; price: number; duration_minutes: number }
      > = {};
      svcData.forEach((s: any) => {
        svcMap[s.id] = {
          name: s.name,
          price: s.price,
          duration_minutes: s.duration_minutes,
        };
      });

      const transformed = (allAppointments || []).map((a: any) => ({
        ...a,
        technician_nickname: techMap[a.technician_id] || "未知",
        service_name: svcMap[a.service_id]?.name || "未知",
        service_duration: svcMap[a.service_id]?.duration_minutes || 60,
        price: svcMap[a.service_id]?.price || 0,
      }));
      setAppointments(transformed);
      setTechnicians(techData);
      setServices(svcData);
      setShifts(shiftData || []);

      const todayApts = (allAppointments || []).filter(
        (a: any) => a.date === today && a.status === "confirmed",
      );
      const monthApts = (allAppointments || []).filter(
        (a: any) => a.date >= monthStr && a.status === "confirmed",
      );

      setStats({
        todayCount: todayApts.length,
        todayRevenue: todayApts.reduce(
          (s: number, a: any) => s + (svcMap[a.service_id]?.price || 0),
          0,
        ),
        monthCount: monthApts.length,
        monthRevenue: monthApts.reduce(
          (s: number, a: any) => s + (svcMap[a.service_id]?.price || 0),
          0,
        ),
      });

      const tStats = techData.map((t: any) => {
        const tApts = monthApts.filter((a: any) => a.technician_id === t.id);
        return {
          nickname: t.nickname,
          bookings: tApts.length,
          revenue: tApts.reduce(
            (s: number, a: any) => s + (svcMap[a.service_id]?.price || 0),
            0,
          ),
        };
      });
      setTechStats(tStats);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllReservations() {
    try {
      const data = await apiFetchAllSafe<any>('appointments', 'order=date.desc,start_time.desc&limit=200');

      const techMap: Record<string, string> = {};
      technicians.forEach((t) => { techMap[t.id] = t.nickname; });
      const svcMap: Record<string, { name: string; price: number; duration_minutes: number }> = {};
      services.forEach((s) => { svcMap[s.id] = { name: s.name, price: s.price, duration_minutes: s.duration_minutes }; });

      const transformed = (data || []).map((a: any) => ({
        ...a,
        technician_nickname: techMap[a.technician_id] || "未知",
        service_name: svcMap[a.service_id]?.name || "未知",
        service_duration: svcMap[a.service_id]?.duration_minutes || 60,
        price: svcMap[a.service_id]?.price || 0,
      }));
      setAllReservations(transformed);
    } catch (e) {
      console.error("Fetch all reservations error:", e);
    }
  }

  // Rebuild calendar when shifts/technicians change
  useEffect(() => {
    if (!loading) buildCalendar();
  }, [shifts, technicians]);

  // Realtime INSERT subscription
  useEffect(() => {
    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => {
          const raw = payload.new as any;
          const techMap: Record<string, string> = {};
          technicians.forEach((t) => { techMap[t.id] = t.nickname; });
          const svcMap: Record<string, { name: string; price: number; duration_minutes: number }> = {};
          services.forEach((s) => {
            svcMap[s.id] = { name: s.name, price: s.price, duration_minutes: s.duration_minutes };
          });
          const mapped: Appointment = {
            id: raw.id,
            date: raw.date,
            start_time: raw.start_time,
            end_time: raw.end_time,
            technician_id: raw.technician_id,
            technician_nickname: techMap[raw.technician_id] || '未知',
            service_id: raw.service_id,
            service_name: svcMap[raw.service_id]?.name || '未知',
            service_duration: svcMap[raw.service_id]?.duration_minutes || 60,
            client_nickname: raw.client_nickname || '',
            client_phone: raw.client_phone || '',
            status: raw.status || 'confirmed',
            price: svcMap[raw.service_id]?.price || 0,
          };
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (_e) {}
          setAppointments((prev) => [mapped, ...prev]);
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('✨ 新預約', {
              body: `${mapped.client_nickname || '未知'} 已預約 ${mapped.technician_nickname} ${mapped.date} ${mapped.start_time?.slice(0, 5)}`,
            });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [technicians, services]);

  return {
    appointments,
    technicians,
    services,
    shifts,
    loading,
    allReservations,
    stats,
    techStats,
    calendarShifts,
    fetchData,
    fetchAllReservations,
  };
}
