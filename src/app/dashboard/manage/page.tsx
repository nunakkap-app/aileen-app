import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { SubjectPicker } from "@/components/SubjectPicker";
import { ManualCoachToggle } from "@/components/ManualCoachToggle";
import { CalendarMonth } from "@/components/CalendarMonth";
import { CoachInviteButton } from "@/components/CoachInviteButton";
import { ChildAccountButton } from "@/components/ChildAccountButton";
import { LessonScheduleCard } from "@/components/LessonScheduleCard";
import { type SessionOverride } from "@/components/CalendarMonth";
import { categoryColor, categoryLabel, modeDotColor, modeLabel } from "@/lib/subjects";
import { getLocale, getDictionary } from "@/lib/locale";
import {
  addChild,
  addPracticeSchedule,
  createAssignment,
  deleteEnrollment,
  deletePracticeSchedule,
  updatePracticeSchedule,
  inviteCoach,
  inviteParent,
  respondInvitation,
  respondParentInvitation,
  selfCoach,
  submitHomework,
} from "@/app/dashboard/actions";

type PracticeSchedule = {
  id: string;
  weekdays: number[];
  hours_per_session: number;
  start_date: string;
  end_date: string | null;
  note: string | null;
  practice_exceptions?: { exception_date: string }[] | null;
};

type LessonSchedule = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string | null;
  price_per_session: number | null;
  pricing_type: string | null;
  total_sessions: number | null;
  note: string | null;
};

type EnrollmentForCalendar = {
  id: string;
  mode: "lesson" | "practice";
  subjects: { name: string; category: string } | null;
  practice_schedules: PracticeSchedule[] | null;
  lesson_schedules: LessonSchedule[] | null;
};

function buildCalendarItems(enrollmentsForChild: EnrollmentForCalendar[], lessonExcluded: Set<string> = new Set()) {
  const practiceItems = enrollmentsForChild.flatMap((e) =>
    (e.practice_schedules ?? []).map((s) => ({
      id: s.id,
      enrollmentId: e.id,
      label: e.subjects?.name ?? "",
      category: e.subjects?.category ?? "academic",
      kind: "practice" as const,
      weekdays: s.weekdays,
      hoursPerSession: s.hours_per_session,
      startDate: s.start_date,
      endDate: s.end_date,
    })),
  );
  const lessonItems = enrollmentsForChild.flatMap((e) =>
    (e.lesson_schedules ?? []).map((s) => ({
      id: s.id,
      enrollmentId: e.id,
      label: e.subjects?.name ?? "",
      category: e.subjects?.category ?? "academic",
      kind: "lesson" as const,
      weekdays: [s.weekday],
      timeRange: `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`,
      startDate: s.start_date,
      endDate: s.end_date,
      pricingType: s.pricing_type,
      totalSessions: s.total_sessions,
    })),
  );
  const excluded = [
    ...enrollmentsForChild.flatMap((e) =>
      (e.practice_schedules ?? []).flatMap((s) => (s.practice_exceptions ?? []).map((x) => `${s.id}|${x.exception_date}`)),
    ),
    ...[...lessonExcluded],
  ];
  return { items: [...practiceItems, ...lessonItems], excluded };
}

