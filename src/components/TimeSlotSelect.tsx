"use client";
import { useState, useRef, useEffect } from "react";

interface TimeSlotSelectProps {
  value: string;
  date: string;
  onChange: (time: string) => void;
}

export default function TimeSlotSelect({ value, date, onChange }: TimeSlotSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Generate 24 slots: 00:00, 01:00, ..., 23:00 (whole hours only)
  const allSlots = Array.from({ length: 24 }, (_, i) =>
    `${String(i).padStart(2, "0")}:00`
  );

  // Today's date string
  const today = new Date().toISOString().split("T")[0];
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  // Filter: if selected date === today, hide past slots (whole hours only)
  const visibleSlots = allSlots.filter((slot) => {
    if (date !== today) return true;
    const hour = parseInt(slot.split(":")[0], 10);
    return hour * 60 > nowMin;
  });

  // Fallback: if all slots filtered out, use last slot and clear stale value
  const fallbackSlot = allSlots[allSlots.length - 1]; // "23:00"
  const displaySlots = visibleSlots.length > 0 ? visibleSlots : [fallbackSlot];
  // If current value is not in visible slots and we're on today, reset to fallback
  const effectiveValue = (date === today && !visibleSlots.includes(value)) ? fallbackSlot : value;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Determine display label
  const label = effectiveValue || "請選擇時間";

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border rounded-lg px-3 py-2 text-left bg-white flex justify-between items-center"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>{label}</span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg overflow-y-auto max-h-64">
          {displaySlots.length === 0 ? (
            <p className="px-4 py-2 text-sm text-gray-400">已無可選時段</p>
          ) : (
            displaySlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => { onChange(slot); setOpen(false); }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-primary/10 transition-colors ${slot === effectiveValue ? "bg-primary/10 text-primary font-bold" : "text-gray-700"}`}
              >
                {slot}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
