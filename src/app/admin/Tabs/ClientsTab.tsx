"use client";

import { useState, useEffect } from "react";
import { apiFetch, apiFetchAllSafe } from "@/lib/api";
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
  const [subView, setSubView] = useState<"all" | "blacklist">("all");
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
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setSubView("all")}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              subView === "all" ? "bg-primary text-white" : "bg-white border text-gray-600 hover:bg-gray-100"
            }`}
          >
            📋 所有預約
          </button>
          <button
            onClick={() => setSubView("blacklist")}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              subView === "blacklist" ? "bg-primary text-white" : "bg-white border text-gray-600 hover:bg-gray-100"
            }`}
          >
            🚫 紀錄黑名單
          </button>
        </div>
      </div>
      {subView === "all" && (
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
      )}
      {subView === "blacklist" && <BlacklistView onRefresh={onRefresh} />}
    </div>
  );
}

function BlacklistView({ onRefresh }: { onRefresh: () => void }) {
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nicknameMap, setNicknameMap] = useState<Record<string, { nickname: string; phone: string }>>({});

  useEffect(() => {
    fetchBlacklist();
  }, []);

  async function fetchBlacklist() {
    setLoading(true);
    try {
      const data = await apiFetchAllSafe<any>('telegram_users', 'is_blacklisted=eq.true&order=created_at.desc');
      setBlacklist(data || []);

      // 對每個黑名單 TG ID 查最新一筆預約拿暱稱/電話
      const tgIds = (data || []).map((b: any) => b.telegram_id).filter(Boolean);
      if (tgIds.length > 0) {
        const inClause = `telegram_id=in.(${tgIds.join(',')})&select=client_nickname,client_phone,telegram_id,date&order=date.desc&limit=200`;
        const appts = await apiFetchAllSafe<any>('appointments', inClause);
        const map: Record<string, { nickname: string; phone: string }> = {};
        (appts || []).forEach((a: any) => {
          if (a.telegram_id && !map[a.telegram_id]) {
            map[a.telegram_id] = { nickname: a.client_nickname, phone: a.client_phone };
          }
        });
        setNicknameMap(map);
      } else {
        setNicknameMap({});
      }
    } finally {
      setLoading(false);
    }
  }

  async function unblock(telegramId: string) {
    if (!confirm(`確定要解除封鎖 TG ID：${telegramId}？`)) return;
    await apiFetch(`telegram_users?telegram_id=eq.${telegramId}`, {
      method: 'PATCH',
      body: { is_blacklisted: false },
    }).catch((e) => {
      console.error('解封鎖失敗:', e);
      alert('解封鎖失敗，請稍後再試');
    });
    alert(`已解除封鎖 TG ID：${telegramId}`);
    fetchBlacklist();
    onRefresh();
  }

  if (loading) {
    return <p className="text-center py-8 text-gray-500">載入中...</p>;
  }

  if (blacklist.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-2xl mb-2">🛡️</p>
        <p className="text-sm">目前沒有黑名單紀錄</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-accent">
          <tr>
            <th className="text-left py-2 px-3 font-bold">TG ID</th>
            <th className="text-left py-2 px-3 font-bold">暱稱</th>
            <th className="text-left py-2 px-3 font-bold">電話</th>
            <th className="text-left py-2 px-3 font-bold">操作</th>
          </tr>
        </thead>
        <tbody>
          {blacklist.map((b) => {
            const tgId = b.telegram_id;
            const info = nicknameMap[tgId] || { nickname: '-', phone: '-' };
            return (
              <tr key={b.id} className="border-t hover:bg-gray-50">
                <td className="py-2 px-3 text-xs text-gray-500">{tgId}</td>
                <td className="py-2 px-3">{info.nickname}</td>
                <td className="py-2 px-3">{info.phone}</td>
                <td className="py-2 px-3">
                  <button
                    onClick={() => unblock(tgId)}
                    className="text-primary hover:bg-primary/10 px-3 py-1 rounded border border-primary/30 text-xs font-bold"
                  >
                    ✓ 解除封鎖
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
