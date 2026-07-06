"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createChildAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const childId = formData.get("child_id") as string;
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!username || !password) return { error: "กรุณากรอกข้อมูลให้ครบ" };
  if (password.length < 6) return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
  if (!/^[a-z0-9_]+$/.test(username)) return { error: "username ใช้ได้แค่ a-z 0-9 และ _" };

  // Verify caller is guardian of this child
  const { data: guardian } = await supabase
    .from("child_guardians")
    .select("child_id")
    .eq("child_id", childId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!guardian) return { error: "ไม่มีสิทธิ์จัดการลูกคนนี้" };

  // Check username not taken
  const { data: existing } = await supabase
    .from("children")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existing) return { error: `username "${username}" ถูกใช้แล้ว` };

  const admin = createAdminClient();
  const syntheticEmail = `child_${username}@aileen.internal`;

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
    user_metadata: { is_child: true, child_id: childId, username },
  });

  if (createError || !newUser.user) {
    return { error: createError?.message ?? "สร้าง account ไม่สำเร็จ" };
  }

  await supabase
    .from("children")
    .update({ child_user_id: newUser.user.id, username })
    .eq("id", childId);

  revalidatePath("/dashboard/manage");
  return { success: true };
}

export async function resetChildPassword(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const childId = formData.get("child_id") as string;
  const newPassword = formData.get("password") as string;
  if (newPassword.length < 6) return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };

  const { data: child } = await supabase
    .from("children")
    .select("child_user_id")
    .eq("id", childId)
    .maybeSingle();

  if (!child?.child_user_id) return { error: "ยังไม่มี account" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(child.child_user_id, { password: newPassword });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/manage");
  return { success: true };
}
