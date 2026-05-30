"use client";

import type { Stats, TechStat } from "../types";

export default function StatsTab({
  stats,
  techStats,
}: {
  stats: Stats;
  techStats: TechStat[];
}) {
  return (
    <div>
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "今日預約",
            value: stats.todayCount,
            color: "text-primary",
          },
          {
            label: "今日營收",
            value: `$${stats.todayRevenue.toLocaleString()}`,
            color: "text-primary",
          },
          {
            label: "本月預約",
            value: stats.monthCount,
            color: "text-secondary",
          },
          {
            label: "本月營收",
            value: `$${stats.monthRevenue.toLocaleString()}`,
            color: "text-secondary",
          },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <h2 className="text-lg font-bold text-primary mb-4">
        技師本月業績
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
            {techStats.map((t) => (
              <tr key={t.nickname} className="border-t">
                <td className="px-4 py-3 font-bold">{t.nickname}</td>
                <td className="px-4 py-3 text-center">{t.bookings}</td>
                <td className="px-4 py-3 text-right font-bold text-primary">
                  ${t.revenue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
