import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { SubjectPicker } from "@/components/SubjectPicker";
import { CalendarMonth } from "@/components/CalendarMonth";
import { categoryLabel } from "@/lib/subjects";
import {
  addChild,
  addPracticeSchedule,
  createAssignment,
  deletePracticeSchedule,
  inviteCoach,
  respondInvitation,
  selfCoach,
  submitHomework,
} from "./actions";

type PracticeSchedule = {
  id: string;
  weekdays: number[];
  hours_per_session: number;
  start_date: string;
  end_date: string | null;
  note: string | null;
};

const weekdayOptions = [
  { value: 1, label: "จ" },
  { value: 2, label: "อ" },
  { value: 3, label: "พ" },
  { value: 4, label: "พฤ" },
  { value: 5, label: "ศ" },
  { value: 6, label: "ส" },
  { value: 0, label: "อา" },
];

function PracticeScheduleCard({
  enrollmentId,
  practiceSchedules,
}: {
  enrollmentId: string;
  practiceSchedules: PracticeSchedule[];
}) {
  return (
    <>
      <ul className="mb-3 flex flex-col gap-1 text-sm text-slate-600">
        {practiceSchedules.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span>
              ทุกวัน{s.weekdays.map((w) => weekdayOptions.find((o) => o.value === w)?.label).join(" ")} ·{" "}
              {s.hours_per_session} ชม. · เริ่ม {s.start_date}
              {s.end_date ? ` ถึง ${s.end_date}` : ""}
              {s.note ? ` · ${s.note}` : ""}
            </span>
            <form action={deletePracticeSchedule}>
              <input type="hidden" name="id" value={s.id} />
              <button className="text-xs text-red-500 hover:underline" type="submit">ลบ</button>
            </form>
          </li>
        ))}
        {!practiceSchedules.length && <li className="text-slate-400">ยังไม่มีตาราง</li>}
      </ul>
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
          placeholder="ชม./ครั้ง"
          required
          className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <input name="start_date" type="date" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <input name="end_date" type="date" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <input name="note" placeholder="หมายเหตุ" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
          เพิ่มตาราง
        </button>
      </form>
    </>
  );
}

