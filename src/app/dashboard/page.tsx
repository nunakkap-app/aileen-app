import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { addChild, addSubject } from "./actions";

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

  const { data: subjects } = isCoach
    ? await supabase.from("subjects").select("*").order("created_at")
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
          <h2 className="mb-3 text-lg font-semibold">ลูกของฉัน</h2>
          <ul className="mb-4 flex flex-col gap-2">
            {children?.map((c) => (
              <li key={c.id} className="rounded border px-3 py-2">
                {c.full_name} {c.birthdate ? `· เกิด ${c.birthdate}` : ""}
              </li>
            ))}
            {!children?.length && <li className="text-sm text-gray-500">ยังไม่มีข้อมูลลูก</li>}
          </ul>
          <form action={addChild} className="flex gap-2">
            <input name="full_name" placeholder="ชื่อลูก" required className="rounded border px-3 py-2" />
            <input name="birthdate" type="date" className="rounded border px-3 py-2" />
            <button className="rounded bg-black px-4 py-2 text-white" type="submit">เพิ่ม</button>
          </form>
        </section>
      )}

      {isCoach && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">วิชา/กิจกรรมที่สอน</h2>
          <ul className="mb-4 flex flex-col gap-2">
            {subjects?.map((s) => (
              <li key={s.id} className="rounded border px-3 py-2">
                {s.name} · {s.category}
              </li>
            ))}
            {!subjects?.length && <li className="text-sm text-gray-500">ยังไม่มีวิชา</li>}
          </ul>
          <form action={addSubject} className="flex gap-2">
            <input name="name" placeholder="ชื่อวิชา/กิจกรรม" required className="rounded border px-3 py-2" />
            <select name="category" className="rounded border px-3 py-2">
              <option value="sport">กีฬา</option>
              <option value="music">ดนตรี</option>
              <option value="academic">วิชาการ</option>
            </select>
            <button className="rounded bg-black px-4 py-2 text-white" type="submit">เพิ่ม</button>
          </form>
        </section>
      )}
    </div>
  );
}
