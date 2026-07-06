"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function addChild(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const { data: child } = await supabase
    .from("children")
    .insert({
      parent_id: auth.user.id,
      full_name: formData.get("full_name") as string,
      birthdate: (formData.get("birthdate") as string) || null,
    })
    .select("id")
    .single();

  if (child) {
    await supabase.from("child_guardians").insert({ child_id: child.id, user_id: auth.user.id, is_owner: true });
  }

  revalidatePath("/dashboard/manage");
}

export async function inviteParent(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from("parent_invitations").insert({
    child_id: formData.get("child_id") as string,
    invited_by: auth.user.id,
    invitee_email: formData.get("invitee_email") as string,
  });

  revalidatePath("/dashboard/manage");
}

export async function respondParentInvitation(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const invitationId = formData.get("invitation_id") as string;
  const decision = formData.get("decision") as "accepted" | "declined";

  const { data: invitation } = await supabase
    .from("parent_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (!invitation) return;

  if (decision === "accepted") {
    await supabase.from("child_guardians").insert({
      child_id: invitation.child_id,
      user_id: auth.user.id,
      is_owner: false,
    });
    await supabase
      .from("user_roles")
      .upsert({ user_id: auth.user.id, role: "parent" }, { onConflict: "user_id,role" });
  }

  await supabase
    .from("parent_invitations")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  revalidatePath("/dashboard/manage");
}

export async function inviteCoach(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const childId = formData.get("child_id") as string;
  const category = formData.get("category") as string;
  const subjectName = formData.get("subject_name") as string;
  const mode = (formData.get("mode") as string) || "practice";

  if (formData.get("manual") === "true") {
    // Coach doesn't have a user account yet — parent fills in on their behalf.
    const coachName = formData.get("coach_name") as string;

    await supabase
      .from("user_roles")
      .upsert({ user_id: auth.user.id, role: "coach" }, { onConflict: "user_id,role" });

    let { data: subject } = await supabase
      .from("subjects")
      .select("id")
      .eq("coach_id", auth.user.id)
      .eq("name", subjectName)
      .eq("category", category)
      .eq("placeholder_coach_name", coachName)
      .maybeSingle();

    if (!subject) {
      const { data: created } = await supabase
        .from("subjects")
        .insert({ coach_id: auth.user.id, name: subjectName, category, placeholder_coach_name: coachName })
        .select("id")
        .single();
      subject = created;
    }

    if (subject) {
      await supabase.from("enrollments").insert({ child_id: childId, subject_id: subject.id, mode });
    }

    revalidatePath("/dashboard/manage");
    return;
  }

  await supabase.from("invitations").insert({
    parent_id: auth.user.id,
    child_id: childId,
    coach_email: formData.get("coach_email") as string,
    category,
    subject_name: subjectName,
    note: (formData.get("note") as string) || null,
    mode,
  });

  revalidatePath("/dashboard/manage");
}

export async function addPracticeSchedule(formData: FormData) {
  const supabase = await createClient();

  const weekdays = formData.getAll("weekdays").map(Number);

  await supabase.from("practice_schedules").insert({
    enrollment_id: formData.get("enrollment_id") as string,
    weekdays,
    hours_per_session: Number(formData.get("hours_per_session")),
    start_date: formData.get("start_date") as string,
    end_date: (formData.get("end_date") as string) || null,
    note: (formData.get("note") as string) || null,
  });

  revalidatePath("/dashboard/manage");
}

export async function deletePracticeSchedule(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("practice_schedules").delete().eq("id", formData.get("id") as string);
  revalidatePath("/dashboard/manage");
}

function parseLessonPricing(formData: FormData) {
  const pricingType = (formData.get("pricing_type") as string) || "per_session";
  if (pricingType === "course") {
    const totalPrice = Number(formData.get("total_price") || 0);
    const totalSessions = Number(formData.get("total_sessions") || 1);
    return {
      pricing_type: "course",
      total_price: totalPrice,
      total_sessions: totalSessions,
      price_per_session: totalSessions > 0 ? Math.ceil(totalPrice / totalSessions) : null,
    };
  }
  const raw = formData.get("price_per_session") as string;
  return {
    pricing_type: "per_session",
    price_per_session: raw ? Number(raw) : null,
    total_price: null,
    total_sessions: null,
  };
}

export async function addLessonSchedule(formData: FormData) {
  const supabase = await createClient();
  const pricing = parseLessonPricing(formData);

  await supabase.from("lesson_schedules").insert({
    enrollment_id: formData.get("enrollment_id") as string,
    weekday: Number(formData.get("weekday")),
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    start_date: formData.get("start_date") as string,
    end_date: (formData.get("end_date") as string) || null,
    note: (formData.get("note") as string) || null,
    ...pricing,
  });

  revalidatePath("/dashboard/manage");
}

export async function updateLessonSchedule(formData: FormData) {
  const supabase = await createClient();
  const pricing = parseLessonPricing(formData);

  await supabase.from("lesson_schedules").update({
    weekday: Number(formData.get("weekday")),
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    start_date: formData.get("start_date") as string,
    end_date: (formData.get("end_date") as string) || null,
    note: (formData.get("note") as string) || null,
    ...pricing,
  }).eq("id", formData.get("id") as string);

  revalidatePath("/dashboard/manage");
}

export async function addEnrollmentPackage(formData: FormData) {
  const supabase = await createClient();

  const pricingType = formData.get("pricing_type") as "per_session" | "course";
  const minutesPerSession = formData.get("minutes_per_session") ? Number(formData.get("minutes_per_session")) : null;

  if (pricingType === "per_session") {
    await supabase.from("enrollment_packages").insert({
      enrollment_id: formData.get("enrollment_id") as string,
      pricing_type: "per_session",
      price_per_session: Number(formData.get("price_per_session")),
      minutes_per_session: minutesPerSession,
      total_price: null,
      total_sessions: null,
      start_date: (formData.get("start_date") as string) || new Date().toISOString().slice(0, 10),
      note: (formData.get("note") as string) || null,
    });
  } else {
    const totalPrice = Number(formData.get("total_price"));
    const totalSessions = Number(formData.get("total_sessions"));
    const pricePerSession = totalSessions > 0 ? Math.ceil(totalPrice / totalSessions) : null;
    await supabase.from("enrollment_packages").insert({
      enrollment_id: formData.get("enrollment_id") as string,
      pricing_type: "course",
      total_price: totalPrice,
      total_sessions: totalSessions,
      price_per_session: pricePerSession,
      minutes_per_session: minutesPerSession,
      start_date: (formData.get("start_date") as string) || new Date().toISOString().slice(0, 10),
      note: (formData.get("note") as string) || null,
    });
  }

  revalidatePath("/dashboard/manage");
}

export async function updateEnrollmentPackage(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const pricingType = formData.get("pricing_type") as "per_session" | "course";
  const minutesPerSession = formData.get("minutes_per_session") ? Number(formData.get("minutes_per_session")) : null;

  if (pricingType === "per_session") {
    await supabase.from("enrollment_packages").update({
      pricing_type: "per_session",
      price_per_session: Number(formData.get("price_per_session")),
      minutes_per_session: minutesPerSession,
      total_price: null,
      total_sessions: null,
      note: (formData.get("note") as string) || null,
    }).eq("id", id);
  } else {
    const totalPrice = Number(formData.get("total_price"));
    const totalSessions = Number(formData.get("total_sessions"));
    const pricePerSession = totalSessions > 0 ? Math.ceil(totalPrice / totalSessions) : null;
    await supabase.from("enrollment_packages").update({
      pricing_type: "course",
      total_price: totalPrice,
      total_sessions: totalSessions,
      price_per_session: pricePerSession,
      minutes_per_session: minutesPerSession,
      note: (formData.get("note") as string) || null,
    }).eq("id", id);
  }

  revalidatePath("/dashboard/manage");
}

export async function deleteEnrollmentPackage(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("enrollment_packages").delete().eq("id", formData.get("id") as string);
  revalidatePath("/dashboard/manage");
}

export async function deleteLessonSchedule(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("lesson_schedules").delete().eq("id", formData.get("id") as string);
  revalidatePath("/dashboard/manage");
}

export async function createAssignment(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const enrollmentId = formData.get("enrollment_id") as string;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("child_id")
    .eq("id", enrollmentId)
    .single();

  const suggestedWeekdays = formData.getAll("suggested_weekdays").map(Number);

  const { data: assignment } = await supabase
    .from("assignments")
    .insert({
      enrollment_id: enrollmentId,
      coach_id: auth.user.id,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      due_date: (formData.get("due_date") as string) || null,
      suggested_weekdays: suggestedWeekdays.length ? suggestedWeekdays : null,
      suggested_minutes: formData.get("suggested_minutes") ? Number(formData.get("suggested_minutes")) : null,
      reference_url: (formData.get("reference_url") as string) || null,
      reference_text: (formData.get("reference_text") as string) || null,
    })
    .select("id")
    .single();

  if (assignment && enrollment) {
    await supabase.from("submissions").insert({
      assignment_id: assignment.id,
      child_id: enrollment.child_id,
    });
  }

  revalidatePath("/dashboard/manage");
}

export async function submitHomework(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("submissions")
    .update({
      content: (formData.get("content") as string) || null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", formData.get("submission_id") as string);

  revalidatePath("/dashboard/manage");
}

export async function deleteEnrollment(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("enrollments").delete().eq("id", formData.get("id") as string);
  revalidatePath("/dashboard/manage");
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
    await supabase.from("enrollments").insert({
      child_id: childId,
      subject_id: subject.id,
      mode: (formData.get("mode") as string) || "practice",
    });
  }

  revalidatePath("/dashboard/manage");
}

export async function generateCoachInviteLink(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const enrollmentId = formData.get("enrollment_id") as string;

  // Reuse an existing unclaimed token for this enrollment
  const { data: existing } = await supabase
    .from("coach_claim_tokens")
    .select("id")
    .eq("enrollment_id", enrollmentId)
    .is("claimed_at", null)
    .maybeSingle();

  let tokenId = existing?.id;

  if (!tokenId) {
    const { data: created } = await supabase
      .from("coach_claim_tokens")
      .insert({ enrollment_id: enrollmentId, created_by: auth.user.id })
      .select("id")
      .single();
    tokenId = created?.id;
  }

  if (!tokenId) return null;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}/join/coach/${tokenId}`;
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
        mode: invitation.mode,
      });
    }
  }

  await supabase
    .from("invitations")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  revalidatePath("/dashboard/manage");
}
