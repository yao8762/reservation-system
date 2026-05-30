"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetchAllSafe } from "@/lib/api";

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

export default function TechniciansClient() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [shiftCounts, setShiftCounts] = useState<Record<string, number>>({});
  const [shiftTypes, setShiftTypes] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const today = new Date().toISOString().split("T")[0];

      const [techData, shiftData] = await Promise.all([
        apiFetchAllSafe<Technician>('technicians', 'order=nickname.asc'),
        apiFetchAllSafe<ShiftItem>('shifts', `date=gte.${today}&order=technician_id.asc,date.asc`),
      ]);

      setTechnicians(techData);

      const counts: Record<string, number> = {};
      const sTypes: Record<string, string[]> = {};
      shiftData.forEach((s) => {
        counts[s.technician_id] = (counts[s.technician_id] || 0) + 1;
        if (!sTypes[s.technician_id]) sTypes[s.technician_id] = [];
        const timeLabel = `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`;
        if (!sTypes[s.technician_id].includes(timeLabel))
          sTypes[s.technician_id].push(timeLabel);
      });
      // 只保留最近的一筆
      Object.keys(sTypes).forEach((tid) => {
        const techList = shiftData.filter((s) => s.technician_id === tid);
        if (techList.length > 0) {
          const next = [...techList].sort((a, b) =>
            a.date.localeCompare(b.date),
          )[0];
          sTypes[tid] = [
            `${next.start_time.slice(0, 5)}-${next.end_time.slice(0, 5)}`,
          ];
        }
      });
      setShiftCounts(counts);
      setShiftTypes(sTypes);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-accent hover:underline mb-2 block">
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
              <Link
                href={`/book?technician=${tech.id}`}
                className="block mt-4 bg-primary text-white text-center py-2 rounded-lg hover:bg-secondary transition-colors"
              >
                立即預約
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
