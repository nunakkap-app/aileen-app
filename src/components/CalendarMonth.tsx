"use client";

import { useOptimistic, useState, useTransition } from "react";
import { cancelOccurrence, deleteSessionOverride, rescheduleSession } from "@/app/dashboard/session/actions";
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
  pricingType?: string | null;
  totalSessions?: number | null;
};

export type SessionOverride = {
  enrollmentId: string;
  originalDate: string;
  newDate: string | null;
  overrideStartTime?: string | null;
  overrideEndTime?: string | null;
  overrideHours?: number | null;
};

type DisplayItem = Item & {
  _key: string;
  isRescheduled: boolean;
  originalDate: string;  // always the true scheduled date (for session link + drag fromDate)
  overrideLabel?: string;
  sessionNumber?: number;
};

type DragState = {
  enrollmentId: string;
  originalDate: string;  // true origin date (for override key)
};

const weekdayLabels = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function calcSessionNumber(
  weekday: number,
  startDate: string,
  toDate: string,
  excludedSet: Set<string>,
  itemId: string,
): number {
  let count = 0;
  const cur = new Date(startDate + "T00:00:00");
  const end = new Date(toDate + "T00:00:00");
  while (cur <= end) {
    if (cur.getDay() === weekday) {
      const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      if (!excludedSet.has(`${itemId}|${ds}`)) count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function CalendarMonth({
  items,
  excluded = [],
  overrides = [],
}: {
  items: Item[];
  excluded?: string[];
  overrides?: SessionOverride[];
}) {
  const [optimisticOverrides, addOptimistic] = useOptimistic(
    overrides,
    (prev: SessionOverride[], next: SessionOverride) => {
      const filtered = prev.filter(
        (o) => !(o.enrollmentId === next.enrollmentId && o.originalDate === next.originalDate),
      );
      return [...filtered, next];
    },
  );

  const [optimisticExcluded, addOptimisticExcluded] = useOptimistic(
    excluded,
    (prev: string[], next: string) => [...prev, next],
  );

  const excludedSet = new Set(optimisticExcluded);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = cursor.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  const cells: (number | null)[] = Array(startWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function dateStrFor(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function itemsForDay(day: number): DisplayItem[] {
    const dateStr = dateStrFor(day);
    const weekday = new Date(year, month, day).getDay();

    // Regular recurring items
    const regular: DisplayItem[] = items
      .filter((it) => {
        if (!it.weekdays.includes(weekday)) return false;
        if (dateStr < it.startDate) return false;
        if (it.endDate && dateStr > it.endDate) return false;
        if (excludedSet.has(`${it.id}|${dateStr}`)) return false;
        // Hide if rescheduled away from this date
        const ov = optimisticOverrides.find(
          (o) => o.enrollmentId === it.enrollmentId && o.originalDate === dateStr,
        );
        if (ov?.newDate && ov.newDate !== dateStr) return false;
        // For course pricing: hide sessions beyond total_sessions
        if (it.pricingType === "course" && it.totalSessions) {
          const sn = calcSessionNumber(it.weekdays[0], it.startDate, dateStr, excludedSet, it.id);
          if (sn > it.totalSessions) return false;
        }
        return true;
      })
      .map((it) => {
        const ov = optimisticOverrides.find(
          (o) => o.enrollmentId === it.enrollmentId && o.originalDate === dateStr,
        );
        const timeRange =
          ov?.overrideStartTime && ov.overrideEndTime
            ? `${ov.overrideStartTime.slice(0, 5)}-${ov.overrideEndTime.slice(0, 5)}`
            : it.timeRange;
        const hoursPerSession = ov?.overrideHours ?? it.hoursPerSession;
        const sessionNumber =
          it.pricingType === "course" && it.totalSessions
            ? calcSessionNumber(it.weekdays[0], it.startDate, dateStr, excludedSet, it.id)
            : undefined;
        return {
          ...it,
          _key: it.id,
          isRescheduled: false,
          originalDate: dateStr,
          timeRange,
          hoursPerSession,
          sessionNumber,
          overrideLabel: ov?.overrideStartTime || ov?.overrideHours ? "✏︎" : undefined,
        };
      });

    // Items rescheduled TO this date
    const rescheduledIn: DisplayItem[] = optimisticOverrides
      .filter((o) => o.newDate === dateStr)
      .flatMap((o) => {
        const original = items.find((it) => it.enrollmentId === o.enrollmentId);
        if (!original) return [];
        const timeRange =
          o.overrideStartTime && o.overrideEndTime
            ? `${o.overrideStartTime.slice(0, 5)}-${o.overrideEndTime.slice(0, 5)}`
            : original.timeRange;
        const hoursPerSession = o.overrideHours ?? original.hoursPerSession;
        const sessionNumber =
          original.pricingType === "course" && original.totalSessions
            ? calcSessionNumber(original.weekdays[0], original.startDate, o.originalDate, excludedSet, original.id)
            : undefined;
        return [
          {
            ...original,
            _key: `r|${o.originalDate}|${original.enrollmentId}`,
            isRescheduled: true,
            originalDate: o.originalDate,
            timeRange,
            hoursPerSession,
            sessionNumber,
            overrideLabel: "↔",
          },
        ];
      });

    return [...regular, ...rescheduledIn];
  }

  function handleDrop(toDateStr: string) {
    if (!dragState || toDateStr === dragState.originalDate) {
      setDragState(null);
      setHoveredDate(null);
      return;
    }
    const { enrollmentId, originalDate: fromDate } = dragState;
    setDragState(null);
    setHoveredDate(null);

    startTransition(async () => {
      addOptimistic({ enrollmentId, originalDate: fromDate, newDate: toDateStr });
      const fd = new FormData();
      fd.set("enrollment_id", enrollmentId);
      fd.set("original_date", fromDate);
      fd.set("new_date", toDateStr);
      await rescheduleSession(fd);
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
        <span className="inline-flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${modeDotColor.lesson}`} /> เรียน
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${modeDotColor.practice}`} /> ซ้อม
        </span>
        {dragState && (
          <span className="ml-auto font-medium text-indigo-600">วางในวันที่ต้องการ ›</span>
        )}
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {weekdayLabels.map((w) => <div key={w}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dateStr = day ? dateStrFor(day) : null;
          const isDropTarget = !!(dragState && dateStr && hoveredDate === dateStr && dateStr !== dragState.originalDate);

          return (
            <div
              key={i}
              className={`min-h-[4.5rem] rounded-lg p-1 text-xs transition-colors ${
                day ? (isDropTarget ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400" : "bg-slate-50") : ""
              }`}
              onDragOver={day ? (e) => { e.preventDefault(); setHoveredDate(dateStr); } : undefined}
              onDragLeave={day ? () => setHoveredDate((h) => (h === dateStr ? null : h)) : undefined}
              onDrop={day && dateStr ? (e) => { e.preventDefault(); handleDrop(dateStr); } : undefined}
            >
              {day && (
                <>
                  <p className="mb-1 select-none text-slate-400">{day}</p>
                  {itemsForDay(day).map((it) => {
                    const colors = categoryColor[it.category] ?? categoryColor.academic;
                    const isDragging =
                      dragState?.enrollmentId === it.enrollmentId &&
                      dragState.originalDate === it.originalDate;

                    return (
                      <div
                        key={it._key}
                        className={`mb-0.5 flex cursor-grab items-center gap-0.5 transition-opacity ${isDragging ? "opacity-40" : ""}`}
                        draggable
                        onDragStart={() =>
                          setDragState({ enrollmentId: it.enrollmentId, originalDate: it.originalDate })
                        }
                        onDragEnd={() => setDragState(null)}
                      >
                        <a
                          href={`/dashboard/session/${it.enrollmentId}/${it.originalDate}`}
                          draggable={false}
                          className={`flex flex-1 items-center gap-1 truncate rounded px-1 py-0.5 ${colors.bg} ${colors.text} ${colors.hoverBg} ${it.isRescheduled ? "border border-dashed border-current" : ""}`}
                          title={it.isRescheduled ? `ย้ายมาจาก ${it.originalDate}` : undefined}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${modeDotColor[it.kind]}`} />
                          <span className="truncate">
                            {it.label} · {it.kind === "lesson" ? it.timeRange : `${it.hoursPerSession}ชม.`}
                            {it.sessionNumber != null && (
                              <span className="ml-1 opacity-75">ครั้ง{it.sessionNumber}/{it.totalSessions}</span>
                            )}
                            {it.overrideLabel && <span className="ml-0.5 opacity-60">{it.overrideLabel}</span>}
                          </span>
                        </a>
                        {it.isRescheduled ? (
                          <button
                            type="button"
                            title="ยกเลิกการย้าย"
                            onClick={() => {
                              startTransition(async () => {
                                addOptimistic({ enrollmentId: it.enrollmentId, originalDate: it.originalDate, newDate: null });
                                await deleteSessionOverride(it.enrollmentId, it.originalDate);
                              });
                            }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="ยกเลิกวันนี้"
                            onClick={() => {
                              startTransition(async () => {
                                addOptimisticExcluded(`${it.id}|${it.originalDate}`);
                                await cancelOccurrence(it.id, it.originalDate, it.kind);
                              });
                            }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
