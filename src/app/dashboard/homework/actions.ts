"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getSubmission(supabase: Awaited<ReturnType<typeof createClient>>, submissionId: string) {
  const { data } = await supabase.from("submissions").select("*").eq("id", submissionId).single();
  return data;
}

export async function startHomeworkTimer(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("submissions")
    .update({ timer_status: "running", running_since: new Date().toISOString() })
    .eq("id", formData.get("submission_id") as string);
  revalidatePath(formData.get("redirect_path") as string);
}

export async function pauseHomeworkTimer(formData: FormData) {
  const supabase = await createClient();
  const sub = await getSubmission(supabase, formData.get("submission_id") as string);
  if (!sub) return;
  const extra = sub.running_since
    ? Math.floor((Date.now() - new Date(sub.running_since).getTime()) / 1000)
    : 0;
  await supabase
    .from("submissions")
    .update({ timer_status: "paused", elapsed_seconds: sub.elapsed_seconds + extra, running_since: null })
    .eq("id", sub.id);
  revalidatePath(formData.get("redirect_path") as string);
}

export async function resumeHomeworkTimer(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("submissions")
    .update({ timer_status: "running", running_since: new Date().toISOString() })
    .eq("id", formData.get("submission_id") as string);
  revalidatePath(formData.get("redirect_path") as string);
}

export async function stopHomeworkTimer(formData: FormData) {
  const supabase = await createClient();
  const sub = await getSubmission(supabase, formData.get("submission_id") as string);
  if (!sub) return;
  const extra = sub.running_since
    ? Math.floor((Date.now() - new Date(sub.running_since).getTime()) / 1000)
    : 0;
  await supabase
    .from("submissions")
    .update({ timer_status: "done", elapsed_seconds: sub.elapsed_seconds + extra, running_since: null })
    .eq("id", sub.id);
  revalidatePath(formData.get("redirect_path") as string);
}

export async function uploadHomeworkMedia(formData: FormData) {
  const supabase = await createClient();
  const submissionId = formData.get("submission_id") as string;
  const file = formData.get("file") as File;
  if (!file || file.size === 0) return;

  const path = `homework/${submissionId}/${Date.now()}-${file.name}`;
  await supabase.storage.from("practice-media").upload(path, file);
  const { data } = supabase.storage.from("practice-media").getPublicUrl(path);
  await supabase.from("submissions").update({ media_url: data.publicUrl }).eq("id", submissionId);
  revalidatePath(formData.get("redirect_path") as string);
}

export async function saveHomeworkNote(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("submissions")
    .update({ content: (formData.get("content") as string) || null })
    .eq("id", formData.get("submission_id") as string);
  revalidatePath(formData.get("redirect_path") as string);
}

function getBangkokDateStr() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function markHomeworkSubmitted(formData: FormData) {
  const supabase = await createClient();
  const submissionId = formData.get("submission_id") as string;
  const assignmentId = formData.get("assignment_id") as string;

  // Mark submitted
  await supabase
    .from("submissions")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", submissionId);

  // Resolve elapsed seconds: use timer if done, else fall back to suggested_minutes
  const sub = await getSubmission(supabase, submissionId);
  const { data: assignment } = await supabase
    .from("assignments")
    .select("enrollment_id, suggested_minutes")
    .eq("id", assignmentId)
    .single();

  if (!assignment?.enrollment_id) {
    revalidatePath(formData.get("redirect_path") as string);
    revalidatePath("/dashboard/manage");
    return;
  }

  const elapsed = (sub?.elapsed_seconds ?? 0) > 0
    ? sub!.elapsed_seconds
    : (assignment.suggested_minutes ?? 0) * 60;

  if (elapsed <= 0) {
    revalidatePath(formData.get("redirect_path") as string);
    revalidatePath("/dashboard/manage");
    return;
  }

  // Upsert practice_log for today
  const today = getBangkokDateStr();
  const { data: existing } = await supabase
    .from("practice_logs")
    .select("id, elapsed_seconds")
    .eq("enrollment_id", assignment.enrollment_id)
    .eq("log_date", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("practice_logs")
      .update({ status: "done", elapsed_seconds: (existing.elapsed_seconds ?? 0) + elapsed, running_since: null })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("practice_logs")
      .insert({ enrollment_id: assignment.enrollment_id, log_date: today, status: "done", elapsed_seconds: elapsed });
  }

  revalidatePath(formData.get("redirect_path") as string);
  revalidatePath("/dashboard/manage");
  revalidatePath("/dashboard");
}
