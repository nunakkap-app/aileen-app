"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const raw = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;
  const isUsername = !raw.includes("@");
  const email = isUsername ? `child_${raw}@aileen.internal` : raw;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  const next = (formData.get("next") as string) || "/dashboard";

  if (error) {
    const nextParam = next !== "/dashboard" ? `&next=${encodeURIComponent(next)}` : "";
    redirect(`/login?error=${encodeURIComponent(error.message)}${nextParam}`);
  }

  const isChild = data.user?.user_metadata?.is_child === true;
  redirect(isChild ? "/child" : next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
