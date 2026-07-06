import { login } from "./actions";
import { getLocale, getDictionary } from "@/lib/locale";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const locale = await getLocale();
  const d = await getDictionary(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Aileen</h1>
        <p className="mb-6 text-sm text-slate-500">{d.login.title}</p>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <form action={login} className="flex flex-col gap-3">
          {next && <input type="hidden" name="next" value={next} />}
          <input
            name="email"
            type="text"
            placeholder={d.login.email}
            required
            autoComplete="username"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder={d.login.password}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            {d.login.submit}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          {d.login.noAccount} <a className="font-medium text-indigo-600" href="/signup">{d.login.signup}</a>
        </p>
      </div>
    </div>
  );
}
