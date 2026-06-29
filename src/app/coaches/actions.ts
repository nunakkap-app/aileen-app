"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveCoachProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const categories = formData.getAll("categories") as string[];

  await supabase.from("coach_profiles").upsert({
    coach_id: auth.user.id,
    headline: formData.get("headline") as string,
    bio: (formData.get("bio") as string) || null,
    categories,
    years_experience: formData.get("years_experience")
      ? Number(formData.get("years_experience"))
      : null,
    hourly_rate: formData.get("hourly_rate") ? Number(formData.get("hourly_rate")) : null,
    service_area: (formData.get("service_area") as string) || null,
    is_published: formData.get("is_published") === "on",
  });

  revalidatePath("/coaches");
  revalidatePath("/dashboard");
}

export async function sendRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from("requests").insert({
    parent_id: auth.user.id,
    child_id: formData.get("child_id") as string,
    coach_id: formData.get("coach_id") as string,
    category: formData.get("category") as string,
    subject_name: formData.get("subject_name") as string,
    note: (formData.get("note") as string) || null,
  });

  revalidatePath("/coaches");
  revalidatePath("/dashboard");
}

export async function respondRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const requestId = formData.get("request_id") as string;
  const decision = formData.get("decision") as "accepted" | "declined";

  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return;

  if (decision === "accepted") {
    let { data: subject } = await supabase
      .from("subjects")
      .select("id")
      .eq("coach_id", auth.user.id)
      .eq("name", request.subject_name)
      .eq("category", request.category)
      .maybeSingle();

    if (!subject) {
      const { data: created } = await supabase
        .from("subjects")
        .insert({
          coach_id: auth.user.id,
          name: request.subject_name,
          category: request.category,
        })
        .select("id")
        .single();
      subject = created;
    }

    if (subject) {
      await supabase.from("enrollments").insert({
        child_id: request.child_id,
        subject_id: subject.id,
      });
    }
  }

  await supabase
    .from("requests")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", requestId);

  revalidatePath("/dashboard");
}
