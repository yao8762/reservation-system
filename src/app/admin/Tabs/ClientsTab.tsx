"use client";

import { useState, useEffect } from "react";
import { apiFetch, apiFetchAllSafe } from "@/lib/api";
import type { Technician } from "../types";


// 顯示所有有記錄的客戶（依 client_phone 分組）
// 可搜尋、封鎖/解除封鎖、查看歷史預約
export default function ClientsTab({
  appointments,
  technicians,
  onRefresh,
}: {
  appointments: any[];
  technicians: Technician[];
  onRefresh: () => void;
}) {
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);

  useEffect(() => {
    fetchBlacklist();
  }, []);

  async function fetchBlacklist() {
    setLoading(true);
    try {
      const data = await apiFetchAllSafe<any>('telegram_users', 'is_blacklisted=eq.true&order=created_at.desc');
      setBlacklist(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function blockUser(telegramId: string, note: string = "管理員封鎖") {
    if (!telegramId || !confirm(`確定要封鎖 TG ID：${telegramId}？`)) return;
    await apiFetch(`telegram_users?telegram_id=eq.${telegramId}`, {
      method: 'PATCH',
      body: { is_blacklisted: true, note },
    }).catch(() => {});
    await apiFetch('telegram_users', {
      method: 'POST',
      body: { telegram_id: telegramId, is_blacklisted: true, is_whitelisted: false, note },
    }).catch(() => {});
    alert(`已封鎖 TG ID：${telegramId}`);
    fetchBlacklist();
    onRefresh();
  }

  async function unblockUser(telegramId: string) {
    if (!confirm("確定要將此客戶從黑名單移除？")) return;
    await apiFetch(`telegram_users?telegram_id=eq.${telegramId}`, {
      method: 'PATCH',
      body: { is_blacklisted: false, note: null },
    }).catch(() => {});
    fetchBlacklist();
    onRefresh();
  }

  // Group appointments by client_phone
  const allAppts = appointments || [];
  const clientMap: Record<string, { phone: string; telegram_id?: string; count: number; lastDate: string; appts: any[] }> = {};
  allAppts.forEach((a) => {
    const key = a.telegram_id || a.client_phone;
    if (!key) return;
    if (!clientMap[key]) {
      clientMap[key] = { phone: a.client_phone, telegram_id: a.telegram_id, count: 0, lastDate: a.date, appts: [] };
    }
    clientMap[key].count++;
    if (a.date > clientMap[key].lastDate) clientMap[key].lastDate = a.date;
    clientMap[key].appts.push(a);
  });

  const clients = Object.values(clientMap).sort((a, b) => (a.lastDate > b.lastDate ? -1 : 1));
  const filtered = search
    ? clients.filter((c) => c.phone.includes(search))
    : clients;

  function isBlocked(telegramId?: string) {
    return blacklist.some((b) => b.telegram_id === telegramId);
  }

  function getTechNickname(techId: string) {
    return technicians.find((t) => t.id === techId)?.nickname || "未知";
  }

  function getSvcName(svcId: string) {
    return appointments.find((a: any) => a.service_id === svcId)?.service_name || "未知";
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-primary">📋 客戶管理</h2>
        <span className="text-sm text-gray-500">共 {clients.length} 位客戶</span>
      </div>

      {/* 搜尋框 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜尋電話..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {loading ? (
        <p className="text-gray-400">載入中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400">無符合的客戶</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => {
            const blocked = isBlocked(client.telegram_id);
            const isExpanded = expandedPhone === client.phone;
            return (
              <div key={client.phone} className={`border rounded-xl overflow-hidden ${blocked ? "bg-red-50 border-red-200" : "bg-white"}`}>
                {/* 客戶主列 */}
                <div className="flex justify-between items-center p-4">
                  <div className="flex-1 cursor-pointer" onClick={() => setExpandedPhone(isExpanded ? null : client.phone)}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base">{client.phone}</span>
                      {blocked && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-bold">🚫 已封鎖</span>}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                      <span>📅 {client.count} 筆預約</span>
                      <span>🕒 最近：{new Date(client.lastDate).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })}</span>
                      {client.telegram_id && <span className="text-xs text-gray-400">TG: {client.telegram_id}</span>}
                    </div>
                  </div>
                  <div className="ml-4">
                    {client.telegram_id && (
                      blocked ? (
                        <button
                          onClick={() => unblockUser(client.telegram_id!)}
                          className="bg-white border border-red-300 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100"
                        >
                          解除封鎖
                        </button>
                      ) : (
                        <button
                          onClick={() => blockUser(client.telegram_id!)}
                          className="bg-red-100 border border-red-300 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-200"
                        >
                          🚫 封鎖
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* 展開的歷史預約 */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    <p className="text-sm font-bold text-gray-500 mb-2">📋 預約歷史</p>
                    <div className="space-y-2">
                      {[...client.appts].reverse().map((apt: any, idx: number) => (
                        <div key={idx} className="flex gap-3 items-center text-sm bg-white rounded-lg p-3 border">
                          <span className="font-bold text-xs text-gray-400 w-20">
                            {new Date(apt.date).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })}
                          </span>
                          <span className="text-xs text-gray-500 w-16">{apt.start_time?.slice(0, 5)}</span>
                          <span className="font-bold text-xs">{getTechNickname(apt.technician_id)}</span>
                          <span className="text-xs text-gray-600">{apt.service_name || getSvcName(apt.service_id)}</span>
                          <span className="ml-auto text-xs text-primary font-bold">{apt.price > 0 ? `$${apt.price}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
