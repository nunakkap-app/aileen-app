import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChildPresenceBroadcaster } from "@/components/ChildPresence";

export default async function ChildHomePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/child-login");

  const isChild = auth.user.user_metadata?.is_child === true;
  if (!isChild) redirect("/dashboard");

  const childId = auth.user.user_metadata?.child_id as string;
  const username = auth.user.user_metadata?.username as string;

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("id")
    .eq("child_id", childId);

  const enrollmentIds = enrollmentRows?.map((e) => e.id) ?? [];

  const { data: assignments } = enrollmentIds.length ? await supabase
    .from("assignments")
    .select("id, title, description, suggested_minutes, submissions(status, last_practiced_date)")
    .eq("status", "active")
    .in("enrollment_id", enrollmentIds)
    .order("created_at", { ascending: false })
  : { data: [] };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <ChildPresenceBroadcaster childId={childId} />

      <header className="flex items-center justify-between px-6 py-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">สวัสดี 👋</h1>
          <p className="text-sm text-slate-500">@{username}</p>
        </div>
        <form action="/api/auth/signout" method="POST">
          <a href="/child-login" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
            ออกจากระบบ
          </a>
        </form>
      </header>

      <main className="px-6 pb-10">
        <h2 className="mb-4 text-base font-semibold text-slate-800">การบ้านของฉัน</h2>

        {!assignments?.length ? (
          <p className="text-sm text-slate-400">ยังไม่มีการบ้าน</p>
        ) : (
          <div className="flex flex-col gap-3">
            {assignments.map((a) => {
              const sub = Array.isArray(a.submissions) ? a.submissions[0] : a.submissions;
              const submitted = sub?.status === "submitted";
              return (
                <a
                  key={a.id}
                  href={`/dashboard/homework/${a.id}`}
                  className={`block rounded-2xl border bg-white p-4 shadow-sm transition-colors hover:border-indigo-200 ${submitted ? "border-emerald-100" : "border-slate-200"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${submitted ? "text-slate-400 line-through" : "text-slate-900"}`}>
                      {a.title}
                    </p>
                    {submitted && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">ส่งแล้ว ✓</span>
                    )}
                  </div>
                  {a.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{a.description}</p>
                  )}
                  {a.suggested_minutes && (
                    <p className="mt-2 text-xs text-slate-400">⏱ {a.suggested_minutes} นาที</p>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
