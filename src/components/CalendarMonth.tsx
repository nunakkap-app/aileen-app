"use client";

import { useState } from "react";
import { cancelOccurrence } from "@/app/dashboard/session/actions";

type Item = {
  id: string;
  enrollmentId: string;
  label: string;
  weekdays: number[];
  hoursPerSession: number;
  startDate: string;
  endDate: string | null;
};

const weekdayLabels = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export function CalendarMonth({ items, excluded = [] }: { items: Item[]; excluded?: string[] }) {
  const excludedSet = new Set(excluded);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = cursor.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  const cells: (number | null)[] = Array(startWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function dateStrFor(day: number) {
    const date = new Date(year, month, day);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function itemsForDay(day: number) {
    const date = new Date(year, month, day);
    const weekday = date.getDay();
    const dateStr = dateStrFor(day);
    return items.filter((it) => {
      if (!it.weekdays.includes(weekday)) return false;
      if (dateStr < it.startDate) return false;
      if (it.endDate && dateStr > it.endDate) return false;
      if (excludedSet.has(`${it.id}|${dateStr}`)) return false;
      return true;
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-slate-900">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {weekdayLabels.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={`min-h-[4.5rem] rounded-lg p-1 text-xs ${day ? "bg-slate-50" : ""}`}>
            {day && (
              <>
                <p className="mb-1 text-slate-400">{day}</p>
                {itemsForDay(day).map((it) => (
                  <div key={it.id} className="mb-0.5 flex items-center gap-0.5">
                    <a
                      href={`/dashboard/session/${it.enrollmentId}/${dateStrFor(day)}`}
                      className="flex-1 truncate rounded bg-indigo-100 px-1 py-0.5 text-indigo-700 hover:bg-indigo-200"
                    >
                      {it.label} · {it.hoursPerSession}ชม.
                    </a>
                    <button
                      type="button"
                      title="ยกเลิกวันนี้"
                      onClick={() => cancelOccurrence(it.id, dateStrFor(day))}
                      className="text-slate-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
