import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { SubjectPicker } from "@/components/SubjectPicker";
import { categoryLabel } from "@/lib/subjects";
import { sendRequest } from "./actions";

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
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">หาครู/โค้ช</h1>

        <div className="mb-6 flex gap-2 text-sm">
          <a
            href="/coaches"
            className={`rounded-full px-3 py-1.5 ${!category ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            ทั้งหมด
          </a>
          {Object.entries(categoryLabel).map(([key, label]) => (
            <a
              key={key}
              href={`/coaches?category=${key}`}
              className={`rounded-full px-3 py-1.5 ${category === key ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {coaches?.map((coach) => (
            <div key={coach.coach_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-medium text-slate-900">
                {coach.profiles?.full_name ?? "ครู"} — {coach.headline}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {coach.categories?.map((c: string) => categoryLabel[c]).join(", ")}
                {coach.years_experience ? ` · ประสบการณ์ ${coach.years_experience} ปี` : ""}
                {coach.hourly_rate ? ` · ${coach.hourly_rate} บาท/ชม.` : ""}
              </p>
              {coach.bio && <p className="mt-2 text-sm text-slate-700">{coach.bio}</p>}
              {coach.service_area && <p className="text-sm text-slate-400">พื้นที่: {coach.service_area}</p>}

              {isParent && !!children?.length && (
                <form action={sendRequest} className="mt-4 flex flex-wrap gap-2">
                  <input type="hidden" name="coach_id" value={coach.coach_id} />
                  <select name="child_id" required className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                  <SubjectPicker className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                  <input name="note" placeholder="สิ่งที่ต้องการ" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                  <button className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700" type="submit">
                    ขอเรียน
                  </button>
                </form>
              )}
            </div>
          ))}
          {!coaches?.length && (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
              ยังไม่มีครูเปิดรับในหมวดนี้
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
