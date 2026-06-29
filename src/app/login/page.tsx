import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-bold">เข้าสู่ระบบ</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <form action={login} className="flex flex-col gap-4">
        <input
          name="email"
          type="email"
          placeholder="อีเมล"
          required
          className="rounded border px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="รหัสผ่าน"
          required
          className="rounded border px-3 py-2"
        />
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">
          เข้าสู่ระบบ
        </button>
      </form>
      <p className="mt-4 text-sm">
        ยังไม่มีบัญชี? <a className="underline" href="/signup">สมัครสมาชิก</a>
      </p>
    </div>
  );
}
