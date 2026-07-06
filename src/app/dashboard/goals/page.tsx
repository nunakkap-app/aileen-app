import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { GoalBoard, type SubjectGroup, type Goal } from "@/components/GoalBoard";
import { getLocale, getDictionary } from "@/lib/locale";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child: childParam } = await searchParams;
  const locale = await getLocale();
  const d = await getDictionary(locale);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id);
  const isParent = roles?.some((r) => r.role === "parent") ?? false;
  const isCoach = roles?.some((r) => r.role === "coach") ?? false;

  const { data: children } = isParent
    ? await supabase.from("children").select("id, full_name").eq("parent_id", auth.user.id).order("created_at")
    : { data: null };

  const childIds = children?.map((c) => c.id) ?? [];
  const selectedChildId = childParam && childIds.includes(childParam) ? childParam : childIds[0] ?? null;

  // NavBar coach check
  const { data: coachSubjectIds } = isCoach
    ? await supabase.from("subjects").select("id").eq("coach_id", auth.user.id)
    : { data: null };
  const { data: coachEnrollments } = coachSubjectIds?.length
    ? await supabase.from("enrollments").select("child_id").in("subject_id", coachSubjectIds.map((s) => s.id))
    : { data: null };
  const hasExternalStudents = coachEnrollments?.some((e) => !childIds.includes(e.child_id)) ?? false;

  // Enrollments for selected child with subject + coach info
  const { data: enrollments } = selectedChildId
    ? await supabase
        .from("enrollments")
        .select("id, subjects(name, category, placeholder_coach_name, profiles!subjects_coach_id_fkey(full_name))")
        .eq("child_id", selectedChildId)
    : { data: null };

  const enrollmentIds = enrollments?.map((e) => e.id) ?? [];

  // Goals — fetched separately
  const { data: goals } = enrollmentIds.length
    ? await supabase
        .from("goals")
        .select("id, enrollment_id, responsible_enrollment_id, title, goal_type, expectation, target_date, status")
        .in("enrollment_id", enrollmentIds)
        .order("target_date", { ascending: true, nullsFirst: false })
    : { data: null };

  const goalIds = goals?.map((g) => g.id) ?? [];

  // Milestones — fetched separately
  const { data: milestones } = goalIds.length
    ? await supabase
        .from("goal_milestones")
        .select("id, goal_id, title, target_date, achieved_at, sort_order")
        .in("goal_id", goalIds)
        .order("sort_order", { ascending: true })
    : { data: null };

  // Build milestones lookup
  const milestonesByGoal = new Map<string, NonNullable<typeof milestones>>();
  milestones?.forEach((m) => {
    const list = milestonesByGoal.get(m.goal_id) ?? [];
    list.push(m);
    milestonesByGoal.set(m.goal_id, list);
  });

  // Build goals with milestones
  const goalsWithMilestones: Goal[] = (goals ?? []).map((g) => ({
    id: g.id,
    enrollment_id: g.enrollment_id,
    responsible_enrollment_id: g.responsible_enrollment_id ?? null,
    title: g.title,
    goal_type: g.goal_type ?? "อื่นๆ",
    expectation: g.expectation ?? null,
    target_date: g.target_date ?? null,
    status: g.status ?? "active",
    milestones: (milestonesByGoal.get(g.id) ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      target_date: m.target_date ?? null,
      achieved_at: m.achieved_at ?? null,
      sort_order: m.sort_order,
    })),
  }));

  // Group enrollments by subject name
  const subjectGroupMap = new Map<string, SubjectGroup>();
  (enrollments ?? []).forEach((e) => {
    const subj = Array.isArray(e.subjects) ? e.subjects[0] : e.subjects;
    if (!subj) return;

    const profile = Array.isArray((subj as { profiles?: unknown }).profiles)
      ? ((subj as { profiles?: { full_name?: string }[] }).profiles)?.[0]
      : (subj as { profiles?: { full_name?: string } }).profiles;
    const coachName =
      profile?.full_name ??
      (subj as { placeholder_coach_name?: string }).placeholder_coach_name ??
      "ครู";

    const existing: SubjectGroup = subjectGroupMap.get(subj.name) ?? {
      subjectName: subj.name,
      category: (subj as { category?: string }).category ?? "academic",
      enrollments: [],
      goals: [],
    };
    existing.enrollments.push({ id: e.id, coachName });
    subjectGroupMap.set(subj.name, existing);
  });

  // Assign goals to subject groups
  goalsWithMilestones.forEach((g) => {
    for (const group of subjectGroupMap.values()) {
      if (group.enrollments.some((e) => e.id === g.enrollment_id)) {
        group.goals.push(g);
        break;
      }
    }
  });

  const subjectGroups = [...subjectGroupMap.values()];
  const selectedChild = children?.find((c) => c.id === selectedChildId);

  const totalGoals = (goals ?? []).length;
  const achievedGoals = (goals ?? []).filter((g) => g.status === "achieved").length;
  const totalMilestones = (milestones ?? []).length;
  const doneMilestones = (milestones ?? []).filter((m) => m.achieved_at).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} isCoach={hasExternalStudents} isParent={isParent} locale={locale} d={d} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">{d.goals.title}</h1>
          {selectedChild && (
            <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white">
              {selectedChild.full_name}
            </span>
          )}
        </div>

        {/* Child tabs */}
        {children && children.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2 text-sm">
            {children.map((c) => (
              <a
                key={c.id}
                href={`/dashboard/goals?child=${c.id}`}
                className={`rounded-full px-3 py-1.5 ${
                  selectedChildId === c.id
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {c.full_name}
              </a>
            ))}
          </div>
        )}

        {/* Summary stats */}
        {totalGoals > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-2xl font-semibold text-slate-900">{totalGoals - achievedGoals}</p>
              <p className="text-xs text-slate-500">{locale === "th" ? "กำลังดำเนินการ" : "In progress"}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
              <p className="text-2xl font-semibold text-emerald-700">{achievedGoals}</p>
              <p className="text-xs text-emerald-500">{locale === "th" ? "บรรลุแล้ว" : "Achieved"}</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 shadow-sm">
              <p className="text-2xl font-semibold text-indigo-700">{doneMilestones}/{totalMilestones}</p>
              <p className="text-xs text-indigo-500">steps สำเร็จ</p>
            </div>
          </div>
        )}

        {selectedChildId ? (
          <GoalBoard subjectGroups={subjectGroups} />
        ) : (
          <p className="text-sm text-slate-400">{d.common.noData}</p>
        )}
      </main>
    </div>
  );
}
