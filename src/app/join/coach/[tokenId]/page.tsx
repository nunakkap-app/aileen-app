"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { categoryLabel } from "@/lib/subjects";

async function claimCoachToken(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const tokenId = formData.get("token_id") as string;

  // Use the security-definer DB function to bypass enrollment RLS
  const { error } = await supabase.rpc("claim_coach_token", { p_token_id: tokenId });
  if (error) return;

  // Grant coach role
  await supabase
    .from("user_roles")
    .upsert({ user_id: auth.user.id, role: "coach" }, { onConflict: "user_id,role" });

  revalidatePath("/dashboard/manage");
  redirect("/dashboard/manage");
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function JoinCoachPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect(`/signup?next=${encodeURIComponent(`/join/coach/${tokenId}`)}&role=coach`);
  }

  const { data: token } = await supabase
    .from("coach_claim_tokens")
    .select("*, enrollments(id, children(full_name), subjects(name, category, placeholder_coach_name))")
    .eq("id", tokenId)
    .maybeSingle();

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <p className="text-slate-600">ไม่พบ link นี้ หรืออาจถูกใช้งานแล้ว</p>
          <a href="/dashboard/manage" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">กลับหน้าหลัก</a>
        </div>
      </div>
    );
  }

  if (token.claimed_at) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <p className="text-slate-600">link นี้ถูกใช้งานแล้ว</p>
          <a href="/dashboard/manage" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">กลับหน้าหลัก</a>
        </div>
      </div>
    );
  }

  const enrollment = one(token.enrollments as object);
  const subject = enrollment ? one((enrollment as { subjects?: object }).subjects as object) : null;
  const child = enrollment ? one((enrollment as { children?: object }).children as object) : null;

  const subjectName = (subject as { name?: string } | null)?.name ?? "";
  const category = (subject as { category?: string } | null)?.category ?? "";
  const coachName = (subject as { placeholder_coach_name?: string } | null)?.placeholder_coach_name ?? "";
  const childName = (child as { full_name?: string } | null)?.full_name ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">คำเชิญครู</h1>
        <p className="mb-6 text-sm text-slate-500">Aileen — ระบบจัดตารางเรียน/ซ้อม</p>

        <div className="mb-6 rounded-xl bg-slate-50 p-4">
          {coachName && (
            <p className="mb-2 text-sm text-slate-600">
              สำหรับครู <span className="font-medium text-slate-900">{coachName}</span>
            </p>
          )}
          <p className="text-sm text-slate-600">
            วิชา:{" "}
            <span className="font-medium text-slate-900">
              {subjectName} ({categoryLabel[category] ?? category})
            </span>
          </p>
          <p className="text-sm text-slate-600">
            นักเรียน: <span className="font-medium text-slate-900">{childName}</span>
          </p>
        </div>

        <form action={claimCoachToken}>
          <input type="hidden" name="token_id" value={tokenId} />
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            รับ {childName} เป็นนักเรียนของฉัน
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">
          เข้าสู่ระบบในฐานะ {auth.user.email} · ไม่ใช่คุณ?{" "}
          <a href="/login" className="text-indigo-600 hover:underline">เปลี่ยนบัญชี</a>
        </p>
      </div>
    </div>
  );
}
