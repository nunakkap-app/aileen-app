"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function cancelOccurrence(scheduleId: string, date: string) {
  const supabase = await createClient();
  await supabase.from("practice_exceptions").insert({
    practice_schedule_id: scheduleId,
    exception_date: date,
  });
  revalidatePath("/dashboard/manage");
}

async function getOrCreateLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  enrollmentId: string,
  date: string,
) {
  const { data: existing } = await supabase
    .from("practice_logs")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("log_date", date)
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await supabase
    .from("practice_logs")
    .insert({ enrollment_id: enrollmentId, log_date: date })
    .select("*")
    .single();

  return created;
}

export async function startTimer(formData: FormData) {
  const supabase = await createClient();
  const enrollmentId = formData.get("enrollment_id") as string;
  const date = formData.get("date") as string;

  const log = await getOrCreateLog(supabase, enrollmentId, date);
  if (!log) return;

  await supabase
    .from("practice_logs")
    .update({ status: "running", running_since: new Date().toISOString() })
    .eq("id", log.id);

  revalidatePath(`/dashboard/session/${enrollmentId}/${date}`);
}

export async function resumeTimer(formData: FormData) {
  const supabase = await createClient();
  const logId = formData.get("log_id") as string;

  await supabase
    .from("practice_logs")
    .update({ status: "running", running_since: new Date().toISOString() })
    .eq("id", logId);

  revalidatePath(formData.get("redirect_path") as string);
}

export async function pauseTimer(formData: FormData) {
  const supabase = await createClient();
  const logId = formData.get("log_id") as string;

  const { data: log } = await supabase.from("practice_logs").select("*").eq("id", logId).single();
  if (!log) return;

  const extra = log.running_since
    ? Math.floor((Date.now() - new Date(log.running_since).getTime()) / 1000)
    : 0;

  await supabase
    .from("practice_logs")
    .update({ status: "paused", elapsed_seconds: log.elapsed_seconds + extra, running_since: null })
    .eq("id", logId);

  revalidatePath(formData.get("redirect_path") as string);
}

export async function stopTimer(formData: FormData) {
  const supabase = await createClient();
  const logId = formData.get("log_id") as string;

  const { data: log } = await supabase.from("practice_logs").select("*").eq("id", logId).single();
  if (!log) return;

  const extra = log.running_since
    ? Math.floor((Date.now() - new Date(log.running_since).getTime()) / 1000)
    : 0;

  await supabase
    .from("practice_logs")
    .update({ status: "done", elapsed_seconds: log.elapsed_seconds + extra, running_since: null })
    .eq("id", logId);

  revalidatePath(formData.get("redirect_path") as string);
}

export async function completeLesson(formData: FormData) {
  const supabase = await createClient();
  const enrollmentId = formData.get("enrollment_id") as string;
  const date = formData.get("date") as string;
  const durationSeconds = Number(formData.get("duration_seconds"));

  const log = await getOrCreateLog(supabase, enrollmentId, date);
  if (!log) return;

  await supabase
    .from("practice_logs")
    .update({ status: "done", elapsed_seconds: durationSeconds, running_since: null })
    .eq("id", log.id);

  revalidatePath(`/dashboard/session/${enrollmentId}/${date}`);
}

export async function saveNote(formData: FormData) {
  const supabase = await createClient();
  const logId = formData.get("log_id") as string;

  await supabase
    .from("practice_logs")
    .update({ note: (formData.get("note") as string) || null })
    .eq("id", logId);

  revalidatePath(formData.get("redirect_path") as string);
}

export async function uploadMedia(formData: FormData) {
  const supabase = await createClient();
  const logId = formData.get("log_id") as string;
  const file = formData.get("file") as File;

  if (!file || file.size === 0) return;

  const path = `${logId}/${Date.now()}-${file.name}`;
  await supabase.storage.from("practice-media").upload(path, file);
  const { data } = supabase.storage.from("practice-media").getPublicUrl(path);

  await supabase.from("practice_logs").update({ media_url: data.publicUrl }).eq("id", logId);

  revalidatePath(formData.get("redirect_path") as string);
}