function PracticeScheduleCard({
  enrollmentId,
  practiceSchedules,
  weekdayOptions,
  m,
}: {
  enrollmentId: string;
  practiceSchedules: PracticeSchedule[];
  weekdayOptions: { value: number; label: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  m: Record<string, any>;
}) {
  return (
    <>
      <div className="mb-3 flex flex-col gap-3">
        {practiceSchedules.map((s) => (
          <form key={s.id} action={updatePracticeSchedule} className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={s.id} />
            <fieldset className="flex gap-1.5 text-xs text-slate-600">
              {weekdayOptions.map((w) => (
                <label key={w.value} className="flex items-center gap-0.5 rounded border border-slate-300 bg-white px-1.5 py-1">
                  <input type="checkbox" name="weekdays" value={w.value} defaultChecked={s.weekdays.includes(w.value)} />
                  {w.label}
                </label>
              ))}
            </fieldset>
            <input
              name="hours_per_session"
              type="number"
              step="0.5"
              min="0.5"
              defaultValue={s.hours_per_session}
              required
              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
            />
            <span className="text-xs text-slate-500">{m.hoursUnit}</span>
            <input name="start_date" type="date" defaultValue={s.start_date} required className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm" />
            <input name="end_date" type="date" defaultValue={s.end_date ?? ""} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm" />
            <input name="note" defaultValue={s.note ?? ""} placeholder={m.note} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm" />
            <button className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700" type="submit">{m.save}</button>
            <form action={deletePracticeSchedule}>
              <input type="hidden" name="id" value={s.id} />
              <button className="text-xs text-red-500 hover:underline" type="submit">{m.delete}</button>
            </form>
          </form>
        ))}
        {!practiceSchedules.length && <p className="text-sm text-slate-400">{m.noSchedule}</p>}
      </div>
      <form action={addPracticeSchedule} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="enrollment_id" value={enrollmentId} />
        <fieldset className="flex gap-1.5 text-xs text-slate-600">
          {weekdayOptions.map((w) => (
            <label key={w.value} className="flex items-center gap-0.5 rounded border border-slate-300 px-1.5 py-1">
              <input type="checkbox" name="weekdays" value={w.value} />
              {w.label}
            </label>
          ))}
        </fieldset>
        <input
          name="hours_per_session"
          type="number"
          step="0.5"
          min="0.5"
          placeholder={`${m.hoursUnit}/ครั้ง`}
          required
          className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <input name="start_date" type="date" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <input name="end_date" type="date" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <input name="note" placeholder={m.note} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
          {m.addSchedule}
        </button>
      </form>
    </>
  );
}

function one<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const locale = await getLocale();
  const d = await getDictionary(locale);
  const m = d.manage as Record<string, string>;
  const hw = d.homework as Record<string, string>;

  const DOW = (d.weekdays?.short as string[]) ?? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const weekdayOptions = [1, 2, 3, 4, 5, 6, 0].map((v) => ({ value: v, label: DOW[v] }));

  const { child: childParam } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const [{ data: roles }, { data: pendingParentInvitations }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
    supabase.from("parent_invitations").select("*, children(full_name)").eq("status", "pending").eq("invitee_email", auth.user.email ?? "").order("created_at", { ascending: false }),
  ]);

  const isParent = roles?.some((r) => r.role === "parent");
  const isCoach = roles?.some((r) => r.role === "coach");

  const [{ data: guardianRows }, { data: coachSubjectIds }, { data: pendingInvitations }] = await Promise.all([
    isParent
      ? supabase.from("child_guardians").select("is_owner, children(id, full_name, birthdate, username, child_user_id)").eq("user_id", auth.user.id)
      : Promise.resolve({ data: null }),
    isCoach
      ? supabase.from("subjects").select("id").eq("coach_id", auth.user.id)
      : Promise.resolve({ data: null }),
    isCoach
      ? supabase.from("invitations").select("*, children(full_name)").eq("status", "pending").eq("coach_email", auth.user.email ?? "").order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const children =
    guardianRows
      ?.map((g) => {
        const child = one(g.children);
        return child ? { ...child, is_owner: g.is_owner } : null;
      })
      .filter((c): c is { id: string; full_name: string; birthdate: string | null; username: string | null; child_user_id: string | null; is_owner: boolean } => !!c) ?? [];

  const childIds = children.map((c) => c.id);
  const selectedChildId = childParam && childIds.includes(childParam) ? childParam : childIds[0];
  const selectedChild = children.find((c) => c.id === selectedChildId);

  const [
    { data: allGuardians },
    { data: enrollments },
    { data: coachEnrollments },
    { data: sentInvitations },
    { data: sentParentInvitations },
    { data: coachAssignments },
  ] = await Promise.all([
    childIds.length
      ? supabase.from("child_guardians").select("child_id, is_owner, profiles(full_name, email)").in("child_id", childIds)
      : Promise.resolve({ data: null }),
    childIds.length
      ? supabase.from("enrollments").select("*, subjects(name, category, placeholder_coach_name, profiles(full_name)), children(full_name), practice_schedules(*, practice_exceptions(*)), lesson_schedules(*)").in("child_id", childIds)
      : Promise.resolve({ data: null }),
    coachSubjectIds?.length
      ? supabase.from("enrollments").select("*, subjects(name, category), children(full_name), practice_schedules(*, practice_exceptions(*)), lesson_schedules(*)").in("subject_id", coachSubjectIds.map((s) => s.id))
      : Promise.resolve({ data: null }),
    selectedChildId
      ? supabase.from("invitations").select("*, children(full_name)").eq("child_id", selectedChildId).order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    selectedChildId
      ? supabase.from("parent_invitations").select("*").eq("child_id", selectedChildId).order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    isCoach
      ? supabase.from("assignments").select("*, submissions(*), enrollments(children(full_name), subjects(name))").eq("coach_id", auth.user.id).order("due_date", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);

  const enrollmentsByChild = new Map<string, typeof enrollments>();
  enrollments?.forEach((e) => {
    const list = enrollmentsByChild.get(e.child_id) ?? [];
    list.push(e);
    enrollmentsByChild.set(e.child_id, list);
  });

  const externalCoachEnrollments = coachEnrollments?.filter((e) => !childIds.includes(e.child_id)) ?? null;

  const selectedEnrollments = selectedChildId ? enrollmentsByChild.get(selectedChildId) ?? [] : [];
  const selectedEnrollmentIds = selectedEnrollments.map((e) => e.id);

  const allTrackedEnrollmentIds = [
    ...(enrollments?.map((e) => e.id) ?? []),
    ...(externalCoachEnrollments?.map((e) => e.id) ?? []),
  ];

  const allLessonScheduleIds = [
    ...(enrollments ?? []).flatMap((e) => (e.lesson_schedules ?? []).map((s: { id: string }) => s.id)),
    ...(externalCoachEnrollments ?? []).flatMap((e) => (e.lesson_schedules ?? []).map((s: { id: string }) => s.id)),
  ];

  const [{ data: parentAssignments }, { data: rawOverrides }, { data: rawLessonExceptions }] = await Promise.all([
    selectedEnrollmentIds.length
      ? supabase.from("assignments").select("*, submissions(*), enrollments(children(full_name), subjects(name))").in("enrollment_id", selectedEnrollmentIds).order("due_date", { ascending: true })
      : Promise.resolve({ data: null }),
    allTrackedEnrollmentIds.length
      ? supabase.from("session_overrides").select("enrollment_id, original_date, new_date, override_start_time, override_end_time, override_hours").in("enrollment_id", allTrackedEnrollmentIds)
      : Promise.resolve({ data: null }),
    allLessonScheduleIds.length
      ? supabase.from("lesson_exceptions").select("lesson_schedule_id, exception_date").in("lesson_schedule_id", allLessonScheduleIds)
      : Promise.resolve({ data: null }),
  ]);

  const assignmentsByEnrollment = new Map<string, NonNullable<typeof parentAssignments>>();
  parentAssignments?.forEach((a) => {
    const list = assignmentsByEnrollment.get(a.enrollment_id) ?? [];
    list.push(a);
    assignmentsByEnrollment.set(a.enrollment_id, list);
  });

  const coachAssignmentsByEnrollment = new Map<string, NonNullable<typeof coachAssignments>>();
  coachAssignments?.forEach((a) => {
    const list = coachAssignmentsByEnrollment.get(a.enrollment_id) ?? [];
    list.push(a);
    coachAssignmentsByEnrollment.set(a.enrollment_id, list);
  });

  const sessionOverrides: SessionOverride[] =
    rawOverrides?.map((o) => ({
      enrollmentId: o.enrollment_id,
      originalDate: o.original_date,
      newDate: o.new_date,
      overrideStartTime: o.override_start_time,
      overrideEndTime: o.override_end_time,
      overrideHours: o.override_hours,
    })) ?? [];

  const lessonExcludedSet = new Set(
    (rawLessonExceptions ?? []).map((x) => `${x.lesson_schedule_id}|${x.exception_date}`),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coachEnrollmentsByChild = new Map<string, { childName: string; items: any[] }>();
  externalCoachEnrollments?.forEach((e) => {
    const entry = coachEnrollmentsByChild.get(e.child_id) ?? ({ childName: e.children?.full_name ?? "", items: [] } as { childName: string; items: typeof e[] });
    entry.items.push(e);
    coachEnrollmentsByChild.set(e.child_id, entry);
  });

  const selectedGuardians = allGuardians?.filter((g) => g.child_id === selectedChildId) ?? [];

  const statusLabel = (status: string) => {
    if (status === "accepted") return { text: m.accepted, cls: "text-emerald-600" };
    if (status === "declined") return { text: m.declined, cls: "text-red-600" };
    return { text: m.pending, cls: "text-amber-600" };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} isCoach={!!externalCoachEnrollments?.length} isParent={isParent} locale={locale} d={d} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        {!!pendingParentInvitations?.length && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">{m.pendingParentInvite}</h2>
            <div className="flex flex-col gap-3">
              {pendingParentInvitations.map((inv) => (
                <div key={inv.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-sm text-slate-700">{m.pendingParentInviteText} <strong>{inv.children?.full_name}</strong></p>
                  <div className="flex gap-2">
                    <form action={respondParentInvitation}>
                      <input type="hidden" name="invitation_id" value={inv.id} />
                      <input type="hidden" name="decision" value="accepted" />
                      <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700" type="submit">
                        {d.common.accept}
                      </button>
                    </form>
                    <form action={respondParentInvitation}>
                      <input type="hidden" name="invitation_id" value={inv.id} />
                      <input type="hidden" name="decision" value="declined" />
                      <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" type="submit">
                        {d.common.decline}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {isParent && (
          <section className="mb-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-semibold text-slate-900">{m.myChildren}</h1>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {children.map((c) => (
                <div key={c.id} className="flex items-center gap-1">
                  <a
                    href={`/dashboard/manage?child=${c.id}`}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      c.id === selectedChildId ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {c.full_name}
                  </a>
                  <a
                    href={`/dashboard/child/${c.id}`}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-400 hover:text-indigo-600"
                    title="Portfolio"
                  >
                    📁
                  </a>
                  <ChildAccountButton
                    childId={c.id}
                    childName={c.full_name}
                    username={c.username}
                  />
                </div>
              ))}
              <details className="inline-block">
                <summary className="cursor-pointer rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500">
                  {m.addChildBtn}
                </summary>
                <form action={addChild} className="mt-2 flex gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <input
                    name="full_name"
                    placeholder={m.childNamePlaceholder}
                    required
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input name="birthdate" type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">
                    {m.addChild}
                  </button>
                </form>
              </details>
            </div>

            {!children.length && (
              <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                {m.noChildData}
              </p>
            )}

            {selectedChild && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-1 font-medium text-slate-900">
                  {selectedChild.full_name}
                  {selectedChild.birthdate && <span className="ml-2 text-sm text-slate-400">{m.birthday} {selectedChild.birthdate}</span>}
                </p>

                {!!selectedGuardians.length && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {selectedGuardians.map((g) => {
                      const profile = one(g.profiles);
                      const name = profile?.full_name ?? profile?.email ?? "";
                      return (
                        <span key={g.child_id + name} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${g.is_owner ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
                          {g.is_owner ? "👑 " : ""}{name}
                        </span>
                      );
                    })}
                    {selectedChild.is_owner && (
                      <details className="group relative">
                        <summary className="cursor-pointer list-none rounded-full border border-dashed border-indigo-300 px-2.5 py-0.5 text-xs text-indigo-500 hover:bg-indigo-50">
                          + {m.inviteParent}
                        </summary>
                        <div className="absolute left-0 top-7 z-20 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                          <form action={inviteParent} className="flex flex-col gap-2">
                            <input type="hidden" name="child_id" value={selectedChild.id} />
                            <input
                              name="invitee_email"
                              type="email"
                              placeholder={m.inviteParentEmail}
                              required
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                            />
                            <button className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700" type="submit">
                              {m.sendInvite}
                            </button>
                          </form>
                          {!!sentParentInvitations?.length && (
                            <ul className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
                              {sentParentInvitations.map((inv) => {
                                const s = statusLabel(inv.status);
                                return (
                                  <li key={inv.id} className="flex items-center justify-between">
                                    <span>{inv.invitee_email}</span>
                                    <span className={s.cls}>{s.text}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                <div className="mb-4 mt-2 flex flex-wrap gap-2">
                  {enrollmentsByChild.get(selectedChild.id)?.map((e) => {
                    const colors = categoryColor[e.subjects?.category ?? "academic"] ?? categoryColor.academic;
                    return (
                      <span
                        key={e.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${modeDotColor[e.mode]}`} />
                        {e.subjects?.name} · {categoryLabel[e.subjects?.category]} · {modeLabel[e.mode]}
                        {e.subjects?.placeholder_coach_name ? (
                          <span className="opacity-70">· ครู {e.subjects.placeholder_coach_name} (กรอกแทน)</span>
                        ) : (
                          e.subjects?.profiles?.full_name && <span className="opacity-70">· ครู {e.subjects.profiles.full_name}</span>
                        )}
                        <form action={deleteEnrollment}>
                          <input type="hidden" name="id" value={e.id} />
                          <button className="opacity-60 hover:text-red-500 hover:opacity-100" type="submit" title={m.deleteEnrollment}>
                            ×
                          </button>
                        </form>
                      </span>
                    );
                  })}
                  {!enrollmentsByChild.get(selectedChild.id)?.length && (
                    <span className="text-sm text-slate-400">{m.noActivity}</span>
                  )}
                </div>

                {!!enrollmentsByChild.get(selectedChild.id)?.length && (
                  <div className="mb-4">
                    {(() => {
                      const { items, excluded } = buildCalendarItems(enrollmentsByChild.get(selectedChild.id) ?? [], lessonExcludedSet);
                      const childEnrollmentIds = new Set((enrollmentsByChild.get(selectedChild.id) ?? []).map((e) => e.id));
                      const childOverrides = sessionOverrides.filter((o) => childEnrollmentIds.has(o.enrollmentId));
                      return <CalendarMonth items={items} excluded={excluded} overrides={childOverrides} />;
                    })()}
                    <div className="mt-3 flex flex-col gap-3">
                      {enrollmentsByChild.get(selectedChild.id)?.map((e) => {
                        const enrollmentAssignments = assignmentsByEnrollment.get(e.id) ?? [];
                        return (
                          <div key={e.id} className="rounded-xl border border-slate-200 p-3">
                            <p className="mb-2 text-sm font-medium text-slate-700">
                              {e.subjects?.name} · {e.mode === "lesson" ? d.child.lesson : d.child.practice}
                            </p>
                            {e.mode === "lesson" ? (
                              <LessonScheduleCard enrollmentId={e.id} lessonSchedules={e.lesson_schedules ?? []} />
                            ) : (
                              <PracticeScheduleCard enrollmentId={e.id} practiceSchedules={e.practice_schedules ?? []} weekdayOptions={weekdayOptions} m={{ ...m, save: d.common.save, delete: d.common.delete }} />
                            )}

                            {e.subjects?.placeholder_coach_name && (
                              <CoachInviteButton
                                enrollmentId={e.id}
                                coachName={e.subjects.placeholder_coach_name}
                              />
                            )}

                            <details className="mt-3 border-t border-slate-100 pt-3">
                              <summary className="cursor-pointer text-xs font-medium text-slate-500">
                                {m.homework} ({enrollmentAssignments.length})
                              </summary>
                              <div className="mt-2 flex flex-col gap-2">
                                {enrollmentAssignments.map((a) => {
                                  const submission = a.submissions?.[0];
                                  const isSubmitted = submission?.status === "submitted";
                                  return (
                                    <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
                                      <div className="flex items-start justify-between gap-1">
                                        <a href={`/dashboard/homework/${a.id}`} className="font-medium text-indigo-700 hover:underline">
                                          {a.title}
                                        </a>
                                        {isSubmitted ? (
                                          <span className="shrink-0 text-emerald-600">✓</span>
                                        ) : (
                                          <span className="shrink-0 text-amber-500">●</span>
                                        )}
                                      </div>
                                      {a.due_date && <p className="text-slate-400">{hw.dueDate} {a.due_date}</p>}
                                    </div>
                                  );
                                })}

                                {enrollmentAssignments.length > 0 && (
                                  <a
                                    href={`/dashboard/homework/subject/${e.id}`}
                                    className="block text-center text-xs text-slate-500 hover:text-indigo-600 hover:underline"
                                  >
                                    {m.viewAllHomework}
                                  </a>
                                )}

                                <details className="mt-1">
                                  <summary className="cursor-pointer text-xs text-indigo-600 hover:underline">{m.addHomework}</summary>
                                  <form action={createAssignment} className="mt-2 flex flex-col gap-1.5">
                                    <input type="hidden" name="enrollment_id" value={e.id} />
                                    <input name="title" placeholder={hw.titlePlaceholder} required className="rounded border border-slate-300 px-2 py-1 text-xs" />
                                    <textarea name="description" placeholder={hw.descPlaceholder} rows={2} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                                    <input name="reference_url" type="url" placeholder={hw.refUrlPlaceholder} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                                    <textarea name="reference_text" placeholder={hw.refTextPlaceholder} rows={2} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                                    <input name="suggested_minutes" type="number" min="1" placeholder={hw.minutesPlaceholder} className="w-36 rounded border border-slate-300 px-2 py-1 text-xs" />
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="text-xs text-slate-400">{m.practiceEachDay}</span>
                                      <fieldset className="flex gap-1 text-xs text-slate-600">
                                        {weekdayOptions.map((w) => (
                                          <label key={w.value} className="flex items-center gap-0.5 rounded border border-slate-300 px-1 py-0.5">
                                            <input type="checkbox" name="suggested_weekdays" value={w.value} />
                                            {w.label}
                                          </label>
                                        ))}
                                      </fieldset>
                                    </div>
                                    <button className="self-start rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700" type="submit">
                                      {m.assignHomework}
                                    </button>
                                  </form>
                                </details>
                              </div>
                            </details>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <details className="group mb-2">
                  <summary className="cursor-pointer text-sm font-medium text-indigo-600">
                    {m.inviteCoach}
                  </summary>
                  <form action={inviteCoach} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="child_id" value={selectedChild.id} />
                    <ManualCoachToggle className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <SubjectPicker className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <fieldset className="flex items-center gap-3 text-xs text-slate-600">
                      <label className="flex items-center gap-1">
                        <input type="radio" name="mode" value="practice" defaultChecked /> {m.practiceFlex}
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" name="mode" value="lesson" /> {m.lessonFixed}
                      </label>
                    </fieldset>
                    <input
                      name="note"
                      placeholder={m.noteOptional}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                    <button
                      className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                      type="submit"
                    >
                      {m.sendInvite}
                    </button>
                  </form>
                </details>

                <details className="group mb-2">
                  <summary className="cursor-pointer text-sm font-medium text-emerald-600">
                    {m.selfTeach}
                  </summary>
                  <form action={selfCoach} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="child_id" value={selectedChild.id} />
                    <SubjectPicker className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <fieldset className="flex items-center gap-3 text-xs text-slate-600">
                      <label className="flex items-center gap-1">
                        <input type="radio" name="mode" value="practice" defaultChecked /> {m.practiceFlex}
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" name="mode" value="lesson" /> {m.lessonFixed}
                      </label>
                    </fieldset>
                    <button
                      className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                      type="submit"
                    >
                      {m.startTeaching}
                    </button>
                  </form>
                </details>

                {selectedChild.is_owner && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-slate-600">
                      {m.addParent}
                    </summary>
                    <form action={inviteParent} className="mt-3 flex flex-wrap gap-2">
                      <input type="hidden" name="child_id" value={selectedChild.id} />
                      <input
                        name="invitee_email"
                        type="email"
                        placeholder={m.inviteParentEmail}
                        required
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      />
                      <button className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
                        {m.sendInvite}
                      </button>
                    </form>
                    {!!sentParentInvitations?.length && (
                      <ul className="mt-2 flex flex-col gap-1 text-xs text-slate-500">
                        {sentParentInvitations.map((inv) => {
                          const s = statusLabel(inv.status);
                          return (
                            <li key={inv.id}>
                              {inv.invitee_email} · <span className={s.cls}>{s.text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </details>
                )}

                {!!sentInvitations?.length && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-sm font-semibold text-slate-500">{m.sentCoachInvites}</h3>
                    <ul className="flex flex-col gap-1 text-sm">
                      {sentInvitations.map((inv) => {
                        const s = statusLabel(inv.status);
                        return (
                          <li key={inv.id} className="text-slate-600">
                            {inv.coach_email} ({inv.subject_name}) · <span className={s.cls}>{s.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {isCoach && !!externalCoachEnrollments?.length && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">{m.myStudents}</h2>
            <div className="flex flex-col gap-4">
              {[...coachEnrollmentsByChild.entries()].map(([childId, { childName, items }]) => (
                <div key={childId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-2 font-medium text-slate-900">{childName}</p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {items?.map((e) => {
                      const colors = categoryColor[e.subjects?.category ?? "academic"] ?? categoryColor.academic;
                      return (
                        <span
                          key={e.id}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${modeDotColor[e.mode]}`} />
                          {e.subjects?.name} · {categoryLabel[e.subjects?.category]} · {modeLabel[e.mode]}
                          <form action={deleteEnrollment}>
                            <input type="hidden" name="id" value={e.id} />
                            <button className="opacity-60 hover:text-red-500 hover:opacity-100" type="submit" title={m.deleteEnrollment}>
                              ×
                            </button>
                          </form>
                        </span>
                      );
                    })}
                  </div>
                  {(() => {
                    const built = buildCalendarItems(items ?? [], lessonExcludedSet);
                    const coachChildEnrollmentIds = new Set((items ?? []).map((e) => e.id));
                    const coachChildOverrides = sessionOverrides.filter((o) => coachChildEnrollmentIds.has(o.enrollmentId));
                    return <CalendarMonth items={built.items} excluded={built.excluded} overrides={coachChildOverrides} />;
                  })()}
                  <div className="mt-3 flex flex-col gap-3">
                    {items?.map((e) => {
                      const coachEnrollmentAssignments = coachAssignmentsByEnrollment.get(e.id) ?? [];
                      return (
                        <div key={e.id} className="rounded-xl border border-slate-200 p-3">
                          <p className="mb-2 text-sm font-medium text-slate-700">
                            {e.subjects?.name} · {e.mode === "lesson" ? d.child.lesson : d.child.practice}
                          </p>
                          {e.mode === "lesson" ? (
                            <LessonScheduleCard enrollmentId={e.id} lessonSchedules={e.lesson_schedules ?? []} />
                          ) : (
                            <PracticeScheduleCard enrollmentId={e.id} practiceSchedules={e.practice_schedules ?? []} weekdayOptions={weekdayOptions} m={{ ...m, save: d.common.save, delete: d.common.delete }} />
                          )}

                          <details className="mt-3 border-t border-slate-100 pt-3">
                            <summary className="cursor-pointer text-xs font-medium text-slate-500">
                              {m.homework} ({coachEnrollmentAssignments.length})
                            </summary>
                            <div className="mt-2 flex flex-col gap-2">
                              {coachEnrollmentAssignments.map((a) => {
                                const submission = a.submissions?.[0];
                                const isSubmitted = submission?.status === "submitted";
                                return (
                                  <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
                                    <div className="flex items-start justify-between gap-1">
                                      <a href={`/dashboard/homework/${a.id}`} className="font-medium text-indigo-700 hover:underline">
                                        {a.title}
                                      </a>
                                      {isSubmitted ? (
                                        <span className="shrink-0 text-emerald-600">✓</span>
                                      ) : (
                                        <span className="shrink-0 text-amber-500">●</span>
                                      )}
                                    </div>
                                    {a.due_date && <p className="text-slate-400">{hw.dueDate} {a.due_date}</p>}
                                  </div>
                                );
                              })}

                              {coachEnrollmentAssignments.length > 0 && (
                                <a
                                  href={`/dashboard/homework/subject/${e.id}`}
                                  className="block text-center text-xs text-slate-500 hover:text-indigo-600 hover:underline"
                                >
                                  {m.viewAllHomework}
                                </a>
                              )}

                              <details className="mt-1">
                                <summary className="cursor-pointer text-xs text-indigo-600 hover:underline">{m.addAssignment}</summary>
                                <form action={createAssignment} className="mt-2 flex flex-col gap-1.5">
                                  <input type="hidden" name="enrollment_id" value={e.id} />
                                  <input name="title" placeholder={hw.titlePlaceholder} required className="rounded border border-slate-300 px-2 py-1 text-xs" />
                                  <textarea name="description" placeholder={hw.descPlaceholder} rows={2} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                                  <input name="reference_url" type="url" placeholder={hw.refUrlPlaceholder} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                                  <textarea name="reference_text" placeholder={hw.refTextPlaceholder} rows={2} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                                  <input name="suggested_minutes" type="number" min="1" placeholder={hw.minutesPlaceholder} className="w-36 rounded border border-slate-300 px-2 py-1 text-xs" />
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="text-xs text-slate-400">{m.practiceEachDay}</span>
                                    <fieldset className="flex gap-1 text-xs text-slate-600">
                                      {weekdayOptions.map((w) => (
                                        <label key={w.value} className="flex items-center gap-0.5 rounded border border-slate-300 px-1 py-0.5">
                                          <input type="checkbox" name="suggested_weekdays" value={w.value} />
                                          {w.label}
                                        </label>
                                      ))}
                                    </fieldset>
                                  </div>
                                  <button className="self-start rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700" type="submit">
                                    {m.assignHomework}
                                  </button>
                                </form>
                              </details>
                            </div>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {isCoach && (
          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">{m.pendingCoachInvite}</h2>
            <div className="flex flex-col gap-3">
              {pendingInvitations?.map((inv) => (
                <div key={inv.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-sm text-slate-700">
                    {inv.children?.full_name} {m.wantsToLearn} <strong>{inv.subject_name}</strong> ({categoryLabel[inv.category]})
                    {inv.note ? ` — ${inv.note}` : ""}
                  </p>
                  <div className="flex gap-2">
                    <form action={respondInvitation}>
                      <input type="hidden" name="invitation_id" value={inv.id} />
                      <input type="hidden" name="decision" value="accepted" />
                      <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700" type="submit">
                        {d.common.accept}
                      </button>
                    </form>
                    <form action={respondInvitation}>
                      <input type="hidden" name="invitation_id" value={inv.id} />
                      <input type="hidden" name="decision" value="declined" />
                      <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" type="submit">
                        {d.common.decline}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {!pendingInvitations?.length && <p className="text-sm text-slate-400">{m.noInvite}</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
