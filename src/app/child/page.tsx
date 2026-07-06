import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChildPresenceBroadcaster } from "@/components/ChildPresence";
import { logout } from "@/app/login/actions";

const WEEKDAY_LABEL: Record<number, string> = { 1: "จ", 2: "อ", 3: "พ", 4: "พฤ", 5: "ศ", 6: "ส", 0: "อา" };

export default async function ChildHomePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const isChild = auth.user.user_metadata?.is_child === true;
  if (!isChild) redirect("/dashboard");

  const childId = auth.user.user_metadata?.child_id as string;
  const username = auth.user.user_metadata?.username as string;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      id, mode,
      subjects(name),
      practice_schedules(id, weekdays, hours_per_session, start_date, end_date),
      lesson_schedules(id, weekday, start_time, end_time, start_date, end_date),
      assignments(id, title, description, suggested_minutes, status,
        submissions(status, last_practiced_date))
    `)
    .eq("child_id", childId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <ChildPresenceBroadcaster childId={childId} />

      <header className="flex items-center justify-between px-6 py-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">สวัสดี 👋</h1>
          <p className="text-sm text-slate-500">@{username}</p>
        </div>
        <form action={logout}>
          <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
            ออกจากระบบ
          </button>
        </form>
      </header>

      <main className="flex flex-col gap-6 px-6 pb-10">
        {!enrollments?.length ? (
          <p className="text-sm text-slate-400">ยังไม่มีกิจกรรม</p>
        ) : (
          enrollments.map((e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subjectName = Array.isArray(e.subjects) ? (e.subjects[0] as any)?.name : (e.subjects as any)?.name;
            const practiceSchedules = Array.isArray(e.practice_schedules) ? e.practice_schedules : [];
            const lessonSchedules = Array.isArray(e.lesson_schedules) ? e.lesson_schedules : [];
            const assignments = (Array.isArray(e.assignments) ? e.assignments : []).filter((a) => a.status === "active");

            return (
              <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">{subjectName}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.mode === "lesson" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {e.mode === "lesson" ? "เรียน" : "ซ้อม"}
                  </span>
                </div>

                {/* Practice schedules */}
                {e.mode === "practice" && practiceSchedules.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-slate-500">ตารางซ้อม</p>
                    <div className="flex flex-col gap-1">
                      {practiceSchedules.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <span className="font-medium">
                            ทุกวัน{(s.weekdays as number[]).map((w) => WEEKDAY_LABEL[w]).join(" ")}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span>{s.hours_per_session} ชม.</span>
                          {s.end_date && <span className="text-xs text-slate-400">ถึง {s.end_date}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lesson schedules */}
                {e.mode === "lesson" && lessonSchedules.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-slate-500">ตารางเรียน</p>
                    <div className="flex flex-col gap-1">
                      {lessonSchedules.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <span className="font-medium">ทุกวัน{WEEKDAY_LABEL[s.weekday as number]}</span>
                          <span className="text-slate-400">·</span>
                          <span>{(s.start_time as string).slice(0, 5)}–{(s.end_time as string).slice(0, 5)}</span>
                          {s.end_date && <span className="text-xs text-slate-400">ถึง {s.end_date}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignments */}
                {assignments.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-500">การบ้าน ({assignments.length})</p>
                    <div className="flex flex-col gap-2">
                      {assignments.map((a) => {
                        const sub = Array.isArray(a.submissions) ? a.submissions[0] : a.submissions;
                        const submitted = sub?.status === "submitted";
                        return (
                          <a
                            key={a.id}
                            href={`/dashboard/homework/${a.id}`}
                            className={`block rounded-xl border p-3 transition-colors hover:border-indigo-200 ${submitted ? "border-emerald-100 bg-emerald-50" : "border-slate-200"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${submitted ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                {a.title}
                              </p>
                              {submitted ? (
                                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">ส่งแล้ว ✓</span>
                              ) : (
                                <span className="shrink-0 h-2 w-2 mt-1.5 rounded-full bg-amber-400" />
                              )}
                            </div>
                            {a.description && (
                              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{a.description}</p>
                            )}
                            {a.suggested_minutes && (
                              <p className="mt-1 text-xs text-slate-400">⏱ {a.suggested_minutes} นาที</p>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {assignments.length === 0 && (
                  <p className="text-xs text-slate-400">ยังไม่มีการบ้าน</p>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
