import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { SessionTimer } from "@/components/SessionTimer";
import { completeLesson, saveNote, uploadMedia } from "../../actions";

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

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*, children(full_name), subjects(name), lesson_schedules(*)")
    .eq("id", enrollmentId)
    .single();

  const { data: log } = await supabase
    .from("practice_logs")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("log_date", date)
    .maybeSingle();

  const redirectPath = `/dashboard/session/${enrollmentId}/${date}`;
  const isLesson = enrollment?.mode === "lesson";

  const weekday = new Date(date).getDay();
  const matchingLessonSchedule = enrollment?.lesson_schedules?.find(
    (s: { weekday: number; start_date: string; end_date: string | null }) =>
      s.weekday === weekday && date >= s.start_date && (!s.end_date || date <= s.end_date),
  );
  const lessonDurationSeconds = matchingLessonSchedule
    ? timeToSeconds(matchingLessonSchedule.end_time) - timeToSeconds(matchingLessonSchedule.start_time)
    : 0;

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
        <p className="mb-6 text-sm text-slate-500">
          {new Date(date).toLocaleDateString("th-TH", { dateStyle: "full" })}
        </p>

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
                {matchingLessonSchedule && (
                  <span className="text-sm text-slate-500">
                    ({matchingLessonSchedule.start_time.slice(0, 5)}-{matchingLessonSchedule.end_time.slice(0, 5)} ·{" "}
                    {(lessonDurationSeconds / 3600).toFixed(1)} ชม. ตามตาราง)
                  </span>
                )}
              </form>
            )
          ) : (
            <SessionTimer log={log ?? null} enrollmentId={enrollmentId} date={date} redirectPath={redirectPath} />
          )}
        </div>

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
