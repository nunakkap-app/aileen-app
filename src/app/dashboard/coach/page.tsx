import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { categoryColor, categoryLabel } from "@/lib/subjects";
import { saveSessionLog, saveGoal } from "./actions";
import { getLocale, getDictionary } from "@/lib/locale";

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function formatHours(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}ชม.${m ? `${m}น.` : ""}` : `${m}น.`;
}

const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 7) + "-01";

export default async function CoachDashboardPage() {
  const locale = await getLocale();
  const d = await getDictionary(locale);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id);

  if (!roles?.some((r) => r.role === "coach")) redirect("/dashboard");

  // All enrollments this coach teaches
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      `id, mode, child_id,
       children(id, full_name),
       subjects(id, name, category),
       assignments(id, title, due_date,
         submissions(id, status, elapsed_seconds, submitted_by)
       ),
       coaching_session_logs(id, session_date, summary, development_note),
       goals(id, title, target_date, status,
         goal_milestones(id, title, target_date, achieved_at, sort_order)
       )`
    )
    .order("created_at", { referencedTable: "coaching_session_logs", ascending: false });

  // Practice hours this month per enrollment
  const enrollmentIds = enrollments?.map((e) => e.id) ?? [];
  const { data: monthLogs } = enrollmentIds.length
    ? await supabase
        .from("practice_logs")
        .select("enrollment_id, elapsed_seconds")
        .in("enrollment_id", enrollmentIds)
        .gte("log_date", monthStart)
    : { data: null };

  const hoursThisMonth = new Map<string, number>();
  monthLogs?.forEach((l) => {
    hoursThisMonth.set(l.enrollment_id, (hoursThisMonth.get(l.enrollment_id) ?? 0) + l.elapsed_seconds);
  });

  const todayLog = enrollments?.map((e) => ({
    enrollmentId: e.id,
    log: (e.coaching_session_logs as { session_date: string; summary: string | null; development_note: string | null }[] | null)
      ?.find((l) => l.session_date === today) ?? null,
  }));
  const todayLogMap = new Map(todayLog?.map((t) => [t.enrollmentId, t.log]));

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} locale={locale} d={d} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">{d.coach.title}</h1>
          <a href="/dashboard" className="text-sm text-slate-500 hover:text-indigo-600 hover:underline">
            {d.common.back}
          </a>
        </div>

        {!enrollments?.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-400">{d.coach.noStudents}</p>
            <p className="mt-1 text-xs text-slate-400">{locale === "th" ? "ผู้ปกครองต้องส่ง invite link มาให้ก่อน" : "A parent needs to send you an invite link first"}</p>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {enrollments?.map((e) => {
            const child = one(e.children as object | null) as { id: string; full_name: string } | null;
            const subject = one(e.subjects as object | null) as { name: string; category: string } | null;
            const assignments = (e.assignments ?? []) as { id: string; title: string; due_date: string | null; submissions: { status: string; elapsed_seconds: number }[] }[];
            const sessionLogs = (e.coaching_session_logs ?? []) as { session_date: string; summary: string | null; development_note: string | null }[];
            const goals = (e.goals ?? []) as { id: string; title: string; target_date: string | null; status: string; goal_milestones: { id: string; title: string; target_date: string | null; achieved_at: string | null; sort_order: number }[] }[];

            const totalAssignments = assignments.length;
            const submitted = assignments.filter((a) => a.submissions?.[0]?.status === "submitted").length;
            const pending = totalAssignments - submitted;
            const hoursSeconds = hoursThisMonth.get(e.id) ?? 0;
            const colors = categoryColor[subject?.category ?? "academic"] ?? categoryColor.academic;
            const existingLog = todayLogMap.get(e.id);
            const recentLogs = sessionLogs.slice(0, 3);
            const activeGoals = goals.filter((g) => g.status === "active");

            return (
              <div key={e.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{child?.full_name}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                      {subject?.name} · {categoryLabel[subject?.category ?? "academic"]}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-slate-900">{formatHours(hoursSeconds)}</p>
                    <p className="text-xs text-slate-400">{d.dashboard.thisMonth}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                  <div className="px-4 py-3 text-center">
                    <p className="text-xl font-semibold text-slate-900">{totalAssignments}</p>
                    <p className="text-xs text-slate-400">{locale === "th" ? "การบ้านทั้งหมด" : "Total homework"}</p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="text-xl font-semibold text-emerald-600">{submitted}</p>
                    <p className="text-xs text-slate-400">{locale === "th" ? "ส่งแล้ว" : "Submitted"}</p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className={`text-xl font-semibold ${pending > 0 ? "text-amber-500" : "text-slate-300"}`}>{pending}</p>
                    <p className="text-xs text-slate-400">{locale === "th" ? "ค้างอยู่" : "Pending"}</p>
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-5">
                  {/* Session log today */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {locale === "th" ? "บันทึกการสอนวันนี้" : "Today's Session Log"} {existingLog ? "✓" : ""}
                    </p>
                    <form action={saveSessionLog} className="flex flex-col gap-2">
                      <input type="hidden" name="enrollment_id" value={e.id} />
                      <input type="hidden" name="session_date" value={today} />
                      <textarea
                        name="summary"
                        rows={2}
                        placeholder={locale === "th" ? "สรุปสิ่งที่สอนวันนี้" : "Summarize what was taught today"}
                        defaultValue={existingLog?.summary ?? ""}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                      />
                      <textarea
                        name="development_note"
                        rows={2}
                        placeholder={locale === "th" ? "พัฒนาการ — ดีขึ้นด้านไหน ยังต้องฝึกอะไร" : "Progress — what improved, what still needs work"}
                        defaultValue={existingLog?.development_note ?? ""}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="self-start rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                      >
                        {existingLog ? (locale === "th" ? "อัปเดต" : "Update") : d.common.save}
                      </button>
                    </form>
                  </div>

                  {/* Recent logs */}
                  {recentLogs.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{locale === "th" ? "บันทึกย้อนหลัง" : "Recent logs"}</p>
                      <div className="flex flex-col gap-2">
                        {recentLogs.map((log) => (
                          <div key={log.session_date} className="rounded-lg bg-slate-50 p-3">
                            <p className="mb-1 text-xs text-slate-400">
                              {new Date(log.session_date).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                            </p>
                            {log.summary && <p className="text-sm text-slate-700">{log.summary}</p>}
                            {log.development_note && (
                              <p className="mt-1 text-xs text-indigo-600">📈 {log.development_note}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Goals */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{d.goals.title}</p>
                    {activeGoals.map((goal) => {
                      const milestones = [...(goal.goal_milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order);
                      const done = milestones.filter((m) => m.achieved_at).length;
                      return (
                        <div key={goal.id} className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-800">{goal.title}</p>
                            {goal.target_date && (
                              <p className="text-xs text-slate-400">
                                {new Date(goal.target_date).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                              </p>
                            )}
                          </div>
                          {milestones.length > 0 && (
                            <div className="mt-2">
                              <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${milestones.length ? (done / milestones.length) * 100 : 0}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-400">{done}/{milestones.length} milestones</p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-indigo-600 hover:underline">+ {d.goals.add}</summary>
                      <form action={saveGoal} className="mt-2 flex flex-col gap-2">
                        <input type="hidden" name="enrollment_id" value={e.id} />
                        <input
                          name="title"
                          placeholder={locale === "th" ? "เช่น สอบ Grade 3 Ballet" : "e.g. Grade 3 Ballet exam"}
                          required
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                        />
                        <input name="target_date" type="date" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
                        <textarea
                          name="description"
                          rows={2}
                          placeholder={locale === "th" ? "รายละเอียด (ถ้ามี)" : "Details (optional)"}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                        />
                        <button
                          type="submit"
                          className="self-start rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                        >
                          {locale === "th" ? "บันทึกเป้าหมาย" : "Save goal"}
                        </button>
                      </form>
                    </details>
                  </div>

                  {/* Links */}
                  <div className="flex gap-3 border-t border-slate-100 pt-3">
                    <a
                      href={`/dashboard/homework/subject/${e.id}`}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {locale === "th" ? "การบ้านทั้งหมด →" : "All homework →"}
                    </a>
                    {child?.id && (
                      <a
                        href={`/dashboard/child/${child.id}`}
                        className="text-xs text-slate-500 hover:text-indigo-600 hover:underline"
                      >
                        {locale === "th" ? "Portfolio ลูก →" : "Child Portfolio →"}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
