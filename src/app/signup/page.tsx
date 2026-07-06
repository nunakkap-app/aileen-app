import { signup } from "./actions";
import { getLocale, getDictionary } from "@/lib/locale";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; role?: string }>;
}) {
  const { error, next, role: roleParam } = await searchParams;
  const defaultRole = roleParam === "coach" ? "coach" : "parent";
  const isCoachInvite = !!next?.includes("/join/coach/");

  const locale = await getLocale();
  const d = await getDictionary(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Aileen</h1>
        <p className="mb-6 text-sm text-slate-500">
          {isCoachInvite ? (locale === "th" ? "สมัครสมาชิกเพื่อรับนักเรียน" : "Sign up to accept a student") : d.signup.title}
        </p>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {isCoachInvite && (
          <div className="mb-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            {locale === "th" ? "คุณได้รับเชิญเป็นครู — กรอกข้อมูลด้านล่างเพื่อสร้างบัญชี" : "You have been invited as a coach — fill in the form below to create an account"}
          </div>
        )}
        <form action={signup} className="flex flex-col gap-3">
          {next && <input type="hidden" name="next" value={next} />}
          <input
            name="full_name"
            placeholder={d.signup.name}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder={d.signup.email}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder={d.signup.password}
            required
            minLength={6}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {isCoachInvite ? (
            <input type="hidden" name="role" value="coach" />
          ) : (
            <fieldset className="flex gap-4 text-sm text-slate-600">
              <label className="flex items-center gap-2">
                <input type="radio" name="role" value="parent" defaultChecked={defaultRole === "parent"} /> {locale === "th" ? "ผู้ปกครอง" : "Parent"}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="role" value="coach" defaultChecked={defaultRole === "coach"} /> {locale === "th" ? "ครู/โค้ช" : "Coach"}
              </label>
            </fieldset>
          )}
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            {d.signup.submit}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          {d.signup.hasAccount}{" "}
          <a
            className="font-medium text-indigo-600"
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          >
            {d.signup.login}
          </a>
        </p>
      </div>
    </div>
  );
}
