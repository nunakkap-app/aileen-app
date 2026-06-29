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

function formatHours(totalSeconds: number) {
  return (totalSeconds / 3600).toFixed(1);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range: "week" | "month" = rangeParam === "month" ? "month" : "week";
  const { start, end } = getRange(range);
  const startStr = toDateStr(start);
  const endStr = toDateStr(end);

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

  const { data: coachSubjectIds } = isCoach
    ? await supabase.from("subjects").select("id").eq("coach_id", auth.user.id)
    : { data: null };

  const { data: parentEnrollments } = childIds.length
    ? await supabase
        .from("enrollments")
        .select("id, mode, child_id, subjects(name, category), children(full_name)")
        .in("child_id", childIds)
    : { data: null };

  const { data: coachEnrollments } = coachSubjectIds?.length
    ? await supabase
        .from("enrollments")
        .select("id, mode, child_id, subjects(name, category), children(full_name)")
        .in("subject_id", coachSubjectIds.map((s) => s.id))
    : { data: null };

  async function summarize(enrollments: typeof parentEnrollments) {
    const ids = enrollments?.map((e) => e.id) ?? [];
    if (!ids.length) return { byCategory: new Map(), byChild: new Map() };

    const { data: logs } = await supabase
      .from("practice_logs")
      .select("elapsed_seconds, enrollment_id")
      .in("enrollment_id", ids)
      .gte("log_date", startStr)
      .lte("log_date", endStr);

    const enrollmentById = new Map(enrollments!.map((e) => [e.id, e]));
    const byCategory = new Map<string, { lesson: number; practice: number }>();
    const byChild = new Map<string, { name: string; seconds: number }>();

    logs?.forEach((log) => {
      const e = enrollmentById.get(log.enrollment_id);
      if (!e) return;
      const cat = Array.isArray(e.subjects) ? e.subjects[0]?.category : (e.subjects as { category: string } | null)?.category ?? "academic";
      const entry = byCategory.get(cat) ?? { lesson: 0, practice: 0 };
      entry[e.mode as "lesson" | "practice"] += log.elapsed_seconds;
      byCategory.set(cat, entry);

      const childName = Array.isArray(e.children) ? e.children[0]?.full_name : (e.children as { full_name: string } | null)?.full_name;
      const childEntry = byChild.get(e.child_id) ?? { name: childName ?? "", seconds: 0 };
      childEntry.seconds += log.elapsed_seconds;
      byChild.set(e.child_id, childEntry);
    });

    return { byCategory, byChild };
  }

  const parentSummary = isParent ? await summarize(parentEnrollments) : null;
  const coachSummary = isCoach ? await summarize(coachEnrollments) : null;

  const rangeLabel =
    range === "week"
      ? `สัปดาห์นี้ (${start.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("th-TH", { day: "numeric", month: "short" })})`
      : `เดือน${start.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}`;

  function CategorySummary({ byCategory }: { byCategory: Map<string, { lesson: number; practice: number }> }) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Object.keys(categoryLabel).map((cat) => {
          const colors = categoryColor[cat];
          const entry = byCategory.get(cat) ?? { lesson: 0, practice: 0 };
          const total = entry.lesson + entry.practice;
          return (
            <div key={cat} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className={`mb-1 inline-flex items-center gap-1.5 text-sm font-medium ${colors.text}`}>
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} /> {categoryLabel[cat]}
              </p>
              <p className="text-3xl font-semibold text-slate-900">{formatHours(total)} <span className="text-base font-normal text-slate-400">ชม.</span></p>
              <p className="mt-1 text-xs text-slate-500">
                {modeLabel.lesson} {formatHours(entry.lesson)} ชม. · {modeLabel.practice} {formatHours(entry.practice)} ชม.
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

        {isParent && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">ชั่วโมงเรียน/ซ้อมของลูก แยกตามหมวด</h2>
            <CategorySummary byCategory={parentSummary!.byCategory} />
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
            <CategorySummary byCategory={coachSummary!.byCategory} />
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
