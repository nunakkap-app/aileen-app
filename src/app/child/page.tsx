import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChildPresenceBroadcaster } from "@/components/ChildPresence";
import { logout } from "@/app/login/actions";

const DOW_TH: Record<number, string> = { 0: "อา", 1: "จ", 2: "อ", 3: "พ", 4: "พฤ", 5: "ศ", 6: "ส" };
const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function getBangkokDate() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Generate all dates in a period
function getDatesInPeriod(today: Date, view: string): Date[] {
  if (view === "today") return [today];
  if (view === "week") {
    const dow = today.getDay();
    const mon = addDays(today, 1 - (dow === 0 ? 7 : dow)); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }
  // month
  const year = today.getFullYear();
  const month = today.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
}

type PracticeSchedule = { id: string; weekdays: number[]; hours_per_session: number; start_date: string; end_date: string | null };
type LessonSchedule = { id: string; weekday: number; start_time: string; end_time: string; start_date: string; end_date: string | null };
type Assignment = { id: string; title: string; description: string | null; suggested_minutes: number | null; suggested_weekdays: number[] | null; status: string; submissions: { status: string }[] };
type Enrollment = {
  id: string; mode: string;
  subjects: { name: string } | { name: string }[] | null;
  practice_schedules: PracticeSchedule[];
  lesson_schedules: LessonSchedule[];
  assignments: Assignment[];
};

function sessionOnDate(e: Enrollment, date: Date): { label: string; time?: string; hours?: number }[] {
  const dow = date.getDay();
  const ds = dateStr(date);
  const result: { label: string; time?: string; hours?: number }[] = [];
  const name = Array.isArray(e.subjects) ? (e.subjects[0] as { name: string })?.name : (e.subjects as { name: string } | null)?.name ?? "";

  for (const s of e.practice_schedules ?? []) {
    if ((s.weekdays as number[]).includes(dow) && ds >= s.start_date && (!s.end_date || ds <= s.end_date)) {
      result.push({ label: name, hours: s.hours_per_session });
    }
  }
  for (const s of e.lesson_schedules ?? []) {
    if (s.weekday === dow && ds >= s.start_date && (!s.end_date || ds <= s.end_date)) {
      result.push({ label: name, time: `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}` });
    }
  }
  return result;
}

export default async function ChildHomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view = rawView === "week" || rawView === "month" ? rawView : "today";

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
      assignments(id, title, description, suggested_minutes, suggested_weekdays, status,
        submissions(status))
    `)
    .eq("child_id", childId);

  const today = getBangkokDate();
  const todayDow = today.getDay();
  const dates = getDatesInPeriod(today, view);
  const typedEnrollments = (enrollments ?? []) as unknown as Enrollment[];

  // Build schedule: date → sessions
  const schedule: { date: Date; sessions: { label: string; time?: string; hours?: number }[] }[] = dates
    .map((d) => ({
      date: d,
      sessions: typedEnrollments.flatMap((e) => sessionOnDate(e, d)),
    }))
    .filter((d) => d.sessions.length > 0);

  // Homework: active assignments
  const allAssignments = typedEnrollments.flatMap((e) => {
    const name = Array.isArray(e.subjects) ? (e.subjects[0] as { name: string })?.name : (e.subjects as { name: string } | null)?.name ?? "";
    return (e.assignments ?? [])
      .filter((a) => a.status === "active")
      .map((a) => ({ ...a, subjectName: name }));
  });

  // For "today" view, show only assignments with suggested_weekdays including today (or no weekday restriction)
  const homework = view === "today"
    ? allAssignments.filter((a) => !a.suggested_weekdays?.length || (a.suggested_weekdays as number[]).includes(todayDow))
    : allAssignments;

  const tabs = [
    { key: "today", label: "วันนี้" },
    { key: "week", label: "สัปดาห์" },
    { key: "month", label: "เดือน" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <ChildPresenceBroadcaster childId={childId} />

      <header className="flex items-center justify-between px-5 py-4">
        <div>
          <h1 className="text-base font-bold text-slate-900">สวัสดี 👋</h1>
          <p className="text-xs text-slate-500">@{username}</p>
        </div>
        <form action={logout}>
          <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
            ออกจากระบบ
          </button>
        </form>
      </header>

      {/* View tabs */}
      <div className="flex gap-1 px-5 pb-4">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/child?view=${t.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              view === t.key
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <main className="flex flex-col gap-5 px-5 pb-10">

        {/* Schedule section */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            {view === "today" ? `ตารางวันนี้ — ${DOW_TH[todayDow]} ${today.getDate()} ${MONTH_TH[today.getMonth()]}` : view === "week" ? "ตารางสัปดาห์นี้" : `ตารางเดือน ${MONTH_TH[today.getMonth()]} ${today.getFullYear() + 543}`}
          </h2>
          {schedule.length === 0 ? (
            <p className="text-sm text-slate-400">ไม่มีตารางใน{view === "today" ? "วันนี้" : view === "week" ? "สัปดาห์นี้" : "เดือนนี้"}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {schedule.map(({ date, sessions }) => (
                <div key={dateStr(date)} className="rounded-xl border border-slate-200 bg-white p-3">
                  {view !== "today" && (
                    <p className={`mb-1.5 text-xs font-semibold ${dateStr(date) === dateStr(today) ? "text-indigo-600" : "text-slate-500"}`}>
                      {DOW_TH[date.getDay()]} {date.getDate()} {MONTH_TH[date.getMonth()]}
                      {dateStr(date) === dateStr(today) && " (วันนี้)"}
                    </p>
                  )}
                  <div className="flex flex-col gap-1">
                    {sessions.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                        <span className="font-medium">{s.label}</span>
                        {s.time && <span className="text-slate-500">{s.time}</span>}
                        {s.hours && <span className="text-slate-500">{s.hours} ชม.</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Homework section */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            {view === "today" ? "การบ้านวันนี้" : "การบ้านทั้งหมด"}
          </h2>
          {homework.length === 0 ? (
            <p className="text-sm text-slate-400">ไม่มีการบ้าน{view === "today" ? "วันนี้" : ""}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {homework.map((a) => {
                const sub = a.submissions?.[0];
                const submitted = sub?.status === "submitted";
                return (
                  <a
                    key={a.id}
                    href={`/dashboard/homework/${a.id}`}
                    className={`block rounded-xl border p-3 transition-colors hover:border-indigo-200 ${submitted ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${submitted ? "text-slate-400 line-through" : "text-slate-900"}`}>
                          {a.title}
                        </p>
                        <p className="text-xs text-slate-400">{a.subjectName}</p>
                      </div>
                      {submitted ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">ส่งแล้ว ✓</span>
                      ) : (
                        <span className="mt-1 shrink-0 h-2 w-2 rounded-full bg-amber-400" />
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
          )}
        </section>

      </main>
    </div>
  );
}
