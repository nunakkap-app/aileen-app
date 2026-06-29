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

export async function addSubject(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from("subjects").insert({
    coach_id: auth.user.id,
    name: formData.get("name") as string,
    category: formData.get("category") as string,
  });

  revalidatePath("/dashboard");
}
