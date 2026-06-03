"use client";
import { useEffect, useMemo } from "react";
import Link from "next/link";

interface Technician {
  id: string;
  name: string;
  nickname: string;
  specialty: string;
}

interface ShiftItem {
  technician_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface Appointment {
  id: string;
  technician_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface ScheduleMatrixProps {
  technician: Technician;
  shifts: ShiftItem[];
  appointments: Appointment[];
  threeDays: string[];
  dayLabelFn: (dateStr: string) => string;
  onClose: () => void;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split("T")[0];
}

function generateSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const startMin = timeToMin(start);
  let endMin = timeToMin(end);

  if (endMin <= startMin) {
    endMin = 24 * 60; // 跨日只切到當天午夜
  }

  for (let m = startMin; m < endMin; m += 30) {
    slots.push(minToTime(m));
  }
  return slots;
}

function slotBooked(
  slot: string,
  date: string,
  appointments: Appointment[]
): boolean {
  const slotMin = timeToMin(slot);
  return appointments.some((a) => {
    if (a.date !== date) return false;
    return slotMin >= timeToMin(a.start_time) && slotMin < timeToMin(a.end_time);
  });
}

function getStatus(
  date: string,
  time: string,
  shifts: ShiftItem[],
  appointments: Appointment[]
): "booked" | "free" | "off" {
  // 1. 該日自己的班表
  const shift = shifts.find((s) => s.date === date);
  if (shift) {
    const slots = generateSlots(shift.start_time, shift.end_time);
    if (slots.includes(time)) {
      return slotBooked(time, date, appointments) ? "booked" : "free";
    }
  }

  // 2. 前一日的跨日延續（end_time < start_time 表示跨日）
  const yesterday = addDays(date, -1);
  const yesterdayShift = shifts.find((s) => s.date === yesterday);
  if (yesterdayShift && yesterdayShift.end_time < yesterdayShift.start_time) {
    const endMin = timeToMin(yesterdayShift.end_time);
    const tMin = timeToMin(time);
    if (tMin < endMin) {
      // 00:00 ~ end_time 範圍內 → 歸屬到 date（今天）
      return slotBooked(time, date, appointments) ? "booked" : "free";
    }
  }

  return "off";
}

export default function ScheduleMatrix({
  technician,
  shifts,
  appointments,
  threeDays,
  dayLabelFn,
  onClose,
}: ScheduleMatrixProps) {
  // Build time axis: pure time sequence sorted 00:00 → 23:30
  const timeAxis = useMemo(() => {
    const slots = new Set<string>();

    for (const day of threeDays) {
      const shift = shifts.find((s) => s.date === day);
      if (shift) {
        generateSlots(shift.start_time, shift.end_time).forEach((s) =>
          slots.add(s)
        );
      }

      // 前一日跨日延續（00:00 ~ end_time）
      const yesterday = addDays(day, -1);
      const yesterdayShift = shifts.find((s) => s.date === yesterday);
      if (yesterdayShift && yesterdayShift.end_time < yesterdayShift.start_time) {
        const endMin = timeToMin(yesterdayShift.end_time);
        for (let m = 0; m < endMin; m += 30) {
          slots.add(minToTime(m));
        }
      }
    }

    return Array.from(slots).sort();
  }, [shifts, threeDays]);

  // ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-primary">
            {technician.nickname} — 近三日預約時段
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left pr-4 pb-2 font-medium text-gray-500 w-16">
                  時間
                </th>
                {threeDays.map((day) => (
                  <th
                    key={day}
                    className="text-center pb-2 font-medium text-gray-700"
                  >
                    {dayLabelFn(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeAxis.map((slot) => (
                <tr key={slot} className="border-t border-gray-100">
                  <td className="py-2 pr-4 text-gray-500 font-mono text-xs text-right whitespace-nowrap">
                    {slot}
                  </td>
                  {threeDays.map((day) => {
                    const s = getStatus(day, slot, shifts, appointments);
                    return (
                      <td key={day} className="text-center py-2">
                        {s === "booked" && (
                          <span className="inline-block w-full">
                            <span className="inline-block w-8 h-6 bg-red-400 rounded-sm" />
                          </span>
                        )}
                        {s === "free" && (
                          <span className="text-gray-400 text-xs">空</span>
                        )}
                        {s === "off" && (
                          <span className="text-gray-300 text-xs">休</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-center">
          <Link
            href={`/book?technician=${technician.id}`}
            className="bg-primary text-white px-8 py-2 rounded-lg hover:bg-secondary transition-colors font-medium"
            onClick={onClose}
          >
            立即預約
          </Link>
        </div>
      </div>
    </div>
  );
}