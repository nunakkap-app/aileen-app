"use client";

import { useState } from "react";
import { updateAssignmentFromSession, deleteAssignment } from "@/app/dashboard/session/actions";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] as const;

export function HomeworkEditActions({
  assignmentId,
  enrollmentId,
  title,
  description,
  referenceUrl,
  referenceText,
  suggestedMinutes,
  suggestedWeekdays,
  redirectPath,
}: {
  assignmentId: string;
  enrollmentId: string;
  title: string;
  description: string | null;
  referenceUrl: string | null;
  referenceText: string | null;
  suggestedMinutes: number | null;
  suggestedWeekdays: number[] | null;
  redirectPath: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return (
      <form
        action={async (fd) => { await updateAssignmentFromSession(fd); setEditing(false); }}
        className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/30 p-4"
      >
        <input type="hidden" name="assignment_id" value={assignmentId} />
        <input type="hidden" name="enrollment_id" value={enrollmentId} />
        <input type="hidden" name="date" value="" />
        <input type="hidden" name="redirect_path" value={redirectPath} />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">ชื่อการบ้าน</label>
          <input
            name="title"
            required
            autoFocus
            defaultValue={title}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">รายละเอียด</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={description ?? ""}
            placeholder="รายละเอียด (ถ้ามี)"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Link อ้างอิง</label>
          <input
            name="reference_url"
            type="url"
            defaultValue={referenceUrl ?? ""}
            placeholder="https://..."
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">เอกสาร / คำอธิบาย reference</label>
          <textarea
            name="reference_text"
            rows={2}
            defaultValue={referenceText ?? ""}
            placeholder="เอกสาร / คำอธิบาย"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-500">นาทีโดยประมาณ</label>
          <input
            name="suggested_minutes"
            type="number"
            min="1"
            defaultValue={suggestedMinutes ?? ""}
            placeholder="25"
            className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-500">ฝึกทุกวัน</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((label, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  name="suggested_weekdays"
                  value={i}
                  defaultChecked={suggestedWeekdays?.includes(i) ?? false}
                  className="rounded border-slate-300"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            บันทึก
          </button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">
            ยกเลิก
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
      >
        แก้ไข
      </button>

      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-500">ยืนยันลบ?</span>
          <form action={deleteAssignment}>
            <input type="hidden" name="assignment_id" value={assignmentId} />
            <input type="hidden" name="redirect_path" value="/dashboard/manage" />
            <button type="submit" className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">
              ลบ
            </button>
          </form>
          <button type="button" onClick={() => setConfirming(false)} className="text-xs text-slate-400 hover:text-slate-600">
            ยกเลิก
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-red-400 hover:border-red-200 hover:bg-red-50"
        >
          ลบ
        </button>
      )}
    </div>
  );
}
