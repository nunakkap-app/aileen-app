import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { SubjectPicker } from "@/components/SubjectPicker";
import { categoryLabel } from "@/lib/subjects";
import { addChild, addSchedule, inviteCoach, respondInvitation, selfCoach } from "./actions";
import { saveCoachProfile, respondRequest } from "@/app/coaches/actions";

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
        .select("*, subjects(name, category, profiles(full_name)), children(full_name), schedules(*)")
        .in("child_id", childIds)
        .order("start_time", { foreignTable: "schedules", ascending: true })
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
        .select("*, subjects(name, category), children(full_name), schedules(*)")
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

  const { data: coachProfile } = isCoach
    ? await supabase.from("coach_profiles").select("*").eq("coach_id", auth.user.id).maybeSingle()
    : { data: null };

  const { data: pendingRequests } = isCoach
    ? await supabase
        .from("requests")
        .select("*, children(full_name)")
        .eq("coach_id", auth.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        {isParent && (
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-slate-900">ลูกของฉัน</h1>
            </div>

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
            <div className="flex flex-col gap-3">
              {enrollments.map((e) => (
                <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-medium text-slate-900">
                    {e.children?.full_name} · {e.subjects?.name} ({categoryLabel[e.subjects?.category]})
                  </p>
                  <ul className="mb-3 flex flex-col gap-1 text-sm text-slate-600">
                    {e.schedules?.map((s: { id: string; start_time: string; end_time: string; location: string | null }) => (
                      <li key={s.id}>
                        {new Date(s.start_time).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                        {" – "}
                        {new Date(s.end_time).toLocaleTimeString("th-TH", { timeStyle: "short" })}
                        {s.location ? ` · ${s.location}` : ""}
                      </li>
                    ))}
                    {!e.schedules?.length && <li className="text-slate-400">ยังไม่มีตาราง</li>}
                  </ul>
                  <form action={addSchedule} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="enrollment_id" value={e.id} />
                    <input name="date" type="date" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <input name="start_time" type="time" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <input name="end_time" type="time" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <input name="location" placeholder="สถานที่" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
                      เพิ่มตาราง
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        {isCoach && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">โปรไฟล์สาธารณะ</h2>
            <form action={saveCoachProfile} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <input
                name="headline"
                placeholder="หัวข้อสั้นๆ เช่น โค้ชฟุตบอลเยาวชน"
                defaultValue={coachProfile?.headline ?? ""}
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                name="bio"
                placeholder="แนะนำตัว"
                defaultValue={coachProfile?.bio ?? ""}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <fieldset className="flex gap-4 text-sm text-slate-600">
                {["sport", "music", "academic"].map((cat) => (
                  <label key={cat} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      name="categories"
                      value={cat}
                      defaultChecked={coachProfile?.categories?.includes(cat)}
                    />
                    {categoryLabel[cat]}
                  </label>
                ))}
              </fieldset>
              <div className="flex gap-2">
                <input
                  name="years_experience"
                  type="number"
                  placeholder="ปีประสบการณ์"
                  defaultValue={coachProfile?.years_experience ?? ""}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  name="hourly_rate"
                  type="number"
                  placeholder="ค่าเรียน/ชม."
                  defaultValue={coachProfile?.hourly_rate ?? ""}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  name="service_area"
                  placeholder="พื้นที่บริการ"
                  defaultValue={coachProfile?.service_area ?? ""}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="is_published" defaultChecked={coachProfile?.is_published} />
                เปิดให้ผปค.ค้นเจอ
              </label>
              <button
                className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                type="submit"
              >
                บันทึกโปรไฟล์
              </button>
            </form>
          </section>
        )}

        {isCoach && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">คำขอเรียนจากผปค.</h2>
            <div className="flex flex-col gap-3">
              {pendingRequests?.map((req) => (
                <div key={req.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-sm text-slate-700">
                    {req.children?.full_name} อยากเรียน <strong>{req.subject_name}</strong> ({categoryLabel[req.category]})
                    {req.note ? ` — ${req.note}` : ""}
                  </p>
                  <div className="flex gap-2">
                    <form action={respondRequest}>
                      <input type="hidden" name="request_id" value={req.id} />
                      <input type="hidden" name="decision" value="accepted" />
                      <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700" type="submit">
                        ตอบรับ
                      </button>
                    </form>
                    <form action={respondRequest}>
                      <input type="hidden" name="request_id" value={req.id} />
                      <input type="hidden" name="decision" value="declined" />
                      <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" type="submit">
                        ปฏิเสธ
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {!pendingRequests?.length && <p className="text-sm text-slate-400">ยังไม่มีคำขอ</p>}
            </div>
          </section>
        )}

        {isCoach && !!coachEnrollments?.length && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">ตารางที่ฉันสอน</h2>
            <div className="flex flex-col gap-3">
              {coachEnrollments.map((e) => (
                <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-medium text-slate-900">
                    {e.children?.full_name} · {e.subjects?.name} ({categoryLabel[e.subjects?.category]})
                  </p>
                  <ul className="mb-3 flex flex-col gap-1 text-sm text-slate-600">
                    {e.schedules?.map((s: { id: string; start_time: string; end_time: string; location: string | null }) => (
                      <li key={s.id}>
                        {new Date(s.start_time).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                        {" – "}
                        {new Date(s.end_time).toLocaleTimeString("th-TH", { timeStyle: "short" })}
                        {s.location ? ` · ${s.location}` : ""}
                      </li>
                    ))}
                    {!e.schedules?.length && <li className="text-slate-400">ยังไม่มีตาราง</li>}
                  </ul>
                  <form action={addSchedule} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="enrollment_id" value={e.id} />
                    <input name="date" type="date" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <input name="start_time" type="time" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <input name="end_time" type="time" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <input name="location" placeholder="สถานที่" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                    <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
                      เพิ่มตาราง
                    </button>
                  </form>
                </div>
              ))}
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
