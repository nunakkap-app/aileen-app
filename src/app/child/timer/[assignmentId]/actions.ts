"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function getBangkokDateStr() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function saveChildPractice(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const assignmentId = formData.get("assignment_id") as string;
  const enrollmentId = formData.get("enrollment_id") as string;
  const elapsedSeconds = Number(formData.get("elapsed_seconds") ?? 0);
  const today = getBangkokDateStr();

  // Save to practice_logs (shows in parent/coach report)
  const { data: existing } = await supabase
    .from("practice_logs")
    .select("id, elapsed_seconds")
    .eq("enrollment_id", enrollmentId)
    .eq("log_date", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("practice_logs")
      .update({ status: "done", elapsed_seconds: (existing.elapsed_seconds ?? 0) + elapsedSeconds, running_since: null, log_type: "homework" })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("practice_logs")
      .insert({ enrollment_id: enrollmentId, log_date: today, status: "done", elapsed_seconds: elapsedSeconds, log_type: "homework" });
  }

  // Mark assignment as practiced today
  const { data: sub } = await supabase
    .from("submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (sub) {
    await supabase.from("submissions").update({ last_practiced_date: today }).eq("id", sub.id);
  } else {
    await supabase.from("submissions").insert({
      assignment_id: assignmentId,
      status: "practicing",
      last_practiced_date: today,
      submitted_by: auth.user.id,
    });
  }

  redirect("/child");
}
