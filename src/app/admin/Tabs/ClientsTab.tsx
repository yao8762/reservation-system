"use client";

import { useState, useEffect } from "react";
import { apiFetchAllSafe } from "@/lib/api";
import type { Technician } from "../types";

// 顯示所有預約紀錄（含搜尋、分頁、狀態 badge）
// 從 AdminClient.tsx 搬過來的「所有預約」邏輯
export default function ClientsTab({
  appointments,
  technicians,
  onRefresh,
}: {
  appointments: any[];
  technicians: Technician[];
  onRefresh: () => void;
}) {
  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [allResPage, setAllResPage] = useState(1);
  const [allResPageSize] = useState(20);
  const [allResSearch, setAllResSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllReservations();
  }, []);

  async function fetchAllReservations() {
    setLoading(true);
    try {
      const data = await apiFetchAllSafe<any>('appointments', 'order=date.desc,start_time.desc&limit=200');
      setAllReservations(data || []);
    } finally {
      setLoading(false);
    }
  }

  // 狀態 badge
  function getStatusBadge(status: string) {
    switch (status) {
      case "confirmed": return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">已確認</span>;
      case "completed": return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">已完成</span>;
      case "cancelled": return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-bold">已取消</span>;
      case "no_show": return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">未報到</span>;
      default: return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">{status}</span>;
    }
  }

  // 搜尋 + 分頁
  const filtered = allResSearch
    ? allReservations.filter((a) => {
        const s = allResSearch.toLowerCase();
        return (
          (a.client_nickname || '').toLowerCase().includes(s) ||
          (a.client_phone || '').includes(s) ||
          (a.service_name || '').toLowerCase().includes(s) ||
          (a.technician_nickname || '').toLowerCase().includes(s) ||
          (a.telegram_id || '').includes(s)
        );
      })
    : allReservations;
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / allResPageSize));
  const start = (allResPage - 1) * allResPageSize;
  const pageData = filtered.slice(start, start + allResPageSize);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">預約紀錄</h2>
        <p className="text-xs text-gray-500">所有客戶的預約紀錄，可搜尋客戶/服務/技師/TG ID</p>
      </div>
      <div className="p-4">
        {loading ? (
          <p className="text-center py-8 text-gray-500">載入中...</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex justify-between items-center px-4 py-2 border-b gap-2">
              <input
                type="text"
                placeholder="搜尋客戶、服務、技師..."
                value={allResSearch}
                onChange={(e) => {
                  setAllResSearch(e.target.value);
                  setAllResPage(1);
                }}
                className="border rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-xs text-gray-400">
                {allResSearch ? `搜尋：${allResSearch}` : `共 ${allReservations.length} 筆`}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-accent">
                <tr>
                  <th className="text-left py-2 px-3 font-bold">日期</th>
                  <th className="text-left py-2 px-3 font-bold">時段</th>
                  <th className="text-left py-2 px-3 font-bold">服務</th>
                  <th className="text-left py-2 px-3 font-bold">技師</th>
                  <th className="text-left py-2 px-3 font-bold">客戶</th>
                  <th className="text-left py-2 px-3 font-bold">TG ID</th>
                  <th className="text-left py-2 px-3 font-bold">狀態</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-3">{a.date}</td>
                    <td className="py-2 px-3">{a.start_time}</td>
                    <td className="py-2 px-3">{a.service_name}</td>
                    <td className="py-2 px-3">{a.technician_nickname}</td>
                    <td className="py-2 px-3">
                      {a.client_nickname || a.client_phone}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-500">
                      {a.telegram_id || '-'}
                    </td>
                    <td className="py-2 px-3">{getStatusBadge(a.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-center items-center gap-3 px-4 py-2 border-t">
              <button
                onClick={() => setAllResPage((p) => Math.max(1, p - 1))}
                disabled={allResPage === 1}
                className="px-3 py-1 rounded-lg border text-xs font-bold disabled:opacity-40 hover:bg-gray-100"
              >
                ← 上一頁
              </button>
              <span className="text-xs text-gray-500">
                第 {allResPage} / {pages} 頁（共 {total} 筆）
              </span>
              <button
                onClick={() => setAllResPage((p) => Math.min(pages, p + 1))}
                disabled={allResPage >= pages}
                className="px-3 py-1 rounded-lg border text-xs font-bold disabled:opacity-40 hover:bg-gray-100"
              >
                下一頁 →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
