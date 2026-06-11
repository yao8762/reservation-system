"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Technician, Shift } from "../types";
import TimeSlotSelect from "@/components/TimeSlotSelect";


function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getShiftColor(startTime: string) {
  const [h] = startTime.split(":").map(Number);
  if (h >= 6 && h < 12) return "bg-[#6A9B6A] text-white border border-[#4F7A4F]";
  if (h >= 12 && h < 18) return "bg-[#C4A77D] text-white border border-[#A68B5E]";
  if (h >= 18 && h < 22) return "bg-[#8B7355] text-white border border-[#6E5C43]";
  return "bg-[#B8A898] text-[#2A2018] border border-[#9A8878]";
}

function getEndDate(date: string, startTime: string, endTime: string): string {
  if (endTime < startTime) {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  return date;
}

interface ScheduleTabProps {
  technicians: Technician[];
  shifts: Shift[];
  calendarShifts: Shift[];
  onRefresh: () => void;
}

export default function ScheduleTab({
  technicians,
  shifts,
  calendarShifts,
  onRefresh,
}: ScheduleTabProps) {
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [schedTech, setSchedTech] = useState("");
  const [schedStartTime, setSchedStartTime] = useState("09:00");
  const [schedEndTime, setSchedEndTime] = useState("17:00");
  const [schedStartDate, setSchedStartDate] = useState("");
  const [schedEndDate, setSchedEndDate] = useState("");
  // When true, TimeSlotSelect shows all slots (cell + clicked); when false, past slots filtered (新增班表 button)
  const [schedAllowPastTime, setSchedAllowPastTime] = useState(false);

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

  function getTechShiftForDay(techId: string, day: string): Shift[] {
    return calendarShifts.filter(
      (s) => s.technician_id === techId && s.date === day,
    );
  }

  async function deleteShift(id: string) {
    if (!confirm("確定要刪除此班表？")) return;
    await apiFetch(`shifts?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
    onRefresh();
  }

  async function addShiftBulk() {
    if (!schedTech || !schedStartTime || !schedEndTime || !schedStartDate)
      return;

    // Warn if start time is already past today
    const today = getToday();
    if (schedStartDate === today) {
      const nowH = new Date().getHours();
      const startH = parseInt(schedStartTime.split(":")[0], 10);
      if (startH < nowH) {
        const confirmed = confirm(`⚠️ 開始時間 ${schedStartTime} 已過了（現在是 ${String(nowH).padStart(2, "0")}:00），確定要新增嗎？`);
        if (!confirmed) return;
      }
    }

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
    onRefresh();
  }

  const calendarDays = getCalendarDays();
  const todayStr = getToday();

  return (
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
            setSchedStartDate(todayStr);
            setSchedEndDate("");
            setSchedAllowPastTime(true); // 新增班表按鈕：允許所有時間
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
                  className={`text-center px-2 py-2 font-bold text-xs ${day === todayStr ? "bg-primary text-white" : "bg-accent"}`}
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
                  const dayShifts = getTechShiftForDay(tech.id, day);
                  return (
                    <td
                      key={day}
                      className="text-center px-1 py-1 border-r border-gray-100"
                    >
                      {dayShifts.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {dayShifts.map((shift) => (
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
                            setSchedAllowPastTime(true); // cell +：允許所有時間
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
                    allowPastTime={schedAllowPastTime}
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
                    allowPastTime={schedAllowPastTime}
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
    </div>
  );
}
