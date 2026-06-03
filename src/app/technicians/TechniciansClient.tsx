"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetchAllSafe } from "@/lib/api";
import ScheduleMatrix from "@/components/ScheduleMatrix";

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

// Compute the 3-day window (today + tomorrow + day after)
function getThreeDays(): string[] {
  const days: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

// Day-of-week label in Chinese
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+08:00");
  const labels = ["日", "一", "二", "三", "四", "五", "六"];
  return `${d.getMonth() + 1}/${d.getDate()}(${labels[d.getDay()]})`;
}

export default function TechniciansClient() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [shiftTypes, setShiftTypes] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [techShifts, setTechShifts] = useState<ShiftItem[]>([]);
  const [techAppointments, setTechAppointments] = useState<Appointment[]>([]);
  const [threeDays, setThreeDays] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const days = getThreeDays();
        setThreeDays(days);
        const today = days[0];

        const [techData, shiftData] = await Promise.all([
          apiFetchAllSafe<Technician>("technicians", "order=nickname.asc"),
          apiFetchAllSafe<ShiftItem>(
            "shifts",
            `date=gte.${today}&order=technician_id.asc,date.asc`
          ),
        ]);

        setTechnicians(techData);

        // Build shift display per technician (just today's / nearest shift label)
        const sTypes: Record<string, string[]> = {};
        // Filter shifts for 3-day window
        const windowShifts = shiftData.filter((s) =>
          days.includes(s.date)
        );
        windowShifts.forEach((s) => {
          if (!sTypes[s.technician_id]) sTypes[s.technician_id] = [];
          const timeLabel = `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`;
          if (!sTypes[s.technician_id].includes(timeLabel))
            sTypes[s.technician_id].push(timeLabel);
        });
        // Keep only the earliest shift per tech
        Object.keys(sTypes).forEach((tid) => {
          const techList = windowShifts.filter((s) => s.technician_id === tid);
          if (techList.length > 0) {
            const next = [...techList].sort((a, b) => a.date.localeCompare(b.date))[0];
            sTypes[tid] = [
              `${next.start_time.slice(0, 5)}-${next.end_time.slice(0, 5)}`,
            ];
          }
        });
        setShiftTypes(sTypes);
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  async function openModal(tech: Technician) {
    const days = threeDays.length > 0 ? threeDays : getThreeDays();
    const shiftData = await apiFetchAllSafe<ShiftItem>(
      "shifts",
      `technician_id=eq.${tech.id}&date=gte.${days[0]}&date=lte.${days[2]}&order=date.asc`
    );
    const apptData = await apiFetchAllSafe<Appointment>(
      "appointments",
      `technician_id=eq.${tech.id}&date=gte.${days[0]}&date=lte.${days[2]}&status=eq.confirmed&order=date.asc,start_time.asc`
    );

    setTechShifts(shiftData);
    setTechAppointments(apptData);
    setSelectedTech(tech);
  }

  function closeModal() {
    setSelectedTech(null);
    setTechShifts([]);
    setTechAppointments([]);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-white py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/"
              className="text-accent hover:underline mb-2 block"
            >
              ← 返回首頁
            </Link>
            <h1 className="text-2xl font-bold">👥 我們的技師團隊</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technicians.map((tech) => (
              <div
                key={tech.id}
                className="bg-white rounded-xl p-6 shadow hover:shadow-lg transition-all"
              >
                <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-3xl mx-auto mb-4 font-bold text-primary">
                  {tech.nickname[0]}
                </div>
                <h3 className="text-xl font-bold text-primary text-center">
                  {tech.nickname}
                </h3>
                <p className="text-center text-sm text-gray-500 mb-2">
                  {tech.name}
                </p>
                <p className="text-center text-sm text-secondary mb-4">
                  {tech.specialty}
                </p>
                <div className="text-center text-xs text-gray-400">
                  {(shiftTypes[tech.id] || []).map((st) => st).join(" / ") ||
                    "暂无班表"}
                </div>

                {/* New: 預約時段 button */}
                <button
                  onClick={() => openModal(tech)}
                  className="block w-full mt-4 bg-secondary text-white text-center py-2 rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  預約時段
                </button>

                {/* Original: 立即預約 button */}
                <Link
                  href={`/book?technician=${tech.id}`}
                  className="block mt-2 bg-primary text-white text-center py-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  立即預約
                </Link>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Modal */}
      {selectedTech && (
        <ScheduleMatrix
          technician={selectedTech}
          shifts={techShifts}
          appointments={techAppointments}
          threeDays={threeDays}
          dayLabelFn={dayLabel}
          onClose={closeModal}
        />
      )}
    </>
  );
}