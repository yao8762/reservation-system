"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BookingInfo {
  technician: string;
  service: string;
  date: string;
  time: string;
  endTime: string;
  price: number;
  duration: number;
}

export default function SuccessPage() {
  const [booking, setBooking] = useState<BookingInfo | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("last_booking");
    if (stored) {
      setBooking(JSON.parse(stored));
    }
  }, []);

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">查無預約資料</p>
          <Link href="/book" className="text-primary font-bold hover:underline">
            返回預約
          </Link>
        </div>
      </div>
    );
  }

  const dateObj = new Date(booking.date);
  const formattedDate = dateObj.toLocaleDateString("zh-TW", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white py-6 px-4">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold">✅ 預約成功</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        {/* 成功標誌 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-primary">感謝您的預約！</h2>
          <p className="text-gray-500 mt-2">
            以下是您的預約資料，請牢記以下資訊
          </p>
        </div>

        {/* 預約卡片 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="font-bold text-primary mb-4 text-lg">📋 預約資料</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-gray-500 text-sm">👤 技師</span>
              <span className="font-bold">{booking.technician}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-gray-500 text-sm">💆 服務</span>
              <span className="font-bold">{booking.service}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-gray-500 text-sm">📅 日期</span>
              <span className="font-bold">{formattedDate}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-gray-500 text-sm">🕐 時間</span>
              <span className="font-bold">
                {booking.time} - {booking.endTime}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">💰 費用</span>
              <span className="font-bold text-primary text-xl">
                ${booking.price}
              </span>
            </div>
          </div>
        </div>

        {/* 提醒 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
            <span className="text-xl">⚠️</span> 重要提醒
          </h3>
          <ul className="text-sm text-yellow-700 space-y-2">
            <li>
              • 請準時抵達，若遲到超過&nbsp;<b>15 分鐘</b>&nbsp;將取消預約
            </li>
            <li>• 如需更改或取消預約，請提前聯絡客服</li>
            <li>• 若有特殊需求（如過敏、舊傷等），請於到店時告知技師</li>
            <li>
              • 首次到店請提早&nbsp;<b>5-10 分鐘</b>&nbsp;填寫資料
            </li>
          </ul>
        </div>

        {/* 按鈕 */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="block w-full bg-primary text-white text-center py-4 rounded-xl font-bold text-lg hover:bg-secondary transition-colors"
          >
            返回首頁
          </Link>
          <button
            onClick={() => {
              const text = `🎉 預約成功！
👤 技師：${booking.technician}
💆 服務：${booking.service}
📅 日期：${formattedDate}
🕐 時間：${booking.time} - ${booking.endTime}
💰 費用：$${booking.price}

請準時抵達，遲到超過15分鐘將取消預約！`;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
                alert("已複製到剪貼簿！");
              }
            }}
            className="w-full bg-white border-2 border-primary text-primary py-3 rounded-xl font-bold hover:bg-primary hover:text-white transition-colors"
          >
            複製預約資料
          </button>
        </div>
      </main>
    </div>
  );
}
