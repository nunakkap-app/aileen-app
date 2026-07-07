import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChildPresenceBroadcaster } from "@/components/ChildPresence";
import { logout } from "@/app/login/actions";
import { getLocale, getDictionary } from "@/lib/locale";
import { LanguageToggle } from "@/components/LanguageToggle";

function getBangkokDate() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}
function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function getDatesInPeriod(today: Date, view: string): Date[] {
  if (view === "today") return [today];
  if (view === "week") {
    const dow = today.getDay();
    const mon = addDays(today, 1 - (dow === 0 ? 7 : dow));
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }
  const year = today.getFullYear(), month = today.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
}

type Session = { label: string; time?: string; hours?: number; enrollmentId: string; scheduleId: string; kind: "lesson" | "practice" };
type Override = { enrollment_id: string; original_date: string | null; new_date: string | null; override_start_time: string | null; override_end_time: string | null; override_hours: number | null };
type LessonException = { lesson_schedule_id: string; exception_date: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeEffectiveSchedule(enrollments: any[], overrides: Override[], lessonExceptions: LessonException[], dates: Date[]): { date: Date; sessions: Session[] }[] {
  const exceptSet = new Set(lessonExceptions.map((x) => `${x.lesson_schedule_id}|${x.exception_date}`));
  // original_date sessions that are moved away
  const movedAway = new Set(overrides.filter((o) => o.original_date && o.new_date).map((o) => `${o.enrollment_id}|${o.original_date}`));
  // overrides that ADD a session on new_date
  const addedByOverride = new Map<string, Override[]>();
  for (const o of overrides) {
    if (o.new_date) {
      const list = addedByOverride.get(o.new_date) ?? [];
      list.push(o);
      addedByOverride.set(o.new_date, list);
    }
  }

  return dates.map((date) => {
    const ds = dateStr(date);
    const dow = date.getDay();
    const sessions: Session[] = [];

    for (const e of enrollments) {
      const name = Array.isArray(e.subjects) ? e.subjects[0]?.name : e.subjects?.name ?? "";

      // Recurring practice sessions
      for (const s of e.practice_schedules ?? []) {
        if (!(s.weekdays as number[]).includes(dow)) continue;
        if (ds < s.start_date || (s.end_date && ds > s.end_date)) continue;
        if (movedAway.has(`${e.id}|${ds}`)) continue;
        sessions.push({ label: name, hours: s.hours_per_session, enrollmentId: e.id, scheduleId: s.id, kind: "practice" });
      }

      // Recurring lesson sessions
      for (const s of e.lesson_schedules ?? []) {
        if (s.weekday !== dow) continue;
        if (ds < s.start_date || (s.end_date && ds > s.end_date)) continue;
        if (exceptSet.has(`${s.id}|${ds}`)) continue;
        if (movedAway.has(`${e.id}|${ds}`)) continue;
        sessions.push({ label: name, time: `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`, enrollmentId: e.id, scheduleId: s.id, kind: "lesson" });
      }
    }

    // Sessions added by overrides on this date
    for (const o of addedByOverride.get(ds) ?? []) {
      const e = enrollments.find((en) => en.id === o.enrollment_id);
      if (!e) continue;
      const name = Array.isArray(e.subjects) ? e.subjects[0]?.name : e.subjects?.name ?? "";
      const time = o.override_start_time && o.override_end_time
        ? `${o.override_start_time.slice(0, 5)}–${o.override_end_time.slice(0, 5)}`
        : undefined;
      sessions.push({ label: name, time, hours: o.override_hours ?? undefined, enrollmentId: e.id, scheduleId: `override-${ds}`, kind: "lesson" });
    }

    return { date, sessions };
  }).filter((d) => d.sessions.length > 0);
}

export default async function ChildHomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const locale = await getLocale();
  const d = await getDictionary(locale);

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
      assignments(id, title, description, suggested_minutes, suggested_weekdays, status, submissions(status, last_practiced_date, submitted_at))
    `)
    .eq("child_id", childId);

  const enrollmentIds = (enrollments ?? []).map((e) => e.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lessonScheduleIds = (enrollments ?? []).flatMap((e) => (e.lesson_schedules ?? []).map((s: any) => s.id));

  const [{ data: overrides }, { data: lessonExceptions }] = await Promise.all([
    enrollmentIds.length
      ? supabase.from("session_overrides").select("enrollment_id, original_date, new_date, override_start_time, override_end_time, override_hours").in("enrollment_id", enrollmentIds)
      : Promise.resolve({ data: [] }),
    lessonScheduleIds.length
      ? supabase.from("lesson_exceptions").select("lesson_schedule_id, exception_date").in("lesson_schedule_id", lessonScheduleIds)
      : Promise.resolve({ data: [] }),
  ]);

  const today = getBangkokDate();
  const todayDow = today.getDay();
  const dates = getDatesInPeriod(today, view);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schedule = computeEffectiveSchedule(enrollments as any[] ?? [], overrides ?? [], lessonExceptions ?? [], dates);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allAssignments = (enrollments ?? []).flatMap((e: any) => {
    const name = Array.isArray(e.subjects) ? e.subjects[0]?.name : e.subjects?.name ?? "";
    return (e.assignments ?? []).filter((a: any) => a.status === "active").map((a: any) => ({ ...a, subjectName: name }));
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const homework = view === "today"
    ? allAssignments.filter((a: any) => !a.suggested_weekdays?.length || (a.suggested_weekdays as number[]).includes(todayDow))
    : allAssignments;

  const tabs = [
    { key: "today", label: d.common.today },
    { key: "week", label: d.common.week },
    { key: "month", label: d.common.month },
  ];

  const DOW = (d.weekdays?.short as string[]) ?? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const MONTHS = (d.months as string[]) ?? ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <ChildPresenceBroadcaster childId={childId} />

      <header className="flex items-center justify-between px-5 py-4">
        <div>
          <h1 className="text-base font-bold text-slate-900">{d.child.hello} 👋</h1>
          <p className="text-xs text-slate-500">@{username}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} />
          <form action={logout}>
            <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
              {d.nav.signout}
            </button>
          </form>
        </div>
      </header>

      <div className="flex gap-1 px-5 pb-4">
        {tabs.map((t) => (
          <a key={t.key} href={`/child?view=${t.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${view === t.key ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            {t.label}
          </a>
        ))}
      </div>

      <main className="flex flex-col gap-5 px-5 pb-10">
        {/* Schedule */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            {view === "today"
              ? `${d.child.todaySchedule} — ${DOW[todayDow]} ${today.getDate()} ${MONTHS[today.getMonth()]}`
              : view === "week"
                ? d.child.weekSchedule
                : `${d.child.monthSchedule} ${MONTHS[today.getMonth()]}${locale === "th" ? ` ${today.getFullYear() + 543}` : ` ${today.getFullYear()}`}`}
          </h2>
          {schedule.length === 0 ? (
            <p className="text-sm text-slate-400">
              {view === "today" ? d.child.noScheduleToday : view === "week" ? d.child.noScheduleWeek : d.child.noScheduleMonth}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {schedule.map(({ date, sessions }) => (
                <div key={dateStr(date)} className="rounded-xl border border-slate-200 bg-white p-3">
                  {view !== "today" && (
                    <p className={`mb-1.5 text-xs font-semibold ${dateStr(date) === dateStr(today) ? "text-indigo-600" : "text-slate-500"}`}>
                      {DOW[date.getDay()]} {date.getDate()} {MONTHS[date.getMonth()]}{dateStr(date) === dateStr(today) ? ` (${d.common.today})` : ""}
                    </p>
                  )}
                  <div className="flex flex-col gap-1">
                    {sessions.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        <span className="font-medium">{s.label}</span>
                        {s.time && <span className="text-slate-500">{s.time}</span>}
                        {s.hours && !s.time && <span className="text-slate-500">{s.hours} {d.manage?.hoursUnit ?? "ชม."}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Homework */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            {view === "today" ? d.child.homeworkToday : d.child.homeworkAll}
          </h2>
          {homework.length === 0 ? (
            <p className="text-sm text-slate-400">{view === "today" ? d.child.noHomeworkToday : d.child.noHomework}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {homework.map((a) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sub = (a.submissions as any[])?.[0];
                const todayDateStr = dateStr(today);
                const isRecurring = (a.suggested_weekdays as number[])?.length > 0;
                const practicedToday = sub?.last_practiced_date === todayDateStr;
                const submittedToday = sub?.submitted_at?.slice(0, 10) === todayDateStr;
                // recurring: done only counts today; one-time: done permanently
                const showAsDone = isRecurring ? (practicedToday || submittedToday) : sub?.status === "submitted";
                return (
                  <a key={a.id} href={`/dashboard/homework/${a.id}`}
                    className={`block rounded-xl border p-3 transition-colors hover:border-indigo-200 ${showAsDone ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${showAsDone ? "text-slate-400 line-through" : "text-slate-900"}`}>{a.title}</p>
                        <p className="text-xs text-slate-400">{a.subjectName}</p>
                      </div>
                      {showAsDone
                        ? <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{d.child.submitted}</span>
                        : <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
                    </div>
                    {a.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{a.description}</p>}
                    {a.suggested_minutes && <p className="mt-1 text-xs text-slate-400">⏱ {a.suggested_minutes} {d.timer?.minutes ?? "นาที"}</p>}
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
