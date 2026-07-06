import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Aileen</h1>
        <p className="mb-6 text-sm text-slate-500">เข้าสู่ระบบ</p>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <form action={login} className="flex flex-col gap-3">
          {next && <input type="hidden" name="next" value={next} />}
          <input
            name="email"
            type="email"
            placeholder="อีเมล"
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="รหัสผ่าน"
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            เข้าสู่ระบบ
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          ยังไม่มีบัญชี? <a className="font-medium text-indigo-600" href="/signup">สมัครสมาชิก</a>
        </p>
      </div>
    </div>
  );
}
