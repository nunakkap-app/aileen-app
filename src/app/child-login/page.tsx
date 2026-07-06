import { childLogin } from "./actions";

export default async function ChildLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Aileen</h1>
          <p className="mt-1 text-sm text-slate-500">เข้าสู่ระบบ (ลูก)</p>
        </div>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}
        <form action={childLogin} className="flex flex-col gap-3">
          <input
            name="username"
            placeholder="username"
            required
            autoComplete="username"
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <input
            name="password"
            type="password"
            placeholder="รหัสผ่าน"
            required
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            type="submit"
            className="mt-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            เข้าสู่ระบบ
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-400">
          ผู้ปกครอง/ครู?{" "}
          <a href="/login" className="text-indigo-600 hover:underline">
            เข้าสู่ระบบที่นี่
          </a>
        </p>
      </div>
    </div>
  );
}
