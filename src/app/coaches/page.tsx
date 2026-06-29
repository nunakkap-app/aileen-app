import { createClient } from "@/lib/supabase/server";
import { sendRequest } from "./actions";

const categoryLabel: Record<string, string> = {
  sport: "กีฬา",
  music: "ดนตรี",
  academic: "วิชาการ",
};

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id);
  const isParent = roles?.some((r) => r.role === "parent");

  let query = supabase
    .from("coach_profiles")
    .select("*, profiles(full_name)")
    .eq("is_published", true);
  if (category) query = query.contains("categories", [category]);
  const { data: coaches } = await query;

  const { data: children } = isParent
    ? await supabase.from("children").select("id, full_name")
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">หาครู/โค้ช</h1>
        <a href="/dashboard" className="text-sm underline">กลับแดชบอร์ด</a>
      </div>

      <div className="mb-6 flex gap-2 text-sm">
        <a href="/coaches" className={!category ? "font-semibold underline" : ""}>ทั้งหมด</a>
        {Object.entries(categoryLabel).map(([key, label]) => (
          <a key={key} href={`/coaches?category=${key}`} className={category === key ? "font-semibold underline" : ""}>
            {label}
          </a>
        ))}
      </div>

      <ul className="flex flex-col gap-4">
        {coaches?.map((coach) => (
          <li key={coach.coach_id} className="rounded border px-4 py-4">
            <p className="font-medium">{coach.profiles?.full_name ?? "ครู"} — {coach.headline}</p>
            <p className="text-sm text-gray-600">
              {coach.categories?.map((c: string) => categoryLabel[c]).join(", ")}
              {coach.years_experience ? ` · ประสบการณ์ ${coach.years_experience} ปี` : ""}
              {coach.hourly_rate ? ` · ${coach.hourly_rate} บาท/ชม.` : ""}
            </p>
            {coach.bio && <p className="mt-1 text-sm text-gray-700">{coach.bio}</p>}
            {coach.service_area && <p className="text-sm text-gray-500">พื้นที่: {coach.service_area}</p>}

            {isParent && !!children?.length && (
              <form action={sendRequest} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="coach_id" value={coach.coach_id} />
                <select name="child_id" required className="rounded border px-2 py-1 text-sm">
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
                <select name="category" className="rounded border px-2 py-1 text-sm">
                  <option value="sport">กีฬา</option>
                  <option value="music">ดนตรี</option>
                  <option value="academic">วิชาการ</option>
                </select>
                <input name="subject_name" placeholder="วิชา/กิจกรรม" required className="rounded border px-2 py-1 text-sm" />
                <input name="note" placeholder="สิ่งที่ต้องการ" className="rounded border px-2 py-1 text-sm" />
                <button className="rounded bg-black px-3 py-1 text-sm text-white" type="submit">ขอเรียน</button>
              </form>
            )}
          </li>
        ))}
        {!coaches?.length && <li className="text-sm text-gray-500">ยังไม่มีครูเปิดรับในหมวดนี้</li>}
      </ul>
    </div>
  );
}
