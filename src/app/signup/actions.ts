"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const role = formData.get("role") as "parent" | "coach";
  const next = (formData.get("next") as string) || "/dashboard";

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error || !data.user) {
    const nextParam = next !== "/dashboard" ? `&next=${encodeURIComponent(next)}` : "";
    const roleParam = role !== "parent" ? `&role=${role}` : "";
    redirect(`/signup?error=${encodeURIComponent(error?.message ?? "signup failed")}${nextParam}${roleParam}`);
  }

  await supabase.from("user_roles").insert({ user_id: data.user.id, role });

  redirect(next);
}
