import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { categoryColor, categoryLabel } from "@/lib/subjects";

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function formatDuration(s: number) {
  if (!s) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}ชม.${m ? `${m}น.` : ""}` : `${m}น.`;
}

export default async function SubjectHomeworkSummaryPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*, children(full_name), subjects(name, category)")
    .eq("id", enrollmentId)
    .single();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*, submissions(*)")
    .eq("enrollment_id", enrollmentId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (!enrollment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">ไม่พบวิชานี้</p>
      </div>
    );
  }

  const child = one(enrollment.children as object | null);
  const subject = one(enrollment.subjects as object | null);
  const childName = (child as { full_name?: string } | null)?.full_name ?? "";
  const subjectName = (subject as { name?: string } | null)?.name ?? "";
  const category = (subject as { category?: string } | null)?.category ?? "academic";
  const colors = categoryColor[category] ?? categoryColor.academic;

  const total = assignments?.length ?? 0;
  const submitted = assignments?.filter((a) => a.submissions?.[0]?.status === "submitted").length ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = assignments?.filter(
    (a) => a.due_date && a.due_date < today && a.submissions?.[0]?.status !== "submitted",
  ).length ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} />
      <main className="mx-auto max-w-lg px-6 py-10">
        <a href="/dashboard/manage" className="mb-4 inline-block text-sm text-indigo-600 hover:underline">
          ‹ กลับ
        </a>

        {/* Header */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className={`mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
            {categoryLabel[category]}
          </span>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{subjectName}</h1>
          {childName && <p className="text-sm text-slate-500">{childName}</p>}

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-2xl font-semibold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500">ทั้งหมด</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-2xl font-semibold text-emerald-700">{submitted}</p>
              <p className="text-xs text-emerald-600">ส่งแล้ว</p>
            </div>
            <div className={`rounded-xl p-3 ${overdue > 0 ? "bg-red-50" : "bg-slate-50"}`}>
              <p className={`text-2xl font-semibold ${overdue > 0 ? "text-red-600" : "text-slate-400"}`}>{overdue}</p>
              <p className={`text-xs ${overdue > 0 ? "text-red-500" : "text-slate-400"}`}>เกินกำหนด</p>
            </div>
          </div>

          {total > 0 && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${(submitted / total) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-slate-400">{Math.round((submitted / total) * 100)}%</p>
            </div>
          )}
        </div>

        {/* Assignment list */}
        {!total && (
          <p className="text-center text-sm text-slate-400">ยังไม่มีการบ้าน</p>
        )}

        <div className="flex flex-col gap-3">
          {assignments?.map((a) => {
            const sub = a.submissions?.[0] as { status?: string; submitted_at?: string; elapsed_seconds?: number; timer_status?: string; media_url?: string } | undefined;
            const isSubmitted = sub?.status === "submitted";
            const isOverdueItem = a.due_date && a.due_date < today && !isSubmitted;
            const timerDone = (sub?.elapsed_seconds ?? 0) > 0;
            const hasMedia = !!sub?.media_url;

            return (
              <a
                key={a.id}
                href={`/dashboard/homework/${a.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{a.title}</p>
                    {a.description && (
                      <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">{a.description}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-slate-400">
                      {timerDone && <span className="text-indigo-500">⏱ {formatDuration(sub!.elapsed_seconds!)}</span>}
                      {hasMedia && <span className="text-indigo-500">📎 มีไฟล์</span>}
                      {a.suggested_minutes && <span>{a.suggested_minutes} น.</span>}
                      {a.reference_url && <span className="text-blue-500">🔗 ref</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {isSubmitted ? (
                      <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        ✓ ส่งแล้ว
                      </span>
                    ) : isOverdueItem ? (
                      <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        เกินกำหนด
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                        ยังไม่ส่ง
                      </span>
                    )}
                    {a.due_date && (
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(a.due_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
