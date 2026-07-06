import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChildTimerUI } from "@/components/ChildTimerUI";
import { getLocale, getDictionary } from "@/lib/locale";

export default async function ChildTimerPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  if (auth.user.user_metadata?.is_child !== true) redirect("/dashboard");

  const locale = await getLocale();
  const d = await getDictionary(locale);

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, suggested_minutes, enrollment_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) redirect("/child");

  return (
    <ChildTimerUI
      assignmentId={assignment.id}
      enrollmentId={assignment.enrollment_id}
      title={assignment.title}
      description={assignment.description}
      suggestedMinutes={assignment.suggested_minutes}
      locale={locale}
      t={d.timer as Record<string, string>}
    />
  );
}
