"use client";

import { useActionState, useRef } from "react";
import { generateCoachInviteLink } from "@/app/dashboard/actions";

export function CoachInviteButton({
  enrollmentId,
  coachName,
}: {
  enrollmentId: string;
  coachName: string;
}) {
  const [link, formAction, isPending] = useActionState(generateCoachInviteLink, null);
  const inputRef = useRef<HTMLInputElement>(null);

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link).catch(() => {
      inputRef.current?.select();
      document.execCommand("copy");
    });
  }

  return (
    <div className="mt-2">
      {!link ? (
        <form action={formAction}>
          <input type="hidden" name="enrollment_id" value={enrollmentId} />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline disabled:opacity-50"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {isPending ? "กำลังสร้าง..." : `ส่ง link ให้ครู${coachName ? ` ${coachName}` : ""}`}
          </button>
        </form>
      ) : (
        <div className="mt-1 rounded-lg border border-indigo-200 bg-indigo-50 p-2">
          <p className="mb-1 text-xs font-medium text-indigo-700">
            ส่ง link นี้ให้ครู — เปิดลิงก์แล้ว login เพื่อรับนักเรียน
          </p>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              readOnly
              value={link}
              className="flex-1 rounded border border-indigo-200 bg-white px-2 py-1 text-xs text-indigo-800"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={copyLink}
              className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
            >
              คัดลอก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
