"use client";

import { useState, useEffect } from "react";
import { apiFetch, apiFetchAllSafe } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "Reservation_sej_bot";

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timeToStr(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}
interface Technician {
  id: string;
  name: string;
  nickname: string;
  specialty: string;
}
interface Shift {
  id: string;
  technician_id: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date?: string;
}
interface Appointment {
  id: string;
  technician_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  client_phone?: string;
}
interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

/**
 * 根據技師的班表產生可預約時段。
 * 支援跨夜班：22:00-24:00 屬於起班日（date），00:00-06:00 屬於結班日（end_date）。
 * 傳入的 shiftsForDay 須包含起班日的班表 + 前一日的跨夜延續班。
 */
function generateSlots(
  shiftsForDay: Shift[],
  serviceDuration: number,
  appointments: Appointment[],
  date: string,
): TimeSlot[] {
  if (!date || shiftsForDay.length === 0) return [];

  const slots: TimeSlot[] = [];
  const seen = new Set<string>();
  // 使用台灣時間（UTC+8），避免 Vercel Edge Runtime 用 UTC 導致比較錯誤
  const now = new Date();
  const taipeiStr = now.toLocaleString("en-US", { timeZone: "Asia/Taipei" });
  const taipeiNow = new Date(taipeiStr);
  const todayStr =
    taipeiNow.getFullYear() +
    "-" +
    String(taipeiNow.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(taipeiNow.getDate()).padStart(2, "0");
  const nowMin = taipeiNow.getHours() * 60 + taipeiNow.getMinutes();

  const normalizedShifts: { startMin: number; endMin: number }[] = [];

  for (const shift of shiftsForDay) {
    const isOvernight = shift.start_time > shift.end_time;

    if (isOvernight && shift.end_date === date && shift.date !== date) {
      // 跨夜延續：此 shift 的 end_date === 當前日期 → 只取凌晨段 00:00 ~ end_time
      normalizedShifts.push({ startMin: 0, endMin: parseTime(shift.end_time) });
    } else if (isOvernight && shift.date === date) {
      // 跨夜起班：此 shift 的 date === 當前日期 → 只取白天段 start_time ~ 24:00
      normalizedShifts.push({ startMin: parseTime(shift.start_time), endMin: 24 * 60 });
    } else {
      // 普通班（非跨夜）
      normalizedShifts.push({
        startMin: parseTime(shift.start_time),
        endMin: parseTime(shift.end_time),
      });
    }
  }

  for (const shift of normalizedShifts) {
    const { startMin, endMin } = shift;

    for (let i = 0; i < (endMin - startMin) / 30; i++) {
      const slotStart = startMin + i * 30;
      const slotEnd = slotStart + 30;
      if (slotEnd > endMin) break;

      const key = timeToStr(slotStart % (24 * 60));
      if (seen.has(key)) continue;
      seen.add(key);

      // 檢查是否與現有預約衝突
      const hasConflict = appointments.some((apt) => {
        const aptStart = parseTime(apt.start_time);
        const aptEnd = parseTime(apt.end_time);
        const slotServiceEnd = slotStart + serviceDuration;
        return slotStart < aptEnd && slotServiceEnd > aptStart;
      });

      // 此處 date 已經是新邏輯下的正確日期（起班日或結班日）
      const isPast = date < todayStr
        ? true
        : date === todayStr && slotStart < nowMin;

      slots.push({
        start: timeToStr(slotStart % (24 * 60)),
        end: timeToStr(slotEnd % (24 * 60)),
        available: !hasConflict && !isPast,
      });
    }
  }

  // 按時間升冪排序
  slots.sort((a, b) => parseTime(a.start) - parseTime(b.start));
  return slots;
}

export default function BookingClient() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [selectedTech, setSelectedTech] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedServiceDuration, setSelectedServiceDuration] = useState(60);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginCode, setLoginCode] = useState("");
  const [loginStep, setLoginStep] = useState<
    "idle" | "waiting" | "verifying" | "verified"
  >("idle");
  const [loginLoading, setLoginLoading] = useState(false);

  const router = useRouter();

  // ── 從 URL 參數判斷驗證方式 ──
  // 原則：打一次 API 就決定結果，不 polling
  useEffect(() => {
    const tgId = sessionStorage.getItem("telegram_id");
    if (tgId) {
      setIsLoggedIn(true);
      setLoginStep("verified");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const loginToken = params.get("login");
    const codeFromUrl = params.get("code");

    // ── 流程 A：?login=token 深層連結 ──
    if (loginToken && loginToken.length >= 10) {
      setLoginStep("verifying");
      setMessage("驗證中...");

      fetch(`/api/auth/login-token?token=${loginToken}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.telegram_id) {
            sessionStorage.setItem("telegram_id", data.telegram_id);
            sessionStorage.setItem("first_name", data.first_name || "用戶");
            setIsLoggedIn(true);
            setLoginStep("verified");
            setMessage("");
            window.history.replaceState({}, "", "/book");
          } else {
            setMessage(data.error || "登入連結已失效，請重新操作");
            setLoginStep("idle");
          }
        })
        .catch(() => {
          setMessage("網路錯誤，請重新整理");
          setLoginStep("idle");
        })
        .finally(() => setLoginLoading(false));
      return;
    }

    // ── 流程 B：?code=XXXXXX 驗證碼連結 ──
    // Bot 已確認 → verified=true → 直接完成登入
    // Bot 還沒確認 → 引導用戶去 Bot 回傳，不 polling
    if (codeFromUrl && codeFromUrl.length === 6) {
      setLoginCode(codeFromUrl);
      setLoginStep("verifying");
      setMessage("驗證中...");

      fetch(`/api/auth/request-code?code=${codeFromUrl}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.verified) {
            sessionStorage.setItem("telegram_id", data.telegram_id || codeFromUrl);
            setIsLoggedIn(true);
            setLoginStep("verified");
            setMessage("");
            window.history.replaceState({}, "", "/book");
          } else {
            // 不 polling，直接引導用戶去 Bot
            setLoginStep("waiting");
            setMessage(data.error || "請先在 Bot 回傳驗證碼，再回到這裡");
          }
        })
        .catch(() => {
          setMessage("網路錯誤，請重新整理");
          setLoginStep("waiting");
        })
        .finally(() => setLoginLoading(false));
      return;
    }

    // 沒有 URL 參數 → 保持 idle
    setLoginStep("idle");
  }, []);

  async function fetchInitialData() {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Use cached API for technicians + services (5-min Next.js Data Cache + 60-s in-memory)
      const [cacheRes, shiftsData, aptData] = await Promise.all([
        fetch(`/api/cache/initial-data`),
        apiFetchAllSafe('shifts', `date=gte.${today}&order=date.asc`),
        apiFetchAllSafe('appointments', `date=gte.${today}&order=date.asc,start_time.asc&status=neq.cancelled`),
      ]);

      const cacheData = await cacheRes.json();
      setTechnicians(cacheData.technicians || []);
      setServices(cacheData.services || []);
      setShifts(shiftsData || []);
      setAppointments(aptData || []);

      const now = new Date();
      const taipeiStr = now.toLocaleString("en-US", { timeZone: "Asia/Taipei" });
      const taipeiDate = new Date(taipeiStr);
      const dateOptions: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(taipeiDate);
        d.setDate(taipeiDate.getDate() + i);
        dateOptions.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        );
      }
      setDates(dateOptions);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function retryUrlCode() {
    if (!loginCode || loginCode.length !== 6) return;
    setLoginLoading(true);
    setMessage("檢查中...");
    try {
      const res = await fetch(`/api/auth/request-code?code=${loginCode}`);
      const data = await res.json();
      if (data.ok && data.verified) {
        sessionStorage.setItem("telegram_id", data.telegram_id || loginCode);
        setIsLoggedIn(true);
        setLoginStep("verified");
        setMessage("");
        window.history.replaceState({}, "", "/book");
      } else {
        setMessage("驗證碼尚未確認，請先去 Bot 回傳驗證碼");
      }
    } catch {
      setMessage("網路錯誤，請重新整理");
    }
    setLoginLoading(false);
  }

  async function verifyCode(codeOverride?: string) {
    const code = codeOverride || loginCode;
    if (code.length !== 6) {
      setMessage("請輸入 6 碼驗證碼");
      return;
    }
    setLoginLoading(true);
    setMessage("等待 Bot 確認中...");

    let attempts = 0;
    const maxAttempts = 30;

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        setMessage("等待逾時，請確認是否已在 Bot 回傳驗證碼？");
        setLoginLoading(false);
        return;
      }
      attempts++;
      try {
        const res = await fetch(`/api/auth/request-code?code=${code}`);
        const data = await res.json();
        if (data.ok && data.verified) {
          sessionStorage.setItem("telegram_id", data.telegram_id || code);
          setIsLoggedIn(true);
          setLoginStep("verified");
          setMessage("");
          window.history.replaceState({}, "", "/book");
          setLoginLoading(false);
          return;
        }
        if (data.waitForBot || data.error) {
          // 未驗證 → 停止 polling，引導用戶去 Bot
          setMessage(data.error || "請先在 Bot 回傳驗證碼，再回到這裡");
          setLoginLoading(false);
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
      return poll();
    };

    await poll();
  }

  function openBot() {
    window.open(`https://t.me/${BOT_USERNAME}?start=login`, "_blank");
  }

  // ⚠️ 資料庫一位技師一天有3個班，但我們只取第一個（實際上班的那個）
  // 未來可改為讓用戶自己選班，現階段先用第一筆
  const currentDayShifts =
    selectedTech && selectedDate
      ? shifts
          .filter(
            (s) =>
              s.technician_id === selectedTech && s.date === selectedDate,
          )
          .slice(0, 1) // 只取第一班
      : [];
  // 跨夜延續：前一日的跨夜班（start_time > end_time）在結班日也要顯示 00:00-06:00
  const overnightContinuations =
    selectedTech && selectedDate
      ? shifts.filter(
          (s) =>
            s.technician_id === selectedTech &&
            s.end_date === selectedDate &&
            s.date !== selectedDate &&
            s.start_time > s.end_time,
        )
      : [];
  const filteredShifts = [...currentDayShifts, ...overnightContinuations];

  // 預約衝突檢測：也包含前一日的跨夜預約（00:00-06:00 時段）
  const filteredAppointments =
    selectedTech && selectedDate
      ? appointments.filter(
          (a) =>
            a.technician_id === selectedTech &&
            (a.date === selectedDate ||
             (a.date === addDays(selectedDate, -1) && parseInt(a.start_time) < 360)),
        )
      : [];
  const slots = generateSlots(
    filteredShifts,
    selectedServiceDuration,
    filteredAppointments,
    selectedDate,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTech || !selectedService || !selectedDate || !selectedSlot) {
      setMessage("請填寫所有欄位");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const end_time = (() => {
        const s = parseTime(selectedSlot.start) + selectedServiceDuration;
        return timeToStr(s % (24 * 60));
      })();

      const response = await apiFetch<any>(
        'appointments',
        {
          method: 'POST',
          body: {
            technician_id: selectedTech,
            service_id: selectedService,
            client_nickname: sessionStorage.getItem("first_name") || "用戶",
            client_phone: "Telegram",
            date: selectedDate,
            start_time: selectedSlot.start,
            end_time,
            status: "confirmed",
            telegram_id: sessionStorage.getItem("telegram_id") || null,
          },
          prefer: 'return=representation',
        },
      ).then(() => true).catch(() => false);

      if (response) {
        const techName =
          technicians.find((t) => t.id === selectedTech)?.nickname ||
          selectedTech;
        const svc = services.find((s) => s.id === selectedService);
        const endTime = (() => {
          const s = parseTime(selectedSlot.start) + selectedServiceDuration;
          return timeToStr(s % (24 * 60));
        })();
        sessionStorage.setItem(
          "last_booking",
          JSON.stringify({
            technician: techName,
            service: svc?.name || selectedService,
            date: selectedDate,
            time: selectedSlot.start,
            endTime,
            price: svc?.price || 0,
            duration: selectedServiceDuration,
          }),
        );
        setSelectedSlot(null);
        fetchInitialData();
        window.location.href = "/book/success";
      } else {
        setMessage("❌ 預約失敗，請稍後再試");
      }
    } catch (e) {
      setMessage("❌ 發生錯誤，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-gray-500">載入中...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-primary mb-2">身份驗證</h2>
          <p className="text-gray-500 mb-6 text-sm">
            用 Telegram 帳戶驗證，快速又安全
          </p>

          {loginStep === "idle" && (
            <div className="space-y-4">
              <button
                onClick={openBot}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-secondary transition-colors flex items-center justify-center gap-3"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.37 3.73-1.38.11 0 .37.03.54.17.15.12.19.28.21.45-.01.06.01.24 0 .38z" />
                </svg>
                Login with Telegram
              </button>
            </div>
          )}

          {loginStep === "verifying" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
                <p className="text-primary font-bold text-lg">驗證中...</p>
              </div>
            </div>
          )}

          {loginStep === "waiting" && (
            <div className="space-y-4">
              {loginCode.length === 6 ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                    <p className="text-sm text-blue-700 font-bold mb-2">
                      📱 驗證碼已取得
                    </p>
                    <p className="text-xs text-blue-600">
                      請先到 Telegram Bot 回傳驗證碼 <b>{loginCode}</b>
                      ，完成後再回來點擊確認。
                    </p>
                  </div>
                  <button
                    onClick={retryUrlCode}
                    disabled={loginLoading}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-secondary disabled:opacity-50"
                  >
                    {loginLoading ? "檢查中..." : "✓ 已驗證？重新檢查"}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                    <p className="text-sm text-blue-700 font-bold mb-2">
                      📱 請按以下步驟：
                    </p>
                    <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                      <li>點下方「打開 Telegram Bot」</li>
                      <li>在 Bot 輸入 /login 取得驗證碼</li>
                      <li>把驗證碼回傳給 Bot</li>
                      <li>回到這裡輸入驗證碼，按確認</li>
                    </ol>
                  </div>
                  <input
                    type="text"
                    value={loginCode}
                    onChange={(e) =>
                      setLoginCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    placeholder="輸入 Bot 回傳的驗證碼"
                    maxLength={6}
                    className="w-full border rounded-xl px-4 py-3 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => verifyCode()}
                    disabled={loginLoading}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-secondary disabled:opacity-50"
                  >
                    {loginLoading ? "驗證中..." : "✓ 確認驗證碼"}
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setLoginStep("idle");
                  setLoginCode("");
                }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                重新開始
              </button>
              <button
                onClick={openBot}
                className="text-xs text-primary hover:underline"
              >
                打開 Telegram Bot
              </button>
            </div>
          )}

          {message && (
            <p
              className={`mt-3 text-sm ${message.includes("✅") ? "text-green-600" : "text-red-500"}`}
            >
              {message}
            </p>
          )}
        </div>
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
          <h1 className="text-2xl font-bold">📅 預約服務</h1>
          <p className="text-xs text-accent mt-1">已驗證 ✓</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                1
              </span>
              選擇技師
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {technicians.map((tech) => (
                <div
                  key={tech.id}
                  onClick={() => setSelectedTech(tech.id)}
                  className={`p-4 rounded-xl shadow text-center transition-all border-2 cursor-pointer ${
                    selectedTech === tech.id
                      ? "border-primary bg-white shadow-lg"
                      : "border-transparent bg-white hover:border-primary"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-accent mx-auto mb-2 flex items-center justify-center text-lg font-bold text-primary">
                    {tech.nickname[0]}
                  </div>
                  <p className="font-bold text-sm">{tech.nickname}</p>
                  <p className="text-xs text-gray-500">{tech.specialty}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                2
              </span>
              選擇服務
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(service.id);
                    setSelectedServiceDuration(service.duration_minutes);
                    setSelectedSlot(null);
                  }}
                  className={`p-4 rounded-xl shadow text-left transition-all border-2 ${
                    selectedService === service.id
                      ? "border-primary bg-white shadow-lg"
                      : "border-transparent bg-white hover:border-primary"
                  }`}
                >
                  <p className="font-bold text-primary">{service.name}</p>
                  <p className="text-sm text-gray-500">
                    {service.duration_minutes} 分鐘
                  </p>
                  <p className="text-xl font-bold text-primary mt-2">
                    ${service.price}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                3
              </span>
              選擇日期
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dates.map((d) => {
                const dateObj = new Date(d);
                const techShiftList = selectedTech
                  ? shifts.filter(
                      (s) => s.technician_id === selectedTech && s.date === d,
                    )
                  : [];
                // 跨夜延續：前一日的跨夜班在結班日也要顯示時段
                const techOvernightCont = selectedTech
                  ? shifts.filter(
                      (s) =>
                        s.technician_id === selectedTech &&
                        s.end_date === d &&
                        s.date !== d &&
                        s.start_time > s.end_time,
                    )
                  : [];
                const hasShift =
                  techShiftList.length > 0 || techOvernightCont.length > 0;

                const isClickable = !selectedTech || hasShift;
                return (
                  <div
                    key={d}
                    onClick={() => { if (isClickable) { setSelectedDate(d); setSelectedSlot(null); } } }
                    className={`flex-1 p-4 rounded-xl border-2 text-center transition-all cursor-pointer min-w-[80px] ${
                      selectedDate === d
                        ? "border-primary bg-white shadow-lg"
                        : isClickable
                        ? "border-transparent bg-white hover:border-primary"
                        : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <p className="text-xs text-gray-500">
                      {dateObj.toLocaleDateString("zh-TW", {
                        weekday: "short",
                      })}
                    </p>
                    <p className="font-bold text-lg">{dateObj.getDate()}</p>
                    <p className="text-xs text-gray-500">
                      {dateObj.toLocaleDateString("zh-TW", { month: "short" })}
                    </p>

                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                4
              </span>
              選擇時段
            </h2>
            {selectedTech && selectedDate && selectedService ? (
              filteredShifts.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-500 mb-3">
                    {(() => {
                      // 格式化：{技師名} 在 {日期}：{時段}
                      // 範例：琳琳 在 2026/5/28：22:00-06:00
                      const techName =
                        technicians.find((t) => t.id === selectedTech)?.nickname ||
                        selectedTech;
                      const [y, m, d] = selectedDate.split('-');
                      const formattedDate = `${parseInt(y)}/${parseInt(m)}/${parseInt(d)}`;
                      const uniqueShifts = [...new Map(filteredShifts.map(s => [s.id, s])).values()];
                      if (uniqueShifts.length === 0) return '';
                      const toMin = (t: string): number => {
                        const [h, m] = t.split(':').map(Number);
                        return h * 60 + m;
                      };
                      const starts = uniqueShifts.map(s => toMin(s.start_time));
                      const ends = uniqueShifts.map(s => toMin(s.end_time));
                      // 判斷是否有跨夜（晚上的開始 + 早上的結束）
                      const eveningStarts = starts.filter(m => m >= 1080);
                      const morningEnds = ends.filter(m => m > 0 && m <= 720);
                      const isOvernight = eveningStarts.length > 0 && morningEnds.length > 0;
                      const overallStart = isOvernight ? Math.max(...starts) : Math.min(...starts);
                      const overallEnd = isOvernight ? Math.max(...morningEnds) : Math.max(...ends);
                      const fmt = (m: number) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                      return `${techName} 在 ${formattedDate}：${fmt(overallStart)}-${fmt(overallEnd)}`;
                    })()}
                  </p>
                  {slots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-4 py-3 rounded-xl shadow text-center transition-all border-2 min-w-[100px] ${
                            selectedSlot?.start === slot.start
                              ? "border-primary bg-white shadow-lg"
                              : slot.available
                                ? "border-transparent bg-white hover:border-primary"
                                : "border-transparent bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <p className="font-bold text-sm">{slot.start}</p>
                          <p className="text-xs mt-1">
                            {(() => {
                              // 使用台灣時間（UTC+8），避免 Vercel Edge Runtime 時間錯誤
                              const now = new Date();
                              const taipeiStr = now.toLocaleString("en-US", { timeZone: "Asia/Taipei" });
                              const taipeiNow = new Date(taipeiStr);
                              const today =
                                taipeiNow.getFullYear() +
                                "-" +
                                String(taipeiNow.getMonth() + 1).padStart(2, "0") +
                                "-" +
                                String(taipeiNow.getDate()).padStart(2, "0");
                              const nowMin =
                                taipeiNow.getHours() * 60 + taipeiNow.getMinutes();
                              // 判斷時段是否已過期（跨夜時段已被 generateSlots 正確分配到對應日期）
                              const isPast = selectedDate < today
                                ? true
                                : selectedDate === today &&
                                  parseTime(slot.start) < nowMin;
                              return isPast
                                ? "⏰ 已過期"
                                : slot.available
                                  ? "🟢 可預約"
                                  : "🔴 已預約";
                            })()}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl">
                      ⚠️ 無法安排（{selectedServiceDuration} 分鐘）
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl">
                  ⚠️ 此技師當日沒有值班
                </div>
              )
            ) : (
              <div className="bg-gray-50 text-gray-500 p-4 rounded-xl">
                請先選擇技師、服務和日期
              </div>
            )}
          </section>

          <button
            type="submit"
            disabled={
              submitting ||
              !selectedTech ||
              !selectedService ||
              !selectedDate ||
              !selectedSlot
            }
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "處理中..." : "確認預約"}
          </button>

          {message && (
            <div
              className={`p-4 rounded-xl text-center ${
                message.includes("成功")
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {message}
            </div>
          )}
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          📍 24小時服務・全年不休
          <br />
          💬 如需更改，請致電客服
        </p>
      </main>
    </div>
  );
}