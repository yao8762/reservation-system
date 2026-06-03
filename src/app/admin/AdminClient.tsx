"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TimeSlotSelect from "@/components/TimeSlotSelect";
import ClientsTab from "./Tabs/ClientsTab";
import { supabase } from "@/lib/supabase";
import { apiFetch, apiFetchAllSafe } from "@/lib/api";

interface Technician {
  id: string;
  name: string;
  nickname: string;
  specialty: string;
}
interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Appointment {
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

interface Shift {
  id: string;
  technician_id: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date?: string;
}

type Tab = "appointments" | "schedule" | "stats" | "technicians" | "customers" | "services";
type DateRange = "today" | "tomorrow" | "week";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export default function AdminClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("week");

  // 動態月份計算（用於標籤顯示和數據查詢）
  const now = new Date();
  const fetchStartDate = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  const [stats, setStats] = useState({
    todayCount: 0,
    todayRevenue: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthlyStats, setMonthlyStats] = useState<Record<string, { count: number; revenue: number }>>({});
  const [techStats, setTechStats] = useState<Record<string, Record<string, { bookings: number; revenue: number }>>>({});

  // Appointment modal
  const [showApptModal, setShowApptModal] = useState(false);
  const [editApptId, setEditApptId] = useState("");
  const [apptTech, setApptTech] = useState("");
  const [apptSvc, setApptSvc] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptClient, setApptClient] = useState("");
  const [apptPhone, setApptPhone] = useState("");

  // Schedule modal
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [schedTech, setSchedTech] = useState("");
  const [schedStartTime, setSchedStartTime] = useState("09:00");
  const [schedEndTime, setSchedEndTime] = useState("17:00");
  const [schedStartDate, setSchedStartDate] = useState("");
  const [schedEndDate, setSchedEndDate] = useState("");
  const [schedMonth, setSchedMonth] = useState("");
  const [schedDay, setSchedDay] = useState("");

  // Helper: compute end_date for cross-night shifts
  function getEndDate(date: string, startTime: string, endTime: string): string {
    // 如果 end_time < start_time，表示跨日，end_date = 隔天
    if (endTime < startTime) {
      const d = new Date(date);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }
    return date;
  }

  // Helper: get shift color by start time
  function getShiftColor(startTime: string) {
    const [h] = startTime.split(":").map(Number);
    if (h >= 6 && h < 12) return "bg-[#6A9B6A] text-white border border-[#4F7A4F]";                                    // 早班 06-12 柔綠
    if (h >= 12 && h < 18) return "bg-[#C4A77D] text-white border border-[#A68B5E]";                         // 午班 12-18 柔金
    if (h >= 18 && h < 22) return "bg-[#8B7355] text-white border border-[#6E5C43]";                          // 晚班 18-22 柔棕
    return "bg-[#B8A898] text-[#2A2018] border border-[#9A8878]";                                                       // 跨夜班 22+ 淺暖灰+深棕字
  }
  const [calendarShifts, setCalendarShifts] = useState<Shift[]>([]);
  const [activeDay, setActiveDay] = useState("");

  useEffect(() => {
    if (!sessionStorage.getItem("admin_logged_in")) {
      router.push("/admin/login");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    setActiveDay(today);
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) buildCalendar();
  }, [shifts, technicians]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Subscribe to Realtime INSERT on appointments
  useEffect(() => {
    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => {
          const raw = payload.new as any;
          // Map technician/service names from existing state
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
          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (_e) {}
          // Add new appointment to the top of the list
          setAppointments((prev) => [mapped, ...prev]);
          // Show browser notification
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

  function getToday() {
    return new Date().toISOString().split("T")[0];
  }

  function getScheduleRangeBounds(): { start: string; end: string } {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 13);
    return {
      start: today.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }


  function getDateRangeBounds(): { start: string; end: string } {
    const today = new Date();
    const end = new Date(today);
    if (dateRange === "today" || dateRange === "tomorrow") {
      end.setDate(today.getDate() + (dateRange === "tomorrow" ? 1 : 0));
      return {
        start: end.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    end.setDate(today.getDate() + 14);
    return {
      start: today.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }

  function buildCalendar() {
    const bounds = getScheduleRangeBounds();
    const days: string[] = [];
    const start = new Date(bounds.start);
    const end = new Date(bounds.end);
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
      const today = (() => {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      })();

      const [allAppointments, techData, svcData, shiftData] = await Promise.all([
        apiFetchAllSafe<any>('appointments', `date=gte.${fetchStartDate}&order=date.asc,start_time.asc`),
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
      setStats({
        todayCount: todayApts.length,
        todayRevenue: todayApts.reduce(
          (s: number, a: any) => s + (svcMap[a.service_id]?.price || 0),
          0,
        ),
      });

      // Compute per-month stats for the last 6 months
      const monthlyMap: Record<string, { count: number; revenue: number }> = {};
      const techMonthMap: Record<string, Record<string, { bookings: number; revenue: number }>> = {};
      const now = new Date();
      for (let i = 0; i < 6; i++) {
        const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
        const mStart = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}-01`;
        const nextMonthIdx = mDate.getMonth() + 1;
        const mEnd = `${mDate.getFullYear() + (nextMonthIdx >= 12 ? 1 : 0)}-${String((nextMonthIdx % 12) + 1).padStart(2, '0')}-01`;
        const mApts = (allAppointments || []).filter(
          (a: any) => a.date >= mStart && a.date < mEnd && a.status === "confirmed",
        );
        monthlyMap[mKey] = {
          count: mApts.length,
          revenue: mApts.reduce((s: number, a: any) => s + (svcMap[a.service_id]?.price || 0), 0),
        };
        const tMap: Record<string, { bookings: number; revenue: number }> = {};
        techData.forEach((t: any) => {
          const tApts = mApts.filter((a: any) => a.technician_id === t.id);
          tMap[t.nickname] = {
            bookings: tApts.length,
            revenue: tApts.reduce((s: number, a: any) => s + (svcMap[a.service_id]?.price || 0), 0),
          };
        });
        techMonthMap[mKey] = tMap;
      }
      setMonthlyStats(monthlyMap);
      setTechStats(techMonthMap);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function blockUser(telegramId: string) {
    if (!telegramId || !confirm(`確定要封鎖 TG ID：${telegramId}？`)) return;
    await apiFetch(`telegram_users?telegram_id=eq.${telegramId}`, {
      method: 'PATCH',
      body: { is_blacklisted: true, note: '管理員後台封鎖' },
    }).catch(() => {});
    // also try insert in case record doesn't exist
    await apiFetch('telegram_users', {
      method: 'POST',
      body: { telegram_id: telegramId, is_blacklisted: true, is_whitelisted: false, note: '管理員後台封鎖' },
    }).catch(() => {});
    alert(`已封鎖 TG ID：${telegramId}`);
  }

  async function updateAppointment(id: string, status: string) {
    await apiFetch(`appointments?id=eq.${id}`, {
      method: 'PATCH',
      body: { status },
      prefer: 'return=minimal',
    }).catch(() => {});
    fetchData();
  }

  async function deleteAppointment(id: string) {
    if (!confirm("確定要刪除此預約？")) return;
    await apiFetch(`appointments?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
    fetchData();
  }

  function openAddAppt() {
    setEditApptId("");
    setApptTech(technicians[0]?.id || "");
    setApptSvc(services[0]?.id || "");
    setApptDate(getToday());
    setApptTime("10:00");
    setApptClient("");
    setApptPhone("");
    setShowApptModal(true);
  }

  function openEditAppt(a: Appointment) {
    setEditApptId(a.id);
    setApptTech(a.technician_id);
    setApptSvc(a.service_id);
    setApptDate(a.date);
    setApptTime(a.start_time.slice(0, 5));
    setApptClient(a.client_nickname);
    setApptPhone(a.client_phone);
    setShowApptModal(true);
  }

  async function submitAppointment(e: React.FormEvent) {
    e.preventDefault();
    const svc = services.find((s) => s.id === apptSvc);
    const duration = svc?.duration_minutes || 60;
    const [sh, sm] = apptTime.split(":").map(Number);
    const startTotal = sh * 60 + sm;
    const endTotal = startTotal + duration;
    const endTime = `${String(Math.floor(endTotal / 60) % 24).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;

    if (editApptId) {
      await apiFetch(`appointments?id=eq.${editApptId}`, {
        method: 'PATCH',
        body: {
          technician_id: apptTech,
          service_id: apptSvc,
          date: apptDate,
          start_time: apptTime,
          end_time: endTime,
          client_nickname: apptClient,
          client_phone: apptPhone,
        },
        prefer: 'return=minimal',
      }).catch(() => {});
    } else {
      try {
        await apiFetch('appointments', {
          method: 'POST',
          body: {
            technician_id: apptTech,
            service_id: apptSvc,
            date: apptDate,
            start_time: apptTime,
            end_time: endTime,
            client_nickname: apptClient,
            client_phone: apptPhone,
            telegram_id: null,  // 明確標示管理員手動加的
            status: 'confirmed',
          },
          prefer: 'return=representation',
        });
      } catch (e: any) {
        console.error('新增預約失敗:', e);
        alert('新增預約失敗：' + (e?.message || '未知錯誤'));
        return;  // 不要關 modal、不要 fetchData
      }
    }
    setShowApptModal(false);
    fetchData();
  }

  async function deleteShift(id: string) {
    if (!confirm("確定要刪除此班表？")) return;
    await apiFetch(`shifts?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
    // 只在本地移除這筆記錄（setShifts 會觸發 useEffect → buildCalendar 重建 calendarShifts）
    setShifts((prev) => prev.filter((s) => s.id !== id));
  }

  async function addShift(
    technicianId: string,
    startTime: string,
    endTime: string,
    date: string,
  ) {
    const endDate = getEndDate(date, startTime, endTime);
    await apiFetch('shifts', {
      method: 'POST',
      body: {
        technician_id: technicianId,
        date,
        start_time: startTime,
        end_time: endTime,
        end_date: endDate,
      },
    }).catch(() => {});
    fetchData();
  }

  /** Add shift for a range of dates */
  async function addShiftBulk() {
    if (!schedTech || !schedStartTime || !schedEndTime || !schedStartDate)
      return;
    const end = schedEndDate || schedStartDate;
    const startD = new Date(schedStartDate);
    const endD = new Date(end);
    while (startD <= endD) {
      const dateStr = startD.toISOString().split("T")[0];
      const endDate = getEndDate(dateStr, schedStartTime, schedEndTime);
      const existing = shifts.find(
        (s) => s.technician_id === schedTech && s.date === dateStr,
      );
      if (!existing) {
        await apiFetch('shifts', {
          method: 'POST',
          body: {
            technician_id: schedTech,
            date: dateStr,
            start_time: schedStartTime,
            end_time: schedEndTime,
            end_date: endDate,
          },
        }).catch(() => {});
      }
      startD.setDate(startD.getDate() + 1);
    }
    setShowSchedModal(false);
    fetchData();
  }

  function getTechShiftForDay(techId: string, day: string): Shift[] {
    return calendarShifts.filter(
      (s) => s.technician_id === techId && s.date === day,
    );
  }

  function logout() {
    sessionStorage.removeItem("admin_logged_in");
    router.push("/admin/login");
  }

  // Generate days for calendar
  function getCalendarDays(): string[] {
    const days: string[] = [];
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 13);
    while (today <= end) {
      days.push(today.toISOString().split("T")[0]);
      today.setDate(today.getDate() + 1);
    }
    return days;
  }

  function getFilteredAppts(): Appointment[] {
    const bounds = getDateRangeBounds();
    return appointments.filter(
      (a) => a.date >= bounds.start && a.date <= bounds.end,
    );
  }

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-gray-500">載入中...</p>
      </div>
    );

  const calendarDays = getCalendarDays();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white py-6 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <Link href="/" className="text-accent hover:underline mb-2 block">
              ← 返回首頁
            </Link>
            <h1 className="text-2xl font-bold">⚙️ 管理員後台</h1>
          </div>
          <button
            onClick={logout}
            className="bg-secondary text-white px-4 py-2 rounded-lg hover:opacity-80 text-sm"
          >
            登出
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("appointments")}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${tab === "appointments" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            📋 預約管理
          </button>
          <button
            onClick={() => setTab("schedule")}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${tab === "schedule" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            📅 排班管理
          </button>
          <button
            onClick={() => setTab("stats")}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${tab === "stats" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            📊 統計報表
          </button>
          <button
            onClick={() => setTab("technicians")}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${tab === "technicians" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            👥 技師管理
          </button>
          <button
            onClick={() => setTab("services")}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${tab === "services" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            🛎️ 服務項目
          </button>
          <button
            onClick={() => setTab("customers")}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${tab === "customers" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            📋 預約紀錄
          </button>
        </div>

        {/* ========== STATS TAB ========== */}
        {tab === "stats" && (
          <div>
            {/* 月份下拉選單（最近6個月） */}
            <div className="mb-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 rounded-lg font-bold border border-gray-300 bg-white text-gray-800"
              >
                {Array.from({ length: 6 }, (_, i) => {
                  const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const label = `${d.getMonth() + 1}月`;
                  return <option key={key} value={key}>{label}</option>;
                })}
              </select>
            </div>

            {/* 統計卡片 */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-sm text-gray-500">{parseInt(selectedMonth.split('-')[1])}月預約</p>
                <p className="text-3xl font-bold text-secondary">{(monthlyStats[selectedMonth]?.count ?? 0)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-sm text-gray-500">{parseInt(selectedMonth.split('-')[1])}月營收</p>
                <p className="text-3xl font-bold text-secondary">${(monthlyStats[selectedMonth]?.revenue ?? 0).toLocaleString()}</p>
              </div>
            </div>

            <h2 className="text-lg font-bold text-primary mb-4">
              技師 {parseInt(selectedMonth.split('-')[1])}月業績
            </h2>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-accent">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">技師</th>
                    <th className="text-center px-4 py-3 font-bold">預約數</th>
                    <th className="text-right px-4 py-3 font-bold">業績</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((tech) => {
                    const tStats = (techStats[selectedMonth] ?? {})[tech.nickname] ?? { bookings: 0, revenue: 0 };
                    return (
                      <tr key={tech.nickname} className="border-t">
                        <td className="px-4 py-3 font-bold">{tech.nickname}</td>
                        <td className="px-4 py-3 text-center">{tStats.bookings}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          ${tStats.revenue.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========== APPOINTMENTS TAB ========== */}
        {tab === "appointments" && (
          <div>
            {/* Filters & Add button */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                {(["today", "tomorrow", "week"] as DateRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setDateRange(r)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      dateRange === r
                        ? "bg-primary text-white"
                        : "bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {r === "today"
                      ? "今天"
                      : r === "tomorrow"
                        ? "明天"
                        : "未來14天"}
                  </button>
                ))}
              </div>
              <button
                onClick={openAddAppt}
                className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-secondary transition-colors"
              >
                ✚ 新增預約
              </button>
            </div>

            {/* Appointment list */}
            <div className="bg-white rounded-xl shadow">
              {getFilteredAppts().length === 0 ? (
                <p className="text-center py-8 text-gray-500">目前沒有預約</p>
              ) : (
                <div className="space-y-2 p-4">
                  {getFilteredAppts().map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-gray-50 rounded-lg p-4 flex flex-wrap items-center gap-3 border"
                    >
                      <div className="min-w-[100px]">
                        <p className="font-bold text-sm">
                          {formatDate(apt.date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {apt.start_time?.slice(0, 5)} -{" "}
                          {apt.end_time?.slice(0, 5)}
                        </p>
                      </div>
                      <div className="min-w-[80px]">
                        <p className="font-bold text-sm">
                          {apt.technician_nickname}
                        </p>
                        <p className="text-xs text-gray-500">
                          {apt.service_name}
                        </p>
                        <p className="text-xs text-primary font-bold">
                          ${apt.price}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <p className="text-sm">{apt.client_nickname}</p>
                        <p className="text-xs text-gray-500">
                          {apt.client_phone}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => openEditAppt(apt)}
                          className="text-primary hover:underline text-sm px-2 py-1 border rounded hover:bg-primary/10"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => deleteAppointment(apt.id)}
                          className="text-red-500 hover:underline text-sm px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== SCHEDULE TAB ========== */}
        {tab === "schedule" && (
          <div>
            {/* Add Shift Button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-primary">
                📅 技師班表總覽
              </h2>
              <button
                onClick={() => {
                  setSchedTech(technicians[0]?.id || "");
                  setSchedStartTime("09:00");
                  setSchedEndTime("17:00");
                  setSchedStartDate(getToday());
                  setSchedEndDate("");
                  setShowSchedModal(true);
                }}
                className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-secondary transition-colors"
              >
                ✚ 新增班表
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-xl shadow overflow-x-auto mb-8">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th className="bg-accent text-left px-3 py-2 font-bold text-sm sticky left-0 bg-accent z-10">
                      技師
                    </th>
                    {calendarDays.map((day) => (
                      <th
                        key={day}
                        className={`text-center px-2 py-2 font-bold text-xs ${day === getToday() ? "bg-primary text-white" : "bg-accent"}`}
                      >
                        {new Date(day).toLocaleDateString("zh-TW", {
                          month: "short",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((tech) => (
                    <tr key={tech.id} className="border-t">
                      <td className="px-3 py-2 font-bold text-sm sticky left-0 bg-white z-10 border-r">
                        {tech.nickname}
                      </td>
                      {calendarDays.map((day) => {
                        const shifts = getTechShiftForDay(tech.id, day);
                        return (
                          <td
                            key={day}
                            className="text-center px-1 py-1 border-r border-gray-100"
                          >
                            {shifts.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {shifts.map((shift) => (
                                  <div key={shift.id} className="group relative cursor-pointer">
                                    <div className={`rounded-lg py-1.5 text-xs font-bold ${getShiftColor(shift.start_time)}`}>
                                      {shift.start_time.slice(0, 5)} -{" "}
                                      {shift.end_time.slice(0, 5)}
                                    </div>
                                    <button
                                      onClick={() => deleteShift(shift.id)}
                                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                      title="刪除班表"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSchedTech(tech.id);
                                  setSchedStartTime("09:00");
                                  setSchedEndTime("17:00");
                                  setSchedStartDate(day);
                                  setSchedEndDate(day);
                                  setShowSchedModal(true);
                                }}
                                className="w-full h-full py-2 text-xs text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                              >
                                +
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-400">
              （按 + 新增班表，滑到格子右上角 × 可刪除）
            </p>
          </div>
        )}

        {/* ========== ADD/EDIT APPOINTMENT MODAL ========== */}
        {showApptModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-lg font-bold text-primary mb-4">
                {editApptId ? "編輯預約" : "新增預約"}
              </h2>
              <form onSubmit={submitAppointment} className="space-y-3">
                <div>
                  <label className="block text-sm font-bold mb-1">技師</label>
                  <select
                    value={apptTech}
                    onChange={(e) => setApptTech(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nickname}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">服務</label>
                  <select
                    value={apptSvc}
                    onChange={(e) => setApptSvc(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (${s.price} / {s.duration_minutes}分鐘)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">日期</label>
                  <input
                    type="date"
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">
                    開始時間
                  </label>
                  <TimeSlotSelect
                    value={apptTime}
                    date={apptDate}
                    onChange={(t) => setApptTime(t)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">
                    客戶暱稱
                  </label>
                  <input
                    type="text"
                    value={apptClient}
                    onChange={(e) => setApptClient(e.target.value)}
                    placeholder="暱稱"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">
                    客戶電話
                  </label>
                  <input
                    type="tel"
                    value={apptPhone}
                    onChange={(e) => setApptPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white py-2 rounded-lg font-bold hover:bg-secondary"
                  >
                    {editApptId ? "儲存修改" : "新增預約"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApptModal(false)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========== ADD SHIFT MODAL ========== */}
        {showSchedModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-lg font-bold text-primary mb-4">新增班表</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold mb-1">技師</label>
                  <select
                    value={schedTech}
                    onChange={(e) => setSchedTech(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nickname}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1">
                      開始時間
                    </label>
                    <TimeSlotSelect
                      value={schedStartTime}
                      date={schedStartDate}
                      onChange={(t) => setSchedStartTime(t)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1">
                      結束時間
                    </label>
                    <TimeSlotSelect
                      value={schedEndTime}
                      date={schedEndDate || schedStartDate}
                      onChange={(t) => setSchedEndTime(t)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1">
                      開始日期
                    </label>
                    <input
                      type="date"
                      value={schedStartDate}
                      onChange={(e) => setSchedStartDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1">
                      結束日期
                    </label>
                    <input
                      type="date"
                      value={schedEndDate}
                      onChange={(e) => setSchedEndDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">留空=僅單日</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={addShiftBulk}
                    className="flex-1 bg-primary text-white py-2 rounded-lg font-bold hover:bg-secondary"
                  >
                    {schedEndDate && schedStartDate !== schedEndDate
                      ? "批次新增班表"
                      : "新增班表"}
                  </button>
                  <button
                    onClick={() => setShowSchedModal(false)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== TECHNICIANS TAB ========== */}
        {tab === "technicians" && (
          <TechniciansTab
            technicians={technicians}
            services={services}
            onRefresh={fetchData}
          />
        )}

        {/* ========== SERVICES TAB ========== */}
        {tab === "services" && (
          <ServicesTab
            services={services}
            onRefresh={fetchData}
          />
        )}

        {/* ========== CUSTOMERS TAB ========== */}
        {tab === "customers" && (
          <ClientsTab
            appointments={appointments}
            technicians={technicians}
            onRefresh={fetchData}
          />
        )}
      </main>
    </div>
  );
}

// ======= Technicians Tab Component =======
interface TechModalState {
  id: string;
  name: string;
  nickname: string;
  specialty: string;
}

function BookNowButton({ techId }: { techId: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/book?tech=${techId}`)}
      className="mt-2 w-full py-2 rounded-lg bg-accent text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
    >
      立即預約
    </button>
  );
}

function TechniciansTab({
  technicians,
  services,
  onRefresh,
}: {
  technicians: Technician[];
  services: Service[];
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState("");
  const [formName, setFormName] = useState("");
  const [formNick, setFormNick] = useState("");
  const [formSpec, setFormSpec] = useState("");

  function openAdd() {
    setEditId("");
    setFormName("");
    setFormNick("");
    setFormSpec("");
    setShowModal(true);
  }
  function openEdit(t: Technician) {
    setEditId(t.id);
    setFormName(t.name);
    setFormNick(t.nickname);
    setFormSpec(t.specialty);
    setShowModal(true);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { name: formName, nickname: formNick, specialty: formSpec };
    if (editId) {
      await apiFetch(`technicians?id=eq.${editId}`, {
        method: 'PATCH',
        body,
      }).catch(() => {});
    } else {
      await apiFetch('technicians', {
        method: 'POST',
        body,
      }).catch(() => {});
    }
    setShowModal(false);
    onRefresh();
  }
  async function remove(id: string) {
    if (!confirm("確定要刪除此技師？")) return;
    await apiFetch(`technicians?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
    onRefresh();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-primary">👥 技師列表</h2>
        <button
          onClick={openAdd}
          className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-secondary transition-colors"
        >
          ✚ 新增技師
        </button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {technicians.map((t) => (
          <div key={t.id} className="bg-white rounded-xl p-5 shadow border">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-2xl font-bold text-primary">
                {t.nickname[0]}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(t)}
                  className="text-primary hover:bg-primary/10 px-2 py-1 rounded border border-primary/30 text-sm font-bold"
                >
                  編輯
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="text-red-500 hover:bg-red-50 px-2 py-1 rounded border border-red-200 text-sm"
                >
                  刪除
                </button>
              </div>
            </div>
            <div className="mt-3">
              <p className="font-bold text-lg text-primary">{t.nickname}</p>
              <p className="text-sm text-gray-600">{t.name}</p>
              <p className="text-sm text-secondary mt-1">{t.specialty}</p>
              <BookNowButton techId={t.id} />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-primary mb-4">
              {editId ? "編輯技師" : "新增技師"}
            </h2>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1">姓名</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="王小美"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">暱稱</label>
                <input
                  value={formNick}
                  onChange={(e) => setFormNick(e.target.value)}
                  placeholder="小美"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">專長</label>
                <input
                  value={formSpec}
                  onChange={(e) => setFormSpec(e.target.value)}
                  placeholder="深層組織按摩"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-2 rounded-lg font-bold hover:bg-secondary"
                >
                  {editId ? "儲存修改" : "新增技師"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ======= Services Tab =======
function ServicesTab({
  services,
  onRefresh,
}: {
  services: Service[]
  onRefresh: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState("")
  const [formName, setFormName] = useState("")
  const [formPrice, setFormPrice] = useState("")
  const [formDuration, setFormDuration] = useState("60")
  const [saving, setSaving] = useState(false)

  function openAdd() {
    setEditId("")
    setFormName("")
    setFormPrice("")
    setFormDuration("60")
    setShowModal(true)
  }
  function openEdit(s: Service) {
    setEditId(s.id)
    setFormName(s.name)
    setFormPrice(String(s.price))
    setFormDuration(String(s.duration_minutes))
    setShowModal(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: formName,
        price: Number(formPrice),
        duration_minutes: Number(formDuration),
      }
      if (editId) {
        await fetch(`/api/services/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      setShowModal(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm("確定要刪除此服務項目？")) return
    await fetch(`/api/services/${id}`, { method: "DELETE" })
    onRefresh()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-primary">🛎️ 服務項目管理</h2>
        <button
          onClick={openAdd}
          className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-secondary transition-colors"
        >
          ✚ 新增服務
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-accent">
            <tr>
              <th className="text-left px-4 py-3 font-bold">名稱</th>
              <th className="text-center px-4 py-3 font-bold">時長</th>
              <th className="text-right px-4 py-3 font-bold">價格</th>
              <th className="text-right px-4 py-3 font-bold">操作</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3 font-bold">{s.name}</td>
                <td className="px-4 py-3 text-center">{s.duration_minutes} 分鐘</td>
                <td className="px-4 py-3 text-right font-bold text-primary">${s.price}</td>
                <td className="px-4 py-3 text-right flex gap-2 justify-end">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-primary hover:bg-primary/10 px-3 py-1 border border-primary/30 rounded text-sm font-bold"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="text-red-500 hover:bg-red-50 px-3 py-1 border border-red-200 rounded text-sm"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {services.length === 0 && (
          <p className="text-center py-8 text-gray-400">尚未新增任何服務項目</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-primary mb-4">
              {editId ? "編輯服務" : "新增服務"}
            </h2>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1">服務名稱</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例：深層組織按摩"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1">價格 (NT$)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="1200"
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1">時長 (分鐘)</label>
                  <select
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="30">30 分鐘</option>
                    <option value="60">60 分鐘</option>
                    <option value="90">90 分鐘</option>
                    <option value="120">120 分鐘</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary text-white py-2 rounded-lg font-bold hover:bg-secondary disabled:opacity-50"
                >
                  {saving ? "儲存中..." : editId ? "儲存修改" : "新增服務"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
