"use client";

import { useState } from "react";
import { cancelOccurrence } from "@/app/dashboard/session/actions";
import { categoryColor, categoryLabel, modeDotColor } from "@/lib/subjects";

type Item = {
  id: string;
  enrollmentId: string;
  label: string;
  category: string;
  kind: "lesson" | "practice";
  weekdays: number[];
  hoursPerSession?: number;
  timeRange?: string;
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
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-slate-500">
        {Object.entries(categoryColor).map(([cat, c]) => (
          <span key={cat} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {categoryLabel[cat]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${modeDotColor.lesson}`} /> เรียน</span>
        <span className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${modeDotColor.practice}`} /> ซ้อม</span>
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
                {itemsForDay(day).map((it) => {
                  const colors = categoryColor[it.category] ?? categoryColor.academic;
                  return (
                    <div key={it.id} className="mb-0.5 flex items-center gap-0.5">
                      <a
                        href={`/dashboard/session/${it.enrollmentId}/${dateStrFor(day)}`}
                        className={`flex flex-1 items-center gap-1 truncate rounded px-1 py-0.5 ${colors.bg} ${colors.text} ${colors.hoverBg}`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${modeDotColor[it.kind]}`} />
                        <span className="truncate">
                          {it.label} · {it.kind === "lesson" ? it.timeRange : `${it.hoursPerSession}ชม.`}
                        </span>
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
                  );
                })}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
