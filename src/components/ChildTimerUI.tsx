"use client";

import { useEffect, useRef, useState } from "react";
import { saveChildPractice } from "@/app/child/timer/[assignmentId]/actions";

type Props = {
  assignmentId: string;
  enrollmentId: string;
  title: string;
  description: string | null;
  suggestedMinutes: number | null;
  locale: "th" | "en";
  t: Record<string, string>;
};

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ChildTimerUI({ assignmentId, enrollmentId, title, description, suggestedMinutes, locale: _locale, t }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const target = suggestedMinutes ? suggestedMinutes * 60 : null;
  const progress = target ? Math.min(elapsed / target, 1) : null;
  const circumference = 2 * Math.PI * 88;

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-indigo-50 to-white px-6 pt-10">
      <div className="mb-6 w-full max-w-sm">
        <a href="/child" className="text-sm text-slate-400 hover:text-slate-600">← {_locale === "en" ? "Back" : "กลับ"}</a>
      </div>

      <div className="mb-8 w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{description}</p>}
        {suggestedMinutes && (
          <p className="mt-1 text-xs text-slate-400">{t.suggested} {suggestedMinutes} {t.minutes}</p>
        )}
      </div>

      <div className="relative mb-8 flex h-52 w-52 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="88" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          {progress !== null && (
            <circle
              cx="100" cy="100" r="88" fill="none"
              stroke={progress >= 1 ? "#10b981" : "#6366f1"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-all duration-1000"
            />
          )}
        </svg>
        <div className="text-center">
          <p className={`text-5xl font-mono font-bold tabular-nums ${progress && progress >= 1 ? "text-emerald-500" : "text-slate-900"}`}>
            {fmt(elapsed)}
          </p>
          {progress !== null && progress >= 1 && (
            <p className="mt-1 text-sm font-medium text-emerald-500">ครบเวลาแล้ว! 🎉</p>
          )}
        </div>
      </div>

      {!done ? (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className={`w-full rounded-2xl py-4 text-lg font-semibold transition-colors ${
              running
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {running ? `⏸ ${t.pause}` : elapsed === 0 ? `▶ ${t.start}` : `▶ ${t.resume}`}
          </button>

          {elapsed > 0 && (
            <form action={saveChildPractice}>
              <input type="hidden" name="assignment_id" value={assignmentId} />
              <input type="hidden" name="enrollment_id" value={enrollmentId} />
              <input type="hidden" name="elapsed_seconds" value={elapsed} />
              <button
                type="submit"
                onClick={() => setDone(true)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-lg font-semibold text-slate-700 hover:bg-slate-50"
              >
                ✅ {t.finish}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-2xl">🎉</p>
          <p className="text-base font-semibold text-slate-800">{t.elapsed} {fmt(elapsed)}</p>
          <p className="text-sm text-slate-400">กำลังกลับหน้าหลัก...</p>
        </div>
      )}
    </div>
  );
}
