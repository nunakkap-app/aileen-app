"use client";

import { useRouter } from "next/navigation";

export function LanguageToggle({ locale }: { locale: "th" | "en" }) {
  const router = useRouter();

  function toggle() {
    const next = locale === "th" ? "en" : "th";
    document.cookie = `aileen_locale=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
    >
      {locale === "th" ? "EN" : "ไทย"}
    </button>
  );
}
