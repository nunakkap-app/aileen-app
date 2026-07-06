"use client";

import { useEffect, useState } from "react";
import {
  pauseHomeworkTimer,
  resumeHomeworkTimer,
  startHomeworkTimer,
  stopHomeworkTimer,
} from "@/app/dashboard/homework/actions";

type Submission = {
  id: string;
  timer_status: string;
  elapsed_seconds: number;
  running_since: string | null;
};

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
}

export function HomeworkTimer({
  submission,
  redirectPath,
}: {
  submission: Submission;
  redirectPath: string;
}) {
  const [displaySeconds, setDisplaySeconds] = useState(submission.elapsed_seconds);

  useEffect(() => {
    if (submission.timer_status !== "running" || !submission.running_since) {
      setDisplaySeconds(submission.elapsed_seconds);
      return;
    }
    const base = new Date(submission.running_since).getTime();
    const tick = () => setDisplaySeconds(submission.elapsed_seconds + Math.floor((Date.now() - base) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [submission]);

  if (submission.timer_status === "idle") {
    return (
      <form action={startHomeworkTimer}>
        <input type="hidden" name="submission_id" value={submission.id} />
        <input type="hidden" name="redirect_path" value={redirectPath} />
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
        {submission.timer_status === "running" && (
          <>
            <form action={pauseHomeworkTimer}>
              <input type="hidden" name="submission_id" value={submission.id} />
              <input type="hidden" name="redirect_path" value={redirectPath} />
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" type="submit">
                พัก
              </button>
            </form>
            <form action={stopHomeworkTimer}>
              <input type="hidden" name="submission_id" value={submission.id} />
              <input type="hidden" name="redirect_path" value={redirectPath} />
              <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" type="submit">
                จบ
              </button>
            </form>
          </>
        )}
        {submission.timer_status === "paused" && (
          <>
            <form action={resumeHomeworkTimer}>
              <input type="hidden" name="submission_id" value={submission.id} />
              <input type="hidden" name="redirect_path" value={redirectPath} />
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700" type="submit">
                ทำต่อ
              </button>
            </form>
            <form action={stopHomeworkTimer}>
              <input type="hidden" name="submission_id" value={submission.id} />
              <input type="hidden" name="redirect_path" value={redirectPath} />
              <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" type="submit">
                จบ
              </button>
            </form>
          </>
        )}
        {submission.timer_status === "done" && (
          <p className="text-sm text-emerald-600">จับเวลาเสร็จ — {formatDuration(displaySeconds)}</p>
        )}
      </div>
    </div>
  );
}
