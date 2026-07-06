"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const enrollmentId = formData.get("enrollment_id") as string;
  const responsibleEnrollmentId = (formData.get("responsible_enrollment_id") as string) || enrollmentId;

  const { error } = await supabase.from("goals").insert({
    enrollment_id: enrollmentId,
    title: formData.get("title") as string,
    goal_type: (formData.get("goal_type") as string) || "อื่นๆ",
    expectation: (formData.get("expectation") as string) || null,
    target_date: (formData.get("target_date") as string) || null,
    responsible_enrollment_id: responsibleEnrollmentId,
    status: "active",
    created_by: auth.user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/goals");
}

export async function assignGoalCoach(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({ responsible_enrollment_id: formData.get("enrollment_id") as string })
    .eq("id", formData.get("goal_id") as string);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/goals");
}

export async function deleteGoal(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("goals").delete().eq("id", formData.get("id") as string);
  revalidatePath("/dashboard/goals");
}

export async function markGoalAchieved(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("goals")
    .update({ status: "achieved" })
    .eq("id", formData.get("id") as string);
  revalidatePath("/dashboard/goals");
}

export async function addMilestone(formData: FormData) {
  const supabase = await createClient();

  const goalId = formData.get("goal_id") as string;
  const { data: existing } = await supabase
    .from("goal_milestones")
    .select("sort_order")
    .eq("goal_id", goalId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("goal_milestones").insert({
    goal_id: goalId,
    title: formData.get("title") as string,
    target_date: (formData.get("target_date") as string) || null,
    sort_order: nextOrder,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/goals");
}

export async function toggleMilestone(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const achieved = formData.get("achieved") === "1";
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("goal_milestones")
    .update({ achieved_at: achieved ? null : today })
    .eq("id", id);
  revalidatePath("/dashboard/goals");
}

export async function deleteMilestone(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("goal_milestones").delete().eq("id", formData.get("id") as string);
  revalidatePath("/dashboard/goals");
}
