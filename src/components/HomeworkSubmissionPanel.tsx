"use client";

import { HomeworkTimer } from "@/components/HomeworkTimer";
import { markHomeworkSubmitted, saveHomeworkNote, uploadHomeworkMedia } from "@/app/dashboard/homework/actions";

type Submission = {
  id: string;
  status: string;
  content: string | null;
  media_url: string | null;
  timer_status: string;
  elapsed_seconds: number;
  running_since: string | null;
  submitted_at: string | null;
  last_practiced_date: string | null;
};

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} ชม. ${m} นาที` : `${m} นาที`;
}

export function HomeworkSubmissionPanel({
  submission,
  assignmentId,
  redirectPath,
}: {
  submission: Submission;
  assignmentId: string;
  redirectPath: string;
}) {
  const isSubmitted = submission.status === "submitted";
  const timerDone = submission.timer_status === "done" || submission.elapsed_seconds > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Timer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        {isSubmitted && submission.elapsed_seconds > 0 ? (
          <p className="text-sm text-emerald-600">⏱ จับเวลาทั้งหมด {formatDuration(submission.elapsed_seconds)}</p>
        ) : isSubmitted ? null : (
          <HomeworkTimer submission={submission} redirectPath={redirectPath} />
        )}
      </div>

      {/* Upload — shown after timer started, or always if not submitted */}
      {!isSubmitted && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">📎 อัปโหลดคลิป / รูป (ถ้ามี)</p>
          {submission.media_url && (
            <a
              href={submission.media_url}
              target="_blank"
              rel="noreferrer"
              className="mb-2 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
            >
              ดูไฟล์ที่แนบไว้ ↗
            </a>
          )}
          <form action={uploadHomeworkMedia} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="submission_id" value={submission.id} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            <input name="file" type="file" accept="image/*,video/*" className="text-sm text-slate-600" />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              อัปโหลด
            </button>
          </form>
        </div>
      )}

      {isSubmitted && submission.media_url && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 text-xs font-semibold text-slate-500">📎 ไฟล์แนบ</p>
          <a
            href={submission.media_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
          >
            ดูไฟล์ ↗
          </a>
        </div>
      )}

      {/* Note */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-semibold text-slate-500">📝 โน้ต / ข้อความถึงครู (ถ้ามี)</p>
        {isSubmitted ? (
          <p className="whitespace-pre-wrap text-sm text-slate-700">{submission.content || "—"}</p>
        ) : (
          <form action={saveHomeworkNote} className="flex flex-col gap-2">
            <input type="hidden" name="submission_id" value={submission.id} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            <textarea
              name="content"
              rows={3}
              placeholder="บันทึก / โน้ตถึงครู"
              defaultValue={submission.content ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="self-start rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              บันทึก
            </button>
          </form>
        )}
      </div>

      {/* Submit / Submitted */}
      {isSubmitted ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-700">
            ✓ ส่งการบ้านแล้ว
            {submission.submitted_at && (
              <span className="ml-2 font-normal text-emerald-600">
                {new Date(submission.submitted_at).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            )}
          </p>
          {submission.elapsed_seconds > 0 && (
            <p className="mt-0.5 text-xs text-emerald-600">เวลาทั้งหมด {formatDuration(submission.elapsed_seconds)}</p>
          )}
        </div>
      ) : (
        <form action={markHomeworkSubmitted}>
          <input type="hidden" name="submission_id" value={submission.id} />
          <input type="hidden" name="assignment_id" value={assignmentId} />
          <input type="hidden" name="redirect_path" value={redirectPath} />
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            ✓ ส่งการบ้าน
          </button>
        </form>
      )}
    </div>
  );
}
