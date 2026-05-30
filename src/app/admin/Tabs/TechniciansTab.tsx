"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import type { Technician, Service } from "../types";



function BookNowButton({ techId }: { techId: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/book?tech=${techId}`)}
      className="mt-2 w-full py-2 rounded-lg bg-accent text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
    >
      立即預約
    </button>
  );
}

interface TechniciansTabProps {
  technicians: Technician[];
  services: Service[];
  onRefresh: () => void;
}

export default function TechniciansTab({
  technicians,
  services,
  onRefresh,
}: TechniciansTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState("");
  const [formName, setFormName] = useState("");
  const [formNick, setFormNick] = useState("");
  const [formSpec, setFormSpec] = useState("");

  function openAdd() {
    setEditId("");
    setFormName("");
    setFormNick("");
    setFormSpec("");
    setShowModal(true);
  }
  function openEdit(t: Technician) {
    setEditId(t.id);
    setFormName(t.name);
    setFormNick(t.nickname);
    setFormSpec(t.specialty);
    setShowModal(true);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { name: formName, nickname: formNick, specialty: formSpec };
    if (editId) {
      await apiFetch(`technicians?id=eq.${editId}`, { method: 'PATCH', body }).catch(() => {});
    } else {
      await apiFetch('technicians', { method: 'POST', body }).catch(() => {});
    }
    setShowModal(false);
    onRefresh();
  }
  async function remove(id: string) {
    if (!confirm("確定要刪除此技師？")) return;
    await apiFetch(`technicians?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
    onRefresh();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-primary">👥 技師列表</h2>
        <button
          onClick={openAdd}
          className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-secondary transition-colors"
        >
          ✚ 新增技師
        </button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {technicians.map((t) => (
          <div key={t.id} className="bg-white rounded-xl p-5 shadow border">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-2xl font-bold text-primary">
                {t.nickname[0]}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(t)}
                  className="text-primary hover:bg-primary/10 px-2 py-1 rounded border border-primary/30 text-sm font-bold"
                >
                  編輯
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="text-red-500 hover:bg-red-50 px-2 py-1 rounded border border-red-200 text-sm"
                >
                  刪除
                </button>
              </div>
            </div>
            <div className="mt-3">
              <p className="font-bold text-lg text-primary">{t.nickname}</p>
              <p className="text-sm text-gray-600">{t.name}</p>
              <p className="text-sm text-secondary mt-1">{t.specialty}</p>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-bold text-primary mb-4">
              {editId ? "編輯技師" : "新增技師"}
            </h2>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1">姓名</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="王小美"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">暱稱</label>
                <input
                  value={formNick}
                  onChange={(e) => setFormNick(e.target.value)}
                  placeholder="小美"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">專長</label>
                <input
                  value={formSpec}
                  onChange={(e) => setFormSpec(e.target.value)}
                  placeholder="深層組織按摩"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-2 rounded-lg font-bold hover:bg-secondary"
                >
                  {editId ? "儲存修改" : "新增技師"}
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
