"use client";

import { useState } from "react";
import type { Service } from "../types";

interface ServicesTabProps {
  services: Service[];
  onRefresh: () => void;
}

export default function ServicesTab({
  services,
  onRefresh,
}: ServicesTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState("");
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditId("");
    setFormName("");
    setFormPrice("");
    setFormDuration("60");
    setShowModal(true);
  }
  function openEdit(s: Service) {
    setEditId(s.id);
    setFormName(s.name);
    setFormPrice(String(s.price));
    setFormDuration(String(s.duration_minutes));
    setShowModal(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formName,
        price: Number(formPrice),
        duration_minutes: Number(formDuration),
      };
      if (editId) {
        await fetch(`/api/services/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("確定要刪除此服務項目？")) return;
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    onRefresh();
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
  );
}
