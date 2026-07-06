import { logout } from "@/app/login/actions";
import { LanguageToggle } from "@/components/LanguageToggle";

export function NavBar({
  email,
  isCoach,
  isParent,
  locale = "th",
  d,
}: {
  email: string;
  isCoach?: boolean;
  isParent?: boolean;
  locale?: "th" | "en";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d?: Record<string, any>;
}) {
  const nav = d?.nav ?? {
    dashboard: "แดชบอร์ด",
    todo: "To-do",
    manage: "จัดการตาราง",
    goals: "เป้าหมาย",
    students: "ลูกศิษย์",
    signout: "ออกจากระบบ",
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <a href="/dashboard" className="text-lg font-bold tracking-tight text-slate-900">
          Aileen
        </a>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/dashboard" className="text-slate-600 hover:text-slate-900">{nav.dashboard}</a>
          {isParent !== false && (
            <a href="/dashboard/todo" className="text-slate-600 hover:text-slate-900">{nav.todo}</a>
          )}
          {isParent !== false && (
            <a href="/dashboard/manage" className="text-slate-600 hover:text-slate-900">{nav.manage}</a>
          )}
          {isParent !== false && (
            <a href="/dashboard/goals" className="text-slate-600 hover:text-slate-900">{nav.goals}</a>
          )}
          {isCoach && (
            <a href="/dashboard/coach" className="text-slate-600 hover:text-slate-900">{nav.students}</a>
          )}
          <span className="hidden text-slate-400 sm:inline">{email}</span>
          <LanguageToggle locale={locale} />
          <form action={logout}>
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50" type="submit">
              {nav.signout}
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
