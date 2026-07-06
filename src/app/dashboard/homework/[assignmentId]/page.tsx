import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { HomeworkSubmissionPanel } from "@/components/HomeworkSubmissionPanel";
import { categoryColor, categoryLabel } from "@/lib/subjects";
import { practiceHomeworkToday, closeAssignment } from "@/app/dashboard/session/actions";
import { HomeworkEditActions } from "@/components/HomeworkEditActions";

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function HomeworkDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: assignment } = await supabase
    .from("assignments")
    .select("*, submissions(*), enrollments(id, children(full_name), subjects(name, category))")
    .eq("id", assignmentId)
    .single();

  if (!assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">ไม่พบการบ้านนี้</p>
      </div>
    );
  }

  const enrollment = one(assignment.enrollments as object | null);
  const child = enrollment ? one((enrollment as { children?: object }).children as object | null) : null;
  const subject = enrollment ? one((enrollment as { subjects?: object }).subjects as object | null) : null;
  const enrollmentId = (enrollment as { id?: string } | null)?.id ?? "";

  const childName = (child as { full_name?: string } | null)?.full_name ?? "";
  const subjectName = (subject as { name?: string } | null)?.name ?? "";
  const category = (subject as { category?: string } | null)?.category ?? "academic";

  const submission = (assignment.submissions as { id: string; status: string; content: string | null; media_url: string | null; timer_status: string; elapsed_seconds: number; running_since: string | null; submitted_at: string | null; last_practiced_date: string | null }[] | null)?.[0];

  const today = new Date().toISOString().slice(0, 10);
  const practicedToday = submission?.last_practiced_date === today;
  const redirectPath = `/dashboard/homework/${assignmentId}`;
  const colors = categoryColor[category] ?? categoryColor.academic;

  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date() && submission?.status !== "submitted";

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar email={auth.user.email ?? ""} />
      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="mb-4 flex items-center justify-between">
          <a href="/dashboard/manage" className="text-sm text-indigo-600 hover:underline">
            ‹ กลับ
          </a>
          <a
            href={`/dashboard/homework/subject/${enrollmentId}`}
            className="text-sm text-slate-500 hover:underline"
          >
            ดูการบ้านทั้งหมดของวิชานี้ ›
          </a>
        </div>

        {/* Assignment info */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <span className={`mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                {subjectName} · {categoryLabel[category]}
              </span>
              <h1 className="mt-1 text-xl font-semibold text-slate-900">{assignment.title}</h1>
              {childName && <p className="mt-0.5 text-sm text-slate-500">สำหรับ {childName}</p>}
            </div>
            {assignment.due_date && (
              <p className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${isOverdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                {isOverdue ? "เกินกำหนด" : "กำหนดส่ง"}<br />
                {new Date(assignment.due_date).toLocaleDateString("th-TH", { dateStyle: "medium" })}
              </p>
            )}
          </div>

          <div className="mt-2 mb-3">
            <HomeworkEditActions
              assignmentId={assignmentId}
              enrollmentId={enrollmentId}
              title={assignment.title}
              description={assignment.description ?? null}
              referenceUrl={assignment.reference_url ?? null}
              referenceText={assignment.reference_text ?? null}
              suggestedMinutes={assignment.suggested_minutes ?? null}
              suggestedWeekdays={assignment.suggested_weekdays ?? null}
              redirectPath={redirectPath}
            />
          </div>

          {assignment.description && (
            <p className="mb-3 whitespace-pre-wrap text-sm text-slate-700">{assignment.description}</p>
          )}

          {assignment.suggested_minutes && (
            <p className="mb-2 text-sm text-slate-500">
              ⏱ เวลาโดยประมาณ{" "}
              <span className="font-medium text-slate-800">
                {assignment.suggested_minutes >= 60
                  ? `${Math.floor(assignment.suggested_minutes / 60)} ชม.${assignment.suggested_minutes % 60 ? ` ${assignment.suggested_minutes % 60} นาที` : ""}`
                  : `${assignment.suggested_minutes} นาที`}
              </span>
            </p>
          )}

          {assignment.suggested_weekdays?.length > 0 && (
            <p className="mb-2 text-sm text-slate-500">
              📅 แนะนำให้ฝึก:{" "}
              {(["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] as string[])
                .filter((_, i) => assignment.suggested_weekdays.includes(i))
                .join(" · ")}
            </p>
          )}

          {/* Reference */}
          {(assignment.reference_url || assignment.reference_text) && (
            <div className="mt-4 rounded-xl bg-blue-50 p-3">
              <p className="mb-1 text-xs font-semibold text-blue-700">เอกสาร / Reference</p>
              {assignment.reference_text && (
                <p className="whitespace-pre-wrap text-sm text-blue-800">{assignment.reference_text}</p>
              )}
              {assignment.reference_url && (
                <a
                  href={assignment.reference_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
                >
                  🔗 {assignment.reference_url}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Practice / close actions */}
        <div className="mb-4 flex flex-wrap gap-2">
          <form action={practiceHomeworkToday}>
            <input type="hidden" name="assignment_id" value={assignmentId} />
            <input type="hidden" name="enrollment_id" value={enrollmentId} />
            <input type="hidden" name="date" value={today} />
            <input type="hidden" name="uncheck" value={practicedToday ? "1" : "0"} />
            <input type="hidden" name="redirect_path" value={redirectPath} />
            <button
              type="submit"
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                practicedToday
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded border text-xs ${
                practicedToday ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300"
              }`}>
                {practicedToday ? "✓" : ""}
              </span>
              {practicedToday ? "ซ้อมวันนี้แล้ว ✓" : "ซ้อมไปเรื่อยๆ (วันนี้)"}
            </button>
          </form>

          <form action={closeAssignment}>
            <input type="hidden" name="assignment_id" value={assignmentId} />
            <input type="hidden" name="enrollment_id" value={enrollmentId} />
            <input type="hidden" name="date" value={today} />
            <input type="hidden" name="redirect_path" value="/dashboard/manage" />
            <button
              type="submit"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-400 hover:border-red-200 hover:text-red-500"
            >
              จบการบ้านนี้ ไม่ต้องทำแล้ว
            </button>
          </form>
        </div>

        {/* Submission */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">ส่งการบ้าน</h2>
          {submission ? (
            <HomeworkSubmissionPanel
              submission={submission}
              assignmentId={assignmentId}
              redirectPath={redirectPath}
            />
          ) : (
            <p className="text-sm text-slate-400">ยังไม่มีการบ้านนี้ในระบบ</p>
          )}
        </div>
      </main>
    </div>
  );
}
