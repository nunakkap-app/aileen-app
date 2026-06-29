import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { categoryColor, categoryLabel, modeLabel } from "@/lib/subjects";

function getRange(range: "week" | "month") {
  const today = new Date();
  if (range === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start, end };
  }
  const dayOfWeek = today.getDay(); // 0 = Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function eachDateStr(start: Date, end: Date) {
  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function timeToSeconds(t: string) {
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

function formatHours(totalSeconds: number) {
  return (totalSeconds / 3600).toFixed(1);
}

type PracticeException = { exception_date: string };
type PracticeSchedule = {
  weekdays: number[];
  hours_per_session: number;
  start_date: string;
  end_date: string | null;
  practice_exceptions?: PracticeException[] | null;
};
type LessonSchedule = {
  weekday: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string | null;
};
type EnrollmentRow = {
  id: string;
  mode: "lesson" | "practice";
  child_id: string;
  subjects: { category: string } | { category: string }[] | null;
  children: { full_name: string } | { full_name: string }[] | null;
  practice_schedules: PracticeSchedule[] | null;
  lesson_schedules: LessonSchedule[] | null;
};

function getCategory(e: EnrollmentRow) {
  return Array.isArray(e.subjects) ? e.subjects[0]?.category : e.subjects?.category ?? "academic";
}
function getChildName(e: EnrollmentRow) {
  return Array.isArray(e.children) ? e.children[0]?.full_name : e.children?.full_name ?? "";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; child?: string }>;
}) {
  const { range: rangeParam, child: childParam } = await searchParams;
  const range: "week" | "month" = rangeParam === "month" ? "month" : "week";
  const { start, end } = getRange(range);
  const startStr = toDateStr(start);
  const endStr = toDateStr(end);
  const dateStrsInRange = eachDateStr(start, end);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id);

  const isParent = roles?.some((r) => r.role === "parent");
  const isCoach = roles?.some((r) => r.role === "coach");

  const { data: children } = isParent
    ? await supabase.from("children").select("id, full_name").order("created_at")
    : { data: null };
  const childIds = children?.map((c) => c.id) ?? [];
  const selectedChildId = childParam && childIds.includes(childParam) ? childParam : null;

  const { data: coachSubjectIds } = isCoach
    ? await supabase.from("subjects").select("id").eq("coach_id", auth.user.id)
    : { data: null };

  const enrollmentSelect =
    "id, mode, child_id, subjects(category), children(full_name), practice_schedules(weekdays, hours_per_session, start_date, end_date, practice_exceptions(exception_date)), lesson_schedules(weekday, start_time, end_time, start_date, end_date)";

  const { data: parentEnrollments } = childIds.length
    ? await supabase.from("enrollments").select(enrollmentSelect).in("child_id", childIds)
    : { data: null };

  const { data: coachEnrollments } = coachSubjectIds?.length
    ? await supabase
        .from("enrollments")
        .select(enrollmentSelect)
        .in("subject_id", coachSubjectIds.map((s) => s.id))
    : { data: null };

  function plannedSecondsFor(e: EnrollmentRow) {
    let seconds = 0;
    e.practice_schedules?.forEach((s) => {
      const excluded = new Set((s.practice_exceptions ?? []).map((x) => x.exception_date));
      dateStrsInRange.forEach((dateStr) => {
        const weekday = new Date(dateStr).getDay();
        if (!s.weekdays.includes(weekday)) return;
        if (dateStr < s.start_date || (s.end_date && dateStr > s.end_date)) return;
        if (excluded.has(dateStr)) return;
        seconds += s.hours_per_session * 3600;
      });
    });
    e.lesson_schedules?.forEach((s) => {
      dateStrsInRange.forEach((dateStr) => {
        const weekday = new Date(dateStr).getDay();
        if (s.weekday !== weekday) return;
        if (dateStr < s.start_date || (s.end_date && dateStr > s.end_date)) return;
        seconds += timeToSeconds(s.end_time) - timeToSeconds(s.start_time);
      });
    });
    return seconds;
  }

  async function summarize(enrollments: EnrollmentRow[] | null) {
    const ids = enrollments?.map((e) => e.id) ?? [];
    const byCategoryActual = new Map<string, { lesson: number; practice: number }>();
    const byCategoryPlanned = new Map<string, { lesson: number; practice: number }>();
    const byChild = new Map<string, { name: string; seconds: number }>();

    enrollments?.forEach((e) => {
      const cat = getCategory(e);
      const planned = byCategoryPlanned.get(cat) ?? { lesson: 0, practice: 0 };
      planned[e.mode] += plannedSecondsFor(e);
      byCategoryPlanned.set(cat, planned);
    });

    if (!ids.length) return { byCategoryActual, byCategoryPlanned, byChild };

    const { data: logs } = await supabase
      .from("practice_logs")
      .select("elapsed_seconds, enrollment_id")
      .in("enrollment_id", ids)
      .gte("log_date", startStr)
      .lte("log_date", endStr);

    const enrollmentById = new Map(enrollments!.map((e) => [e.id, e]));

    logs?.forEach((log) => {
      const e = enrollmentById.get(log.enrollment_id);
      if (!e) return;
      const cat = getCategory(e);
      const entry = byCategoryActual.get(cat) ?? { lesson: 0, practice: 0 };
      entry[e.mode] += log.elapsed_seconds;
      byCategoryActual.set(cat, entry);

      const childEntry = byChild.get(e.child_id) ?? { name: getChildName(e), seconds: 0 };
      childEntry.seconds += log.elapsed_seconds;
      byChild.set(e.child_id, childEntry);
    });

    return { byCategoryActual, byCategoryPlanned, byChild };
  }

  const filteredParentEnrollments = selectedChildId
    ? (parentEnrollments as EnrollmentRow[] | null)?.filter((e) => e.child_id === selectedChildId) ?? null
    : (parentEnrollments as EnrollmentRow[] | null);

  const parentSummary = isParent ? await summarize(filteredParentEnrollments) : null;
  const coachSummary = isCoach ? await summarize(coachEnrollments as EnrollmentRow[] | null) : null;

  const rangeLabel =
    range === "week"
      ? `สัปดาห์นี้ (${start.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("th-TH", { day: "numeric", month: "short" })})`
      : `เดือน${start.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}`;

  function CategorySummary({
    byCategoryActual,
    byCategoryPlanned,
  }: {
    byCategoryActual: Map<string, { lesson: number; practice: number }>;
    byCategoryPlanned: Map<string, { lesson: number; practice: number }>;
  }) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Object.keys(categoryLabel).map((cat) => {
          const colors = categoryColor[cat];
          const actual = byCategoryActual.get(cat) ?? { lesson: 0, practice: 0 };
          const planned = byCategoryPlanned.get(cat) ?? { lesson: 0, practice: 0 };
          const actualTotal = actual.lesson + actual.practice;
          const plannedTotal = planned.lesson + planned.practice;
          return (
            <div key={cat} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className={`mb-1 inline-flex items-center gap-1.5 text-sm font-medium ${colors.text}`}>
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} /> {categoryLabel[cat]}
              </p>
              <p className="text-3xl font-semibold text-slate-900">
                {formatHours(actualTotal)}
                <span className="text-base font-normal text-slate-400"> / {formatHours(plannedTotal)} ชม.</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">ทำไปแล้ว / ตารางที่ตั้งไว้</p>
              <p className="mt-2 text-xs text-slate-500">
                {modeLabel.lesson}: {formatHours(actual.lesson)}/{formatHours(planned.lesson)} ชม. ·{" "}
                {modeLabel.practice}: {formatHours(actual.practice)}/{formatHours(planned.practice)} ชม.
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">แดชบอร์ด</h1>
          <div className="flex gap-2 text-sm">
            <a
              href="/dashboard?range=week"
              className={`rounded-full px-3 py-1.5 ${range === "week" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
            >
              สัปดาห์นี้
            </a>
            <a
              href="/dashboard?range=month"
              className={`rounded-full px-3 py-1.5 ${range === "month" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
            >
              เดือนนี้
            </a>
          </div>
        </div>
        <p className="mb-6 text-sm text-slate-500">{rangeLabel}</p>

        {isParent && children && children.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <a
              href={`/dashboard?range=${range}`}
              className={`rounded-full px-3 py-1.5 ${!selectedChildId ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
            >
              ทั้งหมด
            </a>
            {children.map((c) => (
              <a
                key={c.id}
                href={`/dashboard?range=${range}&child=${c.id}`}
                className={`rounded-full px-3 py-1.5 ${selectedChildId === c.id ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
              >
                {c.full_name}
              </a>
            ))}
          </div>
        )}

        {isParent && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">
              ชั่วโมงเรียน/ซ้อม{selectedChildId ? `ของ${children?.find((c) => c.id === selectedChildId)?.full_name}` : "ของลูก"} แยกตามหมวด
            </h2>
            <CategorySummary byCategoryActual={parentSummary!.byCategoryActual} byCategoryPlanned={parentSummary!.byCategoryPlanned} />
            {!!parentSummary!.byChild.size && (
              <div className="mt-4 flex flex-col gap-1 text-sm text-slate-600">
                {[...parentSummary!.byChild.entries()].map(([childId, c]) => (
                  <p key={childId}>{c.name}: {formatHours(c.seconds)} ชม.</p>
                ))}
              </div>
            )}
            {!parentSummary!.byChild.size && (
              <p className="mt-4 text-sm text-slate-400">ยังไม่มีการบันทึกเวลาในช่วงนี้</p>
            )}
          </section>
        )}

        {isCoach && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">ชั่วโมงที่สอน แยกตามหมวด</h2>
            <CategorySummary byCategoryActual={coachSummary!.byCategoryActual} byCategoryPlanned={coachSummary!.byCategoryPlanned} />
            {!!coachSummary!.byChild.size && (
              <div className="mt-4 flex flex-col gap-1 text-sm text-slate-600">
                {[...coachSummary!.byChild.entries()].map(([childId, c]) => (
                  <p key={childId}>{c.name}: {formatHours(c.seconds)} ชม.</p>
                ))}
              </div>
            )}
            {!coachSummary!.byChild.size && (
              <p className="mt-4 text-sm text-slate-400">ยังไม่มีการบันทึกเวลาในช่วงนี้</p>
            )}
          </section>
        )}

        <a href="/dashboard/manage" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
          ไปจัดการตาราง/ลูก/การบ้าน ›
        </a>
      </main>
    </div>
  );
}
