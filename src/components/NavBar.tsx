import { logout } from "@/app/login/actions";

export function NavBar({ email }: { email: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <a href="/dashboard" className="text-lg font-bold tracking-tight text-slate-900">
          Aileen
        </a>
        <nav className="flex items-center gap-5 text-sm">
          <a href="/dashboard" className="text-slate-600 hover:text-slate-900">แดชบอร์ด</a>
          <a href="/dashboard/manage" className="text-slate-600 hover:text-slate-900">จัดการตาราง</a>
          <span className="hidden text-slate-400 sm:inline">{email}</span>
          <form action={logout}>
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50" type="submit">
              ออกจากระบบ
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
