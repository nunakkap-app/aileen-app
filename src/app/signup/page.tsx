import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; role?: string }>;
}) {
  const { error, next, role: roleParam } = await searchParams;
  const defaultRole = roleParam === "coach" ? "coach" : "parent";
  const isCoachInvite = !!next?.includes("/join/coach/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Aileen</h1>
        <p className="mb-6 text-sm text-slate-500">
          {isCoachInvite ? "สมัครสมาชิกเพื่อรับนักเรียน" : "สมัครสมาชิก"}
        </p>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {isCoachInvite && (
          <div className="mb-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            คุณได้รับเชิญเป็นครู — กรอกข้อมูลด้านล่างเพื่อสร้างบัญชี
          </div>
        )}
        <form action={signup} className="flex flex-col gap-3">
          {next && <input type="hidden" name="next" value={next} />}
          <input
            name="full_name"
            placeholder="ชื่อ-นามสกุล"
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
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
            placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
            required
            minLength={6}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {isCoachInvite ? (
            <input type="hidden" name="role" value="coach" />
          ) : (
            <fieldset className="flex gap-4 text-sm text-slate-600">
              <label className="flex items-center gap-2">
                <input type="radio" name="role" value="parent" defaultChecked={defaultRole === "parent"} /> ผู้ปกครอง
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="role" value="coach" defaultChecked={defaultRole === "coach"} /> ครู/โค้ช
              </label>
            </fieldset>
          )}
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            สมัครสมาชิก
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          มีบัญชีแล้ว?{" "}
          <a
            className="font-medium text-indigo-600"
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          >
            เข้าสู่ระบบ
          </a>
        </p>
      </div>
    </div>
  );
}
