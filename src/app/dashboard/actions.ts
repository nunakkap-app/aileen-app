"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addChild(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from("children").insert({
    parent_id: auth.user.id,
    full_name: formData.get("full_name") as string,
    birthdate: (formData.get("birthdate") as string) || null,
  });

  revalidatePath("/dashboard");
}

export async function inviteCoach(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from("invitations").insert({
    parent_id: auth.user.id,
    child_id: formData.get("child_id") as string,
    coach_email: formData.get("coach_email") as string,
    category: formData.get("category") as string,
    subject_name: formData.get("subject_name") as string,
    note: (formData.get("note") as string) || null,
  });

  revalidatePath("/dashboard");
}

export async function selfCoach(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase
    .from("user_roles")
    .upsert({ user_id: auth.user.id, role: "coach" }, { onConflict: "user_id,role" });

  const category = formData.get("category") as string;
  const subjectName = formData.get("subject_name") as string;
  const childId = formData.get("child_id") as string;

  let { data: subject } = await supabase
    .from("subjects")
    .select("id")
    .eq("coach_id", auth.user.id)
    .eq("name", subjectName)
    .eq("category", category)
    .maybeSingle();

  if (!subject) {
    const { data: created } = await supabase
      .from("subjects")
      .insert({ coach_id: auth.user.id, name: subjectName, category })
      .select("id")
      .single();
    subject = created;
  }

  if (subject) {
    await supabase.from("enrollments").insert({ child_id: childId, subject_id: subject.id });
  }

  revalidatePath("/dashboard");
}

export async function respondInvitation(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const invitationId = formData.get("invitation_id") as string;
  const decision = formData.get("decision") as "accepted" | "declined";

  const { data: invitation } = await supabase
    .from("invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (!invitation) return;

  if (decision === "accepted") {
    let { data: subject } = await supabase
      .from("subjects")
      .select("id")
      .eq("coach_id", auth.user.id)
      .eq("name", invitation.subject_name)
      .eq("category", invitation.category)
      .maybeSingle();

    if (!subject) {
      const { data: created } = await supabase
        .from("subjects")
        .insert({
          coach_id: auth.user.id,
          name: invitation.subject_name,
          category: invitation.category,
        })
        .select("id")
        .single();
      subject = created;
    }

    if (subject) {
      await supabase.from("enrollments").insert({
        child_id: invitation.child_id,
        subject_id: subject.id,
      });
    }
  }

  await supabase
    .from("invitations")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  revalidatePath("/dashboard");
}
