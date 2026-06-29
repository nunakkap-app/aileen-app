"use client";

import { useEffect, useState } from "react";
import { startTimer, resumeTimer, pauseTimer, stopTimer } from "@/app/dashboard/session/actions";

type Log = {
  id: string;
  status: "not_started" | "running" | "paused" | "done";
  elapsed_seconds: number;
  running_since: string | null;
};

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function SessionTimer({
  log,
  enrollmentId,
  date,
  redirectPath,
}: {
  log: Log | null;
  enrollmentId: string;
  date: string;
  redirectPath: string;
}) {
  const [displaySeconds, setDisplaySeconds] = useState(log?.elapsed_seconds ?? 0);

  useEffect(() => {
    if (log?.status !== "running" || !log.running_since) {
      setDisplaySeconds(log?.elapsed_seconds ?? 0);
      return;
    }
    const runningSinceMs = new Date(log.running_since).getTime();
    const tick = () => {
      setDisplaySeconds(log.elapsed_seconds + Math.floor((Date.now() - runningSinceMs) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [log]);

  if (!log || log.status === "not_started") {
    return (
      <form action={startTimer}>
        <input type="hidden" name="enrollment_id" value={enrollmentId} />
        <input type="hidden" name="date" value={date} />
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700" type="submit">
          เริ่มจับเวลา
        </button>
      </form>
    );
  }

  return (
    <div>
      <p className="mb-3 text-3xl font-semibold tabular-nums text-slate-900">{formatDuration(displaySeconds)}</p>
      <div className="flex gap-2">
        {log.status === "running" && (
          <>
            <form action={pauseTimer}>
              <input type="hidden" name="log_id" value={log.id} />
              <input type="hidden" name="redirect_path" value={redirectPath} />
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" type="submit">
                พัก
              </button>
            </form>
            <form action={stopTimer}>
              <input type="hidden" name="log_id" value={log.id} />
              <input type="hidden" name="redirect_path" value={redirectPath} />
              <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" type="submit">
                จบ
              </button>
            </form>
          </>
        )}
        {log.status === "paused" && (
          <>
            <form action={resumeTimer}>
              <input type="hidden" name="log_id" value={log.id} />
              <input type="hidden" name="redirect_path" value={redirectPath} />
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700" type="submit">
                ทำต่อ
              </button>
            </form>
            <form action={stopTimer}>
              <input type="hidden" name="log_id" value={log.id} />
              <input type="hidden" name="redirect_path" value={redirectPath} />
              <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" type="submit">
                จบ
              </button>
            </form>
          </>
        )}
        {log.status === "done" && <p className="text-sm text-emerald-600">จบการซ้อมแล้ว</p>}
      </div>
    </div>
  );
}
