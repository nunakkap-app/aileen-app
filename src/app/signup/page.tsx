import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-bold">สมัครสมาชิก</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <form action={signup} className="flex flex-col gap-4">
        <input
          name="full_name"
          placeholder="ชื่อ-นามสกุล"
          required
          className="rounded border px-3 py-2"
        />
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
          minLength={6}
          className="rounded border px-3 py-2"
        />
        <fieldset className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="parent" defaultChecked /> ผู้ปกครอง
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="coach" /> ครู/โค้ช
          </label>
        </fieldset>
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">
          สมัครสมาชิก
        </button>
      </form>
      <p className="mt-4 text-sm">
        มีบัญชีแล้ว? <a className="underline" href="/login">เข้าสู่ระบบ</a>
      </p>
    </div>
  );
}
