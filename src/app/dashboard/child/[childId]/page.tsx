import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { categoryColor, categoryLabel } from "@/lib/subjects";

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function formatHours(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (!s) return "0น.";
  return h ? `${h}ชม.${m ? ` ${m}น.` : ""}` : `${m}น.`;
}

export default async function ChildPortfolioPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // Verify access: must be parent of this child
  const { data: child } = await supabase
    .from("children")
    .select("id, full_name, birthdate, parent_id")
    .eq("id", childId)
    .single();

  if (!child || child.parent_id !== auth.user.id) redirect("/dashboard");

  // All enrollments for this child
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      `id, mode,
       subjects(id, name, category, coach_id, profiles!subjects_coach_id_fkey(full_name, placeholder_coach_name)),
       assignments(id, title, due_date,
         submissions(id, status, elapsed_seconds, submitted_by, submitted_at)
       ),
       coaching_session_logs(id, session_date, summary, development_note),
       goals(id, title, target_date, status,
         goal_milestones(id, title, target_date, achieved_at, sort_order)
       )`
    )
    .eq("child_id", childId)
    .order("session_date", { referencedTable: "coaching_session_logs", ascending: false });

  // All-time practice hours per enrollment
  const enrollmentIds = enrollments?.map((e) => e.id) ?? [];
  const { data: allLogs } = enrollmentIds.length
    ? await supabase
        .from("practice_logs")
        .select("enrollment_id, elapsed_seconds, log_date")
        .in("enrollment_id", enrollmentIds)
        .order("log_date", { ascending: false })
    : { data: null };

  const totalHoursMap = new Map<string, number>();
  allLogs?.forEach((l) => {
    totalHoursMap.set(l.enrollment_id, (totalHoursMap.get(l.enrollment_id) ?? 0) + l.elapsed_seconds);
  });

  const grandTotalSeconds = [...totalHoursMap.values()].reduce((a, b) => a + b, 0);

  const today = new Date().toISOString().slice(0, 10);

  // Age
  let ageLabel = "";
  if (child.birthdate) {
    const birth = new Date(child.birthdate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    ageLabel = `${years} ปี`;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* Back */}
        <a href="/dashboard/manage" className="mb-6 inline-block text-sm text-indigo-600 hover:underline">
          ‹ กลับ
        </a>

        {/* Child header */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
              👧
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{child.full_name}</h1>
              {ageLabel && <p className="text-sm text-slate-500">{ageLabel}</p>}
            </div>
          </div>

          {/* Summary stats */}
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-2xl font-semibold text-slate-900">{formatHours(grandTotalSeconds)}</p>
              <p className="text-xs text-slate-500">ชั่วโมงสะสมรวม</p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3">
              <p className="text-2xl font-semibold text-indigo-700">{enrollments?.length ?? 0}</p>
              <p className="text-xs text-indigo-500">วิชาที่เรียน</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-2xl font-semibold text-emerald-700">
                {enrollments?.reduce((n, e) => {
                  const a = (e.assignments ?? []) as { submissions: { status: string }[] }[];
                  return n + a.filter((x) => x.submissions?.[0]?.status === "submitted").length;
                }, 0)}
              </p>
              <p className="text-xs text-emerald-500">การบ้านส่งแล้ว</p>
            </div>
          </div>
        </div>

        {/* Per-subject sections */}
        <div className="flex flex-col gap-6">
          {enrollments?.map((e) => {
            const subject = one(e.subjects as object | null) as { name: string; category: string } | null;
            const assignments = (e.assignments ?? []) as { id: string; title: string; due_date: string | null; submissions: { status: string; elapsed_seconds: number; submitted_by: string | null; submitted_at: string | null }[] }[];
            const sessionLogs = (e.coaching_session_logs ?? []) as { session_date: string; summary: string | null; development_note: string | null }[];
            const goals = (e.goals ?? []) as { id: string; title: string; target_date: string | null; status: string; goal_milestones: { id: string; title: string; target_date: string | null; achieved_at: string | null; sort_order: number }[] }[];

            const totalSec = totalHoursMap.get(e.id) ?? 0;
            const totalAssign = assignments.length;
            const submitted = assignments.filter((a) => a.submissions?.[0]?.status === "submitted").length;
            const overdue = assignments.filter((a) => a.due_date && a.due_date < today && a.submissions?.[0]?.status !== "submitted").length;
            const colors = categoryColor[subject?.category ?? "academic"] ?? categoryColor.academic;
            const recentLogs = sessionLogs.slice(0, 5);
            const activeGoals = goals.filter((g) => g.status === "active");
            const achievedGoals = goals.filter((g) => g.status === "achieved");

            return (
              <div key={e.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Subject header */}
                <div className={`flex items-center justify-between px-5 py-3 ${colors.bg}`}>
                  <span className={`flex items-center gap-1.5 text-sm font-semibold ${colors.text}`}>
                    <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                    {subject?.name} · {categoryLabel[subject?.category ?? "academic"]}
                  </span>
                  <span className={`text-sm font-semibold ${colors.text}`}>{formatHours(totalSec)}</span>
                </div>

                <div className="p-5 flex flex-col gap-5">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-lg bg-slate-50 py-2">
                      <p className="font-semibold text-slate-900">{formatHours(totalSec)}</p>
                      <p className="text-xs text-slate-400">ชั่วโมงสะสม</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 py-2">
                      <p className="font-semibold text-emerald-700">{totalAssign ? `${submitted}/${totalAssign}` : "—"}</p>
                      <p className="text-xs text-emerald-500">การบ้านส่งแล้ว</p>
                    </div>
                    <div className={`rounded-lg py-2 ${overdue > 0 ? "bg-red-50" : "bg-slate-50"}`}>
                      <p className={`font-semibold ${overdue > 0 ? "text-red-600" : "text-slate-300"}`}>{overdue}</p>
                      <p className={`text-xs ${overdue > 0 ? "text-red-400" : "text-slate-400"}`}>เกินกำหนด</p>
                    </div>
                  </div>

                  {/* Goals */}
                  {(activeGoals.length > 0 || achievedGoals.length > 0) && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">เป้าหมาย</p>
                      <div className="flex flex-col gap-2">
                        {activeGoals.map((goal) => {
                          const milestones = [...(goal.goal_milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order);
                          const done = milestones.filter((m) => m.achieved_at).length;
                          const pct = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
                          return (
                            <div key={goal.id} className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-indigo-900">{goal.title}</p>
                                {goal.target_date && (
                                  <p className="text-xs text-indigo-400">
                                    {new Date(goal.target_date).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                                  </p>
                                )}
                              </div>
                              {milestones.length > 0 && (
                                <div className="mt-2">
                                  <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
                                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    {milestones.map((m) => (
                                      <p key={m.id} className={`text-xs ${m.achieved_at ? "text-indigo-400 line-through" : "text-indigo-700"}`}>
                                        {m.achieved_at ? "✓" : "○"} {m.title}
                                        {m.target_date && !m.achieved_at && (
                                          <span className="ml-1 text-indigo-300">
                                            {new Date(m.target_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                                          </span>
                                        )}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {achievedGoals.map((goal) => (
                          <div key={goal.id} className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                            <p className="text-sm font-medium text-emerald-700">✓ {goal.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coach session logs */}
                  {recentLogs.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">บันทึกจากครู</p>
                      <div className="flex flex-col gap-2">
                        {recentLogs.map((log) => (
                          <div key={log.session_date} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <p className="mb-1 text-xs font-medium text-slate-400">
                              {new Date(log.session_date).toLocaleDateString("th-TH", { dateStyle: "long" })}
                            </p>
                            {log.summary && <p className="text-sm text-slate-700">{log.summary}</p>}
                            {log.development_note && (
                              <p className="mt-1.5 rounded bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700">
                                📈 {log.development_note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Link to homework summary */}
                  <a
                    href={`/dashboard/homework/subject/${e.id}`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    ดูการบ้านทั้งหมดของวิชานี้ →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
