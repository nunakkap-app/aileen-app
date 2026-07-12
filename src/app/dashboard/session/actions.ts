"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function cancelOccurrence(scheduleId: string, date: string, kind: "lesson" | "practice" = "practice") {
  const supabase = await createClient();
  if (kind === "lesson") {
    const { error } = await supabase.from("lesson_exceptions").insert({
      lesson_schedule_id: scheduleId,
      exception_date: date,
    });
    if (error) throw new Error(`lesson_exceptions insert failed: ${error.message} (code: ${error.code})`);
  } else {
    const { error } = await supabase.from("practice_exceptions").insert({
      practice_schedule_id: scheduleId,
      exception_date: date,
    });
    if (error) throw new Error(`practice_exceptions insert failed: ${error.message} (code: ${error.code})`);
  }
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

export async function rescheduleSession(formData: FormData) {
  const supabase = await createClient();
  const enrollmentId = formData.get("enrollment_id") as string;
  const originalDate = formData.get("original_date") as string;
  const newDate = formData.get("new_date") as string;

  await supabase
    .from("session_overrides")
    .upsert({ enrollment_id: enrollmentId, original_date: originalDate, new_date: newDate }, { onConflict: "enrollment_id,original_date" });

  revalidatePath("/dashboard/manage");
}

export async function deleteSessionOverride(enrollmentId: string, originalDate: string) {
  const supabase = await createClient();
  await supabase
    .from("session_overrides")
    .delete()
    .eq("enrollment_id", enrollmentId)
    .eq("original_date", originalDate);

  revalidatePath("/dashboard/manage");
}

export async function overrideSessionTime(formData: FormData) {
  const supabase = await createClient();
  const enrollmentId = formData.get("enrollment_id") as string;
  const date = formData.get("date") as string;
  const startTime = (formData.get("start_time") as string) || null;
  const endTime = (formData.get("end_time") as string) || null;
  const hours = formData.get("hours") ? Number(formData.get("hours")) : null;

  await supabase
    .from("session_overrides")
    .upsert(
      { enrollment_id: enrollmentId, original_date: date, override_start_time: startTime, override_end_time: endTime, override_hours: hours },
      { onConflict: "enrollment_id,original_date" },
    );

  revalidatePath(`/dashboard/session/${enrollmentId}/${date}`);
  revalidatePath("/dashboard/manage");
}

export async function deleteAssignment(formData: FormData) {
  const supabase = await createClient();
  const assignmentId = formData.get("assignment_id") as string;
  const redirectTo = (formData.get("redirect_path") as string) || "/dashboard/manage";
  await supabase.from("assignments").delete().eq("id", assignmentId);
  revalidatePath("/dashboard/manage");
  redirect(redirectTo);
}

export async function createAssignmentFromSession(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const enrollmentId = formData.get("enrollment_id") as string;
  const date = formData.get("date") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  if (!title) return;

  await supabase.from("assignments").insert({
    enrollment_id: enrollmentId,
    title,
    description,
    coach_id: auth.user.id,
  });

  revalidatePath(`/dashboard/session/${enrollmentId}/${date}`);
}

export async function updateAssignmentFromSession(formData: FormData) {
  const supabase = await createClient();
  const enrollmentId = formData.get("enrollment_id") as string;
  const date = formData.get("date") as string;
  const assignmentId = formData.get("assignment_id") as string;
  const redirectPath = (formData.get("redirect_path") as string) || null;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const referenceUrl = (formData.get("reference_url") as string)?.trim() || null;
  const referenceText = (formData.get("reference_text") as string)?.trim() || null;
  const suggestedMinutes = formData.get("suggested_minutes") ? Number(formData.get("suggested_minutes")) : null;
  const weekdayValues = formData.getAll("suggested_weekdays").map(Number);
  const suggestedWeekdays = weekdayValues.length > 0 ? weekdayValues : null;
  if (!title) return;

  await supabase.from("assignments").update({
    title,
    description,
    reference_url: referenceUrl,
    reference_text: referenceText,
    suggested_minutes: suggestedMinutes,
    suggested_weekdays: suggestedWeekdays,
  }).eq("id", assignmentId);

  if (redirectPath) revalidatePath(redirectPath);
  if (enrollmentId && date) revalidatePath(`/dashboard/session/${enrollmentId}/${date}`);
  revalidatePath("/dashboard/manage");
}

