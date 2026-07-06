"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { createChildAccount, resetChildPassword } from "@/app/dashboard/manage/child-account-actions";

type Props = {
  childId: string;
  childName: string;
  username: string | null;
};

function useChildOnline(childId: string): boolean {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("child-presence");

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ child_id: string }>();
        const isOnline = Object.values(state).some((presences) =>
          presences.some((p) => p.child_id === childId),
        );
        setOnline(isOnline);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId]);

  return online;
}

export function ChildAccountButton({ childId, childName, username }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isOnline = useChildOnline(childId);
  const hasAccount = !!username;

  async function handleSubmit(formData: FormData) {
    setError(null);
    const action = hasAccount ? resetChildPassword : createChildAccount;
    const result = await action(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => { setOpen(false); setSuccess(false); }, 1500);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {hasAccount && (
          <span
            title={isOnline ? "กำลัง online" : "offline"}
            className={`h-2 w-2 rounded-full transition-colors ${isOnline ? "bg-emerald-400 shadow-[0_0_4px_1px_rgba(52,211,153,0.6)]" : "bg-slate-300"}`}
          />
        )}
        <button
          type="button"
          onClick={() => { setOpen(true); setError(null); setSuccess(false); }}
          className={`rounded-lg border px-2.5 py-1 text-xs ${
            hasAccount
              ? "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
              : "border-indigo-200 text-indigo-500 hover:bg-indigo-50"
          }`}
        >
          {hasAccount ? `@${username}` : "+ สร้าง account"}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-base font-semibold text-slate-900">
              {hasAccount ? `บัญชีของ ${childName}` : `สร้าง account ให้ ${childName}`}
            </h3>
            {hasAccount && (
              <p className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                <span
                  className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-300"}`}
                />
                <span className="font-medium text-slate-700">@{username}</span>
                <span className={isOnline ? "text-emerald-600" : "text-slate-400"}>
                  {isOnline ? "• กำลัง online" : "• offline"}
                </span>
              </p>
            )}

            {success ? (
              <p className="py-4 text-center text-sm font-medium text-emerald-600">✓ สำเร็จ</p>
            ) : (
              <form action={handleSubmit} className="flex flex-col gap-3">
                <input type="hidden" name="child_id" value={childId} />

                {!hasAccount && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">username (ใช้ a-z 0-9 _)</label>
                    <input
                      name="username"
                      required
                      autoFocus
                      placeholder="เช่น aileen123"
                      pattern="[a-z0-9_]+"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">
                    {hasAccount ? "รหัสผ่านใหม่" : "รหัสผ่าน"}
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    {hasAccount ? "เปลี่ยนรหัสผ่าน" : "สร้าง account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
                  >
                    ปิด
                  </button>
                </div>
              </form>
            )}

            {hasAccount && (
              <p className="mt-4 border-t border-slate-100 pt-3 text-center text-xs text-slate-400">
                ลูกเข้าสู่ระบบที่{" "}
                <a href="/child-login" className="text-indigo-500 hover:underline">
                  /child-login
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