export default async function DashboardPage() {
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
    ? await supabase.from("children").select("*").order("created_at")
    : { data: null };

  const childIds = children?.map((c) => c.id) ?? [];

  const { data: enrollments } = childIds.length
    ? await supabase
        .from("enrollments")
        .select("*, subjects(name, category, profiles(full_name)), children(full_name), practice_schedules(*)")
        .in("child_id", childIds)
    : { data: null };

  const enrollmentsByChild = new Map<string, typeof enrollments>();
  enrollments?.forEach((e) => {
    const list = enrollmentsByChild.get(e.child_id) ?? [];
    list.push(e);
    enrollmentsByChild.set(e.child_id, list);
  });

  const { data: coachSubjectIds } = isCoach
    ? await supabase.from("subjects").select("id").eq("coach_id", auth.user.id)
    : { data: null };

  const { data: coachEnrollments } = coachSubjectIds?.length
    ? await supabase
        .from("enrollments")
        .select("*, subjects(name, category), children(full_name), practice_schedules(*)")
        .in("subject_id", coachSubjectIds.map((s) => s.id))
    : { data: null };

  const { data: sentInvitations } = isParent
    ? await supabase.from("invitations").select("*, children(full_name)").order("created_at", { ascending: false })
    : { data: null };

  const { data: pendingInvitations } = isCoach
    ? await supabase
        .from("invitations")
        .select("*, children(full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
    : { data: null };

  const enrollmentIds = enrollments?.map((e) => e.id) ?? [];

  const { data: parentAssignments } = enrollmentIds.length
    ? await supabase
        .from("assignments")
        .select("*, submissions(*), enrollments(children(full_name), subjects(name))")
        .in("enrollment_id", enrollmentIds)
        .order("due_date", { ascending: true })
    : { data: null };

  const { data: coachAssignments } = isCoach
    ? await supabase
        .from("assignments")
        .select("*, submissions(*), enrollments(children(full_name), subjects(name))")
        .eq("coach_id", auth.user.id)
        .order("due_date", { ascending: true })
    : { data: null };

  const parentCalendarItems =
    enrollments?.flatMap((e) =>
      (e.practice_schedules ?? []).map((s: PracticeSchedule) => ({
        id: s.id,
        label: `${e.children?.full_name} · ${e.subjects?.name}`,
        weekdays: s.weekdays,
        hoursPerSession: s.hours_per_session,
        startDate: s.start_date,
        endDate: s.end_date,
      })),
    ) ?? [];

  const coachCalendarItems =
    coachEnrollments?.flatMap((e) =>
      (e.practice_schedules ?? []).map((s: PracticeSchedule) => ({
        id: s.id,
        label: `${e.children?.full_name} · ${e.subjects?.name}`,
        weekdays: s.weekdays,
        hoursPerSession: s.hours_per_session,
        startDate: s.start_date,
        endDate: s.end_date,
      })),
    ) ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        {isParent && (
          <section className="mb-10">
            <h1 className="mb-4 text-xl font-semibold text-slate-900">ลูกของฉัน</h1>

            <div className="flex flex-col gap-4">
              {children?.map((c) => (
                <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-1 font-medium text-slate-900">
                    {c.full_name}
                    {c.birthdate && <span className="ml-2 text-sm text-slate-400">เกิด {c.birthdate}</span>}
                  </p>

                  <div className="mb-4 mt-2 flex flex-wrap gap-2">
                    {enrollmentsByChild.get(c.id)?.map((e) => (
                      <span
                        key={e.id}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                      >
                        {e.subjects?.name} · {categoryLabel[e.subjects?.category]}
                        {e.subjects?.profiles?.full_name && (
                          <span className="text-indigo-400">· ครู {e.subjects.profiles.full_name}</span>
                        )}
                      </span>
                    ))}
                    {!enrollmentsByChild.get(c.id)?.length && (
                      <span className="text-sm text-slate-400">ยังไม่มีกิจกรรม</span>
                    )}
                  </div>

                  <details className="group mb-2">
                    <summary className="cursor-pointer text-sm font-medium text-indigo-600">
                      + แอดครู (เชิญด้วยอีเมล)
                    </summary>
                    <form action={inviteCoach} className="mt-3 flex flex-wrap gap-2">
                      <input type="hidden" name="child_id" value={c.id} />
                      <input
                        name="coach_email"
                        type="email"
                        placeholder="อีเมลครู/โค้ช"
                        required
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      />
                      <SubjectPicker className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                      <input
                        name="note"
                        placeholder="สิ่งที่ต้องการ (ถ้ามี)"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      />
                      <button
                        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                        type="submit"
                      >
                        ส่งคำเชิญ
                      </button>
                    </form>
                  </details>

                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-emerald-600">
                      + สอนลูกเอง
                    </summary>
                    <form action={selfCoach} className="mt-3 flex flex-wrap gap-2">
                      <input type="hidden" name="child_id" value={c.id} />
                      <SubjectPicker className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                      <button
                        className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                        type="submit"
                      >
                        เริ่มสอนเอง
                      </button>
                    </form>
                  </details>
                </div>
              ))}
              {!children?.length && (
                <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                  ยังไม่มีข้อมูลลูก — เพิ่มด้านล่างได้เลย
                </p>
              )}
            </div>

            <form action={addChild} className="mt-5 flex gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <input
                name="full_name"
                placeholder="ชื่อลูก"
                required
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input name="birthdate" type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">
                เพิ่มลูก
              </button>
            </form>

            {!!sentInvitations?.length && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-slate-500">คำเชิญที่ส่งไปแล้ว</h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {sentInvitations.map((inv) => (
                    <li key={inv.id} className="text-slate-600">
                      {inv.children?.full_name} → {inv.coach_email} ({inv.subject_name}) ·{" "}
                      <span
                        className={
                          inv.status === "accepted"
                            ? "text-emerald-600"
                            : inv.status === "declined"
                              ? "text-red-600"
                              : "text-amber-600"
                        }
                      >
                        {inv.status === "accepted" ? "ตอบรับแล้ว" : inv.status === "declined" ? "ปฏิเสธ" : "รอตอบรับ"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {isParent && !!enrollments?.length && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">ตารางซ้อม/เรียน</h2>
            <div className="mb-4">
              <CalendarMonth items={parentCalendarItems} />
            </div>
            <div className="flex flex-col gap-3">
              {enrollments.map((e) => (
                <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-medium text-slate-900">
                    {e.children?.full_name} · {e.subjects?.name} ({categoryLabel[e.subjects?.category]})
                  </p>
                  <PracticeScheduleCard enrollmentId={e.id} practiceSchedules={e.practice_schedules ?? []} />
                </div>
              ))}
            </div>
          </section>
        )}

        {isParent && !!parentAssignments?.length && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">การบ้าน</h2>
            <div className="flex flex-col gap-3">
              {parentAssignments.map((a) => {
                const submission = a.submissions?.[0];
                return (
                  <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-medium text-slate-900">
                      {a.enrollments?.children?.full_name} · {a.enrollments?.subjects?.name}
                    </p>
                    <p className="mt-1 font-medium text-slate-900">{a.title}</p>
                    {a.description && <p className="text-sm text-slate-600">{a.description}</p>}
                    {a.due_date && <p className="text-sm text-slate-400">กำหนดส่ง {a.due_date}</p>}

                    {submission?.status === "submitted" ? (
                      <p className="mt-2 text-sm text-emerald-600">
                        ส่งแล้วเมื่อ {new Date(submission.submitted_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    ) : (
                      <form action={submitHomework} className="mt-3 flex flex-wrap gap-2">
                        <input type="hidden" name="submission_id" value={submission?.id} />
                        <input
                          name="content"
                          placeholder="โน้ตถึงครู (ถ้ามี)"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                        />
                        <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700" type="submit">
                          ส่งการบ้าน
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {isCoach && !!coachEnrollments?.length && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">นักเรียนของฉัน</h2>
            <div className="flex flex-col gap-3">
              {coachEnrollments.map((e) => (
                <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-900">{e.children?.full_name}</p>
                  <p className="text-sm text-slate-500">
                    {e.subjects?.name} · {categoryLabel[e.subjects?.category]}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {isCoach && !!coachEnrollments?.length && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">ตารางที่ฉันสอน</h2>
            <div className="mb-4">
              <CalendarMonth items={coachCalendarItems} />
            </div>
            <div className="flex flex-col gap-3">
              {coachEnrollments.map((e) => (
                <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-medium text-slate-900">
                    {e.children?.full_name} · {e.subjects?.name} ({categoryLabel[e.subjects?.category]})
                  </p>
                  <PracticeScheduleCard enrollmentId={e.id} practiceSchedules={e.practice_schedules ?? []} />
                </div>
              ))}
            </div>
          </section>
        )}

        {isCoach && !!coachEnrollments?.length && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">การบ้าน</h2>
            <form action={createAssignment} className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <select name="enrollment_id" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                {coachEnrollments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.children?.full_name} · {e.subjects?.name}
                  </option>
                ))}
              </select>
              <input name="title" placeholder="ชื่อการบ้าน" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              <input name="description" placeholder="รายละเอียด" className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              <input name="due_date" type="date" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700" type="submit">
                มอบหมาย
              </button>
            </form>
            <div className="flex flex-col gap-3">
              {coachAssignments?.map((a) => {
                const submission = a.submissions?.[0];
                return (
                  <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-medium text-slate-900">
                      {a.enrollments?.children?.full_name} · {a.enrollments?.subjects?.name}
                    </p>
                    <p className="mt-1 font-medium text-slate-900">{a.title}</p>
                    {a.due_date && <p className="text-sm text-slate-400">กำหนดส่ง {a.due_date}</p>}
                    <p className="mt-2 text-sm">
                      {submission?.status === "submitted" ? (
                        <span className="text-emerald-600">
                          ส่งแล้วเมื่อ {new Date(submission.submitted_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      ) : (
                        <span className="text-amber-600">ยังไม่ส่ง</span>
                      )}
                    </p>
                  </div>
                );
              })}
              {!coachAssignments?.length && <p className="text-sm text-slate-400">ยังไม่มีการบ้านที่มอบหมาย</p>}
            </div>
          </section>
        )}

        {isCoach && (
          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">คำเชิญที่รอตอบรับ</h2>
            <div className="flex flex-col gap-3">
              {pendingInvitations?.map((inv) => (
                <div key={inv.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-sm text-slate-700">
                    {inv.children?.full_name} อยากเรียน <strong>{inv.subject_name}</strong> ({categoryLabel[inv.category]})
                    {inv.note ? ` — ${inv.note}` : ""}
                  </p>
                  <div className="flex gap-2">
                    <form action={respondInvitation}>
                      <input type="hidden" name="invitation_id" value={inv.id} />
                      <input type="hidden" name="decision" value="accepted" />
                      <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700" type="submit">
                        ตอบรับ
                      </button>
                    </form>
                    <form action={respondInvitation}>
                      <input type="hidden" name="invitation_id" value={inv.id} />
                      <input type="hidden" name="decision" value="declined" />
                      <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" type="submit">
                        ปฏิเสธ
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {!pendingInvitations?.length && <p className="text-sm text-slate-400">ไม่มีคำเชิญใหม่</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
