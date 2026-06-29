import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { addChild, inviteCoach, respondInvitation } from "./actions";
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
    <div className="mx-auto max-w-2xl py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
        <form action={logout}>
          <button className="text-sm underline" type="submit">ออกจากระบบ</button>
        </form>
      </div>

      {isParent && (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">ลูกของฉัน</h2>
            <a href="/coaches" className="text-sm underline">หาครู/โค้ช</a>
          </div>
          <ul className="mb-4 flex flex-col gap-4">
            {children?.map((c) => (
              <li key={c.id} className="rounded border px-3 py-3">
                <p className="mb-2 font-medium">
                  {c.full_name} {c.birthdate ? `· เกิด ${c.birthdate}` : ""}
                </p>
                <form action={inviteCoach} className="flex flex-wrap gap-2">
                  <input type="hidden" name="child_id" value={c.id} />
                  <input
                    name="coach_email"
                    type="email"
                    placeholder="อีเมลครู/โค้ช"
                    required
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <select name="category" className="rounded border px-2 py-1 text-sm">
                    <option value="sport">กีฬา</option>
                    <option value="music">ดนตรี</option>
                    <option value="academic">วิชาการ</option>
                  </select>
                  <input
                    name="subject_name"
                    placeholder="วิชา/กิจกรรม เช่น เปียโน"
                    required
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <input
                    name="note"
                    placeholder="สิ่งที่ต้องการ (ถ้ามี)"
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <button className="rounded bg-black px-3 py-1 text-sm text-white" type="submit">
                    แอดครู
                  </button>
                </form>
              </li>
            ))}
            {!children?.length && <li className="text-sm text-gray-500">ยังไม่มีข้อมูลลูก</li>}
          </ul>
          <form action={addChild} className="flex gap-2">
            <input name="full_name" placeholder="ชื่อลูก" required className="rounded border px-3 py-2" />
            <input name="birthdate" type="date" className="rounded border px-3 py-2" />
            <button className="rounded bg-black px-4 py-2 text-white" type="submit">เพิ่มลูก</button>
          </form>

          {!!sentInvitations?.length && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-600">คำเชิญที่ส่งไปแล้ว</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {sentInvitations.map((inv) => (
                  <li key={inv.id} className="text-gray-600">
                    {inv.children?.full_name} → {inv.coach_email} ({inv.subject_name}) ·{" "}
                    <span
                      className={
                        inv.status === "accepted"
                          ? "text-green-600"
                          : inv.status === "declined"
                            ? "text-red-600"
                            : "text-yellow-600"
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

      {isCoach && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">โปรไฟล์สาธารณะ (ให้ผปค.ค้นเจอ)</h2>
          <form action={saveCoachProfile} className="flex flex-col gap-2">
            <input
              name="headline"
              placeholder="หัวข้อสั้นๆ เช่น โค้ชฟุตบอลเยาวชน"
              defaultValue={coachProfile?.headline ?? ""}
              required
              className="rounded border px-3 py-2"
            />
            <textarea
              name="bio"
              placeholder="แนะนำตัว"
              defaultValue={coachProfile?.bio ?? ""}
              className="rounded border px-3 py-2"
            />
            <fieldset className="flex gap-4 text-sm">
              {["sport", "music", "academic"].map((cat) => (
                <label key={cat} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    name="categories"
                    value={cat}
                    defaultChecked={coachProfile?.categories?.includes(cat)}
                  />
                  {cat === "sport" ? "กีฬา" : cat === "music" ? "ดนตรี" : "วิชาการ"}
                </label>
              ))}
            </fieldset>
            <div className="flex gap-2">
              <input
                name="years_experience"
                type="number"
                placeholder="ปีประสบการณ์"
                defaultValue={coachProfile?.years_experience ?? ""}
                className="rounded border px-3 py-2"
              />
              <input
                name="hourly_rate"
                type="number"
                placeholder="ค่าเรียน/ชม."
                defaultValue={coachProfile?.hourly_rate ?? ""}
                className="rounded border px-3 py-2"
              />
              <input
                name="service_area"
                placeholder="พื้นที่บริการ"
                defaultValue={coachProfile?.service_area ?? ""}
                className="rounded border px-3 py-2"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_published" defaultChecked={coachProfile?.is_published} />
              เปิดให้ผปค.ค้นเจอ
            </label>
            <button className="self-start rounded bg-black px-4 py-2 text-white" type="submit">
              บันทึกโปรไฟล์
            </button>
          </form>
        </section>
      )}

      {isCoach && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">คำขอเรียนจากผปค. (ผ่านการค้นหา)</h2>
          <ul className="flex flex-col gap-2">
            {pendingRequests?.map((req) => (
              <li key={req.id} className="rounded border px-3 py-3">
                <p className="mb-2">
                  {req.children?.full_name} อยากเรียน <strong>{req.subject_name}</strong> ({req.category})
                  {req.note ? ` — ${req.note}` : ""}
                </p>
                <div className="flex gap-2">
                  <form action={respondRequest}>
                    <input type="hidden" name="request_id" value={req.id} />
                    <input type="hidden" name="decision" value="accepted" />
                    <button className="rounded bg-black px-3 py-1 text-sm text-white" type="submit">
                      ตอบรับ
                    </button>
                  </form>
                  <form action={respondRequest}>
                    <input type="hidden" name="request_id" value={req.id} />
                    <input type="hidden" name="decision" value="declined" />
                    <button className="rounded border px-3 py-1 text-sm" type="submit">
                      ปฏิเสธ
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {!pendingRequests?.length && <li className="text-sm text-gray-500">ยังไม่มีคำขอ</li>}
          </ul>
        </section>
      )}

      {isCoach && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">คำเชิญที่รอตอบรับ</h2>
          <ul className="flex flex-col gap-2">
            {pendingInvitations?.map((inv) => (
              <li key={inv.id} className="rounded border px-3 py-3">
                <p className="mb-2">
                  {inv.children?.full_name} อยากเรียน <strong>{inv.subject_name}</strong> ({inv.category})
                  {inv.note ? ` — ${inv.note}` : ""}
                </p>
                <div className="flex gap-2">
                  <form action={respondInvitation}>
                    <input type="hidden" name="invitation_id" value={inv.id} />
                    <input type="hidden" name="decision" value="accepted" />
                    <button className="rounded bg-black px-3 py-1 text-sm text-white" type="submit">
                      ตอบรับ
                    </button>
                  </form>
                  <form action={respondInvitation}>
                    <input type="hidden" name="invitation_id" value={inv.id} />
                    <input type="hidden" name="decision" value="declined" />
                    <button className="rounded border px-3 py-1 text-sm" type="submit">
                      ปฏิเสธ
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {!pendingInvitations?.length && <li className="text-sm text-gray-500">ไม่มีคำเชิญใหม่</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
