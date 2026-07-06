"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function childLogin(formData: FormData) {
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!username || !password) {
    redirect(`/child-login?error=${encodeURIComponent("กรุณากรอก username และรหัสผ่าน")}`);
  }

  const syntheticEmail = `child_${username}@aileen.internal`;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  });

  if (error) {
    redirect(`/child-login?error=${encodeURIComponent("username หรือรหัสผ่านไม่ถูกต้อง")}`);
  }

  redirect("/child");
}
