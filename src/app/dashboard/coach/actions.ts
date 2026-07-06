"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveSessionLog(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const enrollmentId = formData.get("enrollment_id") as string;
  const sessionDate = formData.get("session_date") as string;
  const summary = (formData.get("summary") as string) || null;
  const developmentNote = (formData.get("development_note") as string) || null;

  await supabase.from("coaching_session_logs").upsert(
    {
      enrollment_id: enrollmentId,
      session_date: sessionDate,
      summary,
      development_note: developmentNote,
    },
    { onConflict: "enrollment_id,session_date" },
  );

  revalidatePath("/dashboard/coach");
}

export async function addCoachComment(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from("submission_comments").insert({
    submission_id: formData.get("submission_id") as string,
    coach_id: auth.user.id,
    content: formData.get("content") as string,
  });

  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/manage");
}

export async function saveGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const enrollmentId = formData.get("enrollment_id") as string;
  const title = formData.get("title") as string;
  const targetDate = (formData.get("target_date") as string) || null;
  const description = (formData.get("description") as string) || null;

  await supabase.from("goals").insert({
    enrollment_id: enrollmentId,
    title,
    target_date: targetDate,
    description,
    created_by: auth.user.id,
  });

  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/child");
}

export async function achieveMilestone(formData: FormData) {
  const supabase = await createClient();
  const milestoneId = formData.get("milestone_id") as string;
  const today = new Date().toISOString().slice(0, 10);

  await supabase.from("goal_milestones").update({ achieved_at: today }).eq("id", milestoneId);

  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/child");
}
