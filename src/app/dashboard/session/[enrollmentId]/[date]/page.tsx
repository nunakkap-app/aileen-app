import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { SessionTimer } from "@/components/SessionTimer";
import { completeLesson, overrideSessionTime, rescheduleSession, saveNote, uploadMedia } from "../../actions";
import { HomeworkSection } from "@/components/HomeworkSection";

function timeToSeconds(t: string) {
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ enrollmentId: string; date: string }>;
}) {
  const { enrollmentId, date } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const [{ data: enrollment }, { data: log }, { data: override }, { data: assignments }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("*, children(full_name), subjects(name), lesson_schedules(*), practice_schedules(hours_per_session, weekdays)")
      .eq("id", enrollmentId)
      .single(),
    supabase
      .from("practice_logs")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .eq("log_date", date)
      .maybeSingle(),
    supabase
      .from("session_overrides")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .eq("original_date", date)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select("id, title, submissions(id, status, last_practiced_date)")
      .eq("enrollment_id", enrollmentId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const redirectPath = `/dashboard/session/${enrollmentId}/${date}`;
  const isLesson = enrollment?.mode === "lesson";

  const weekday = new Date(date).getDay();
  const matchingLessonSchedule = enrollment?.lesson_schedules?.find(
    (s: { weekday: number; start_date: string; end_date: string | null }) =>
      s.weekday === weekday && date >= s.start_date && (!s.end_date || date <= s.end_date),
  );
  const matchingPracticeSchedule = enrollment?.practice_schedules?.find(
    (s: { weekdays: number[] }) => s.weekdays.includes(weekday),
  );

  // Effective time — override wins over schedule
  const effectiveStartTime = override?.override_start_time ?? matchingLessonSchedule?.start_time;
  const effectiveEndTime = override?.override_end_time ?? matchingLessonSchedule?.end_time;
  const effectiveHours = override?.override_hours ?? matchingPracticeSchedule?.hours_per_session;
  const lessonDurationSeconds =
    effectiveStartTime && effectiveEndTime
      ? timeToSeconds(effectiveEndTime) - timeToSeconds(effectiveStartTime)
      : 0;

  const rescheduledTo = override?.new_date;

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} />
      <main className="mx-auto max-w-lg px-6 py-10">
        <a href="/dashboard/manage" className="mb-4 inline-block text-sm text-indigo-600 hover:underline">
          ‹ กลับไปจัดการตาราง
        </a>
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          {enrollment?.children?.full_name} · {enrollment?.subjects?.name}
        </h1>
        <p className="mb-1 text-sm text-slate-500">
          {new Date(date).toLocaleDateString("th-TH", { dateStyle: "full" })}
        </p>
        {rescheduledTo && (
          <p className="mb-4 text-xs text-amber-600">↔ ย้ายไปเรียน {new Date(rescheduledTo).toLocaleDateString("th-TH", { dateStyle: "long" })} แทน</p>
        )}

        {/* Timer / complete */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {isLesson ? (
            log?.status === "done" ? (
              <p className="text-emerald-600">
                ✓ เรียนเสร็จแล้ว ({(log.elapsed_seconds / 3600).toFixed(1)} ชม.)
              </p>
            ) : (
              <form action={completeLesson} className="flex items-center gap-3">
                <input type="hidden" name="enrollment_id" value={enrollmentId} />
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="duration_seconds" value={lessonDurationSeconds} />
                <button
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  type="submit"
                >
                  ✓ เรียนเสร็จแล้ว
                </button>
                {effectiveStartTime && effectiveEndTime && (
                  <span className="text-sm text-slate-500">
                    ({effectiveStartTime.slice(0, 5)}-{effectiveEndTime.slice(0, 5)} ·{" "}
                    {(lessonDurationSeconds / 3600).toFixed(1)} ชม.{override?.override_start_time ? " ✏︎" : ""})
                  </span>
                )}
              </form>
            )
          ) : (
            <SessionTimer log={log ?? null} enrollmentId={enrollmentId} date={date} redirectPath={redirectPath} />
          )}
        </div>

        {/* One-off time/hours override */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">แก้ไขเฉพาะครั้งนี้</h2>
          {isLesson ? (
            <form action={overrideSessionTime} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="enrollment_id" value={enrollmentId} />
              <input type="hidden" name="date" value={date} />
              <label className="text-xs text-slate-500">เวลาเริ่ม</label>
              <input
                name="start_time"
                type="time"
                defaultValue={effectiveStartTime?.slice(0, 5)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <label className="text-xs text-slate-500">ถึง</label>
              <input
                name="end_time"
                type="time"
                defaultValue={effectiveEndTime?.slice(0, 5)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
                บันทึก
              </button>
            </form>
          ) : (
            <form action={overrideSessionTime} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="enrollment_id" value={enrollmentId} />
              <input type="hidden" name="date" value={date} />
              <label className="text-xs text-slate-500">ชั่วโมงวันนี้</label>
              <input
                name="hours"
                type="number"
                step="0.5"
                min="0.5"
                defaultValue={effectiveHours ?? ""}
                placeholder="ชม."
                className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
                บันทึก
              </button>
            </form>
          )}

          {/* Reschedule to another date */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs text-slate-500">ย้ายไปวันอื่น (เฉพาะครั้งนี้)</p>
            <form action={rescheduleSession} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="enrollment_id" value={enrollmentId} />
              <input type="hidden" name="original_date" value={date} />
              <input
                name="new_date"
                type="date"
                defaultValue={rescheduledTo ?? ""}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700" type="submit">
                ย้ายวัน
              </button>
            </form>
          </div>
        </div>

        {/* Homework */}
        <HomeworkSection assignments={assignments ?? []} enrollmentId={enrollmentId} date={date} />

        {/* Note */}
        {log && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">บันทึกผล</h2>
            <form action={saveNote} className="flex flex-col gap-2">
              <input type="hidden" name="log_id" value={log.id} />
              <input type="hidden" name="redirect_path" value={redirectPath} />
              <textarea
                name="note"
                placeholder="รายงานผลการซ้อม เช่น ทำได้ดีตรงไหน ต้องฝึกอะไรต่อ"
                defaultValue={log.note ?? ""}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">
                บันทึก
              </button>
            </form>
          </div>
        )}

        {/* Media */}
        {log && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">คลิป/รูปการบ้าน</h2>
            {log.media_url && (
              <p className="mb-3 text-sm">
                <a href={log.media_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  ดูไฟล์ที่ส่งไว้
                </a>
              </p>
            )}
            <form action={uploadMedia} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="log_id" value={log.id} />
              <input type="hidden" name="redirect_path" value={redirectPath} />
              <input name="file" type="file" accept="image/*,video/*" required className="text-sm" />
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" type="submit">
                อัปโหลด
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
