"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Appointment, Technician, Service, DateRange } from "../types";
import TimeSlotSelect from "@/components/TimeSlotSelect";


function formatDate(d: string) {
  return new Date(d).toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getDateRangeBounds(dateRange: DateRange): { start: string; end: string } {
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

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed": return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">已確認</span>;
    case "completed": return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">已完成</span>;
    case "cancelled": return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-bold">已取消</span>;
    case "no_show": return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">未報到</span>;
    default: return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">{status}</span>;
  }
}

interface AppointmentsTabProps {
  appointments: Appointment[];
  allReservations: Appointment[];
  technicians: Technician[];
  services: Service[];
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  filterTech: string;
  setFilterTech: (t: string) => void;
  showAllReservations: boolean;
  setShowAllReservations: (v: boolean) => void;
  onRefresh: () => void;
  fetchAllReservations: () => void;
}

export default function AppointmentsTab({
  appointments,
  allReservations,
  technicians,
  services,
  dateRange,
  setDateRange,
  filterTech,
  setFilterTech,
  showAllReservations,
  setShowAllReservations,
  onRefresh,
  fetchAllReservations,
}: AppointmentsTabProps) {
  const [showApptModal, setShowApptModal] = useState(false);
  const [editApptId, setEditApptId] = useState("");
  const [apptTech, setApptTech] = useState("");
  const [apptSvc, setApptSvc] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptClient, setApptClient] = useState("");
  const [apptPhone, setApptPhone] = useState("");

  function getFilteredAppts(): Appointment[] {
    const bounds = getDateRangeBounds(dateRange);
    return appointments.filter((a) => {
      const inRange = a.date >= bounds.start && a.date <= bounds.end;
      const matchTech = !filterTech || a.technician_id === filterTech;
      return inRange && matchTech;
    });
  }

  async function updateAppointment(id: string, status: string) {
    await apiFetch(`appointments?id=eq.${id}`, {
      method: 'PATCH',
      body: { status },
      prefer: 'return=minimal',
    }).catch(() => {});
    onRefresh();
  }

  async function deleteAppointment(id: string) {
    if (!confirm("確定要刪除此預約？")) return;
    await apiFetch(`appointments?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
    onRefresh();
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
          status: 'confirmed',
        },
        prefer: 'return=representation',
      }).catch(() => {});
    }
    setShowApptModal(false);
    onRefresh();
  }

  return (
    <div>
      {/* Filters & Add button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {(["today", "tomorrow", "week"] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => { setDateRange(r); setShowAllReservations(false); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                dateRange === r && !showAllReservations
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
        <div className="flex gap-2 items-center">
          <select
            value={filterTech}
            onChange={(e) => setFilterTech(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            <option value="">全部技師</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.nickname}</option>
            ))}
          </select>
          <button
            onClick={openAddAppt}
            className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-secondary transition-colors"
          >
            ✚ 新增預約
          </button>
        </div>
      </div>

      {/* Appointment list */}
      <div className="bg-white rounded-xl shadow">
        {showAllReservations ? (
          // ===== ALL RESERVATIONS VIEW =====
          allReservations.length === 0 ? (
            <p className="text-center py-8 text-gray-500">載入中...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-accent">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold">時間</th>
                    <th className="text-left px-3 py-2 font-bold">技師</th>
                    <th className="text-left px-3 py-2 font-bold">服務</th>
                    <th className="text-left px-3 py-2 font-bold">客戶</th>
                    <th className="text-left px-3 py-2 font-bold">TG ID</th>
                    <th className="text-right px-3 py-2 font-bold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {allReservations.map((apt) => {
                    const dateObj = new Date(apt.date);
                    const mmdd = `${String(dateObj.getMonth() + 1).padStart(2, "0")}/${String(dateObj.getDate()).padStart(2, "0")}`;
                    const timeStr = `${apt.start_time?.slice(0, 5)}`;
                    return (
                      <tr key={apt.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <span className="font-bold text-xs">{mmdd}</span>
                          <span className="text-gray-500 text-xs ml-1">{timeStr}</span>
                        </td>
                        <td className="px-3 py-2 font-bold text-xs">{apt.technician_nickname}</td>
                        <td className="px-3 py-2">
                          <span className="font-bold text-xs">{apt.service_name}</span>
                          <span className="text-primary text-xs block">${apt.price}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs">{apt.client_nickname || "—"}</span>
                          <span className="text-gray-400 text-xs block">{apt.client_phone || ""}</span>
                        </td>
                        <td className="px-3 py-2">
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {apt.telegram_id || "—"}
                          </code>
                        </td>
                        <td className="px-3 py-2" />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // ===== FILTERED VIEW =====
          getFilteredAppts().length === 0 ? (
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
          )
        )}
      </div>

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
    </div>
  );
}