export async function practiceHomeworkToday(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const assignmentId = formData.get("assignment_id") as string;
  const enrollmentId = formData.get("enrollment_id") as string;
  const date = formData.get("date") as string;
  const uncheck = formData.get("uncheck") === "1";
  const redirectPath = (formData.get("redirect_path") as string) || `/dashboard/session/${enrollmentId}/${date}`;

  const [{ data: existing }, { data: assignment }] = await Promise.all([
    supabase.from("submissions").select("id").eq("assignment_id", assignmentId).maybeSingle(),
    supabase.from("assignments").select("suggested_minutes").eq("id", assignmentId).single(),
  ]);

  if (existing) {
    await supabase
      .from("submissions")
      .update({ last_practiced_date: uncheck ? null : date })
      .eq("id", existing.id);
  } else if (!uncheck) {
    await supabase.from("submissions").insert({
      assignment_id: assignmentId,
      status: "practicing",
      last_practiced_date: date,
      submitted_by: auth.user.id,
    });
  }

  // Ticking "practiced today" also logs the suggested time; unticking removes it
  const suggestedSeconds = (assignment?.suggested_minutes ?? 0) * 60;
  if (enrollmentId && suggestedSeconds > 0) {
    const { data: log } = await supabase
      .from("practice_logs")
      .select("id, elapsed_seconds")
      .eq("enrollment_id", enrollmentId)
      .eq("log_date", date)
      .maybeSingle();

    if (uncheck) {
      if (log) {
        await supabase
          .from("practice_logs")
          .update({ elapsed_seconds: Math.max(0, (log.elapsed_seconds ?? 0) - suggestedSeconds) })
          .eq("id", log.id);
      }
    } else if (log) {
      await supabase
        .from("practice_logs")
        .update({ status: "done", elapsed_seconds: (log.elapsed_seconds ?? 0) + suggestedSeconds, log_type: "homework" })
        .eq("id", log.id);
    } else {
      await supabase
        .from("practice_logs")
        .insert({ enrollment_id: enrollmentId, log_date: date, status: "done", elapsed_seconds: suggestedSeconds, log_type: "homework" });
    }
  }

  revalidatePath(redirectPath);
  if (enrollmentId) revalidatePath(`/dashboard/session/${enrollmentId}/${date}`);
}

export async function closeAssignment(formData: FormData) {
  const supabase = await createClient();
  const enrollmentId = formData.get("enrollment_id") as string;
  const date = formData.get("date") as string;
  const redirectPath = (formData.get("redirect_path") as string) || null;
  await supabase
    .from("assignments")
    .update({ status: "closed" })
    .eq("id", formData.get("assignment_id") as string);
  if (enrollmentId && date) revalidatePath(`/dashboard/session/${enrollmentId}/${date}`);
  if (redirectPath) revalidatePath(redirectPath);
  revalidatePath("/dashboard/manage");
}

export async function submitHomeworkFromSession(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const assignmentId = formData.get("assignment_id") as string;
  const enrollmentId = formData.get("enrollment_id") as string;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // Get or create submission
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "submitted") {
      await supabase
        .from("submissions")
        .update({ status: "submitted", submitted_at: now, submitted_by: auth.user.id })
        .eq("id", existing.id);
    }
  } else {
    await supabase.from("submissions").insert({
      assignment_id: assignmentId,
      status: "submitted",
      submitted_at: now,
      submitted_by: auth.user.id,
    });
  }

  revalidatePath(`/dashboard/session/${enrollmentId}/${today}`);
  revalidatePath("/dashboard/manage");
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
