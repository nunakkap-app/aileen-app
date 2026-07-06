"use client";

import { useState } from "react";
import {
  practiceHomeworkToday,
  submitHomeworkFromSession,
  closeAssignment,
  createAssignmentFromSession,
  updateAssignmentFromSession,
} from "@/app/dashboard/session/actions";

export type AssignmentItem = {
  id: string;
  title: string;
  description?: string | null;
  submissions: { id: string; status: string; last_practiced_date: string | null }[] | null;
};

function AddHomeworkForm({ enrollmentId, date, onClose }: { enrollmentId: string; date: string; onClose: () => void }) {
  return (
    <form
      action={async (fd) => { await createAssignmentFromSession(fd); onClose(); }}
      className="flex flex-col gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3"
    >
      <input type="hidden" name="enrollment_id" value={enrollmentId} />
      <input type="hidden" name="date" value={date} />
      <input
        name="title"
        required
        autoFocus
        placeholder="ชื่อการบ้าน"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <input
        name="description"
        placeholder="รายละเอียด (ถ้ามี)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
          เพิ่มการบ้าน
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs text-slate-500 hover:bg-slate-100">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function EditHomeworkForm({
  assignment,
  enrollmentId,
  date,
  onClose,
}: {
  assignment: AssignmentItem;
  enrollmentId: string;
  date: string;
  onClose: () => void;
}) {
  return (
    <form
      action={async (fd) => { await updateAssignmentFromSession(fd); onClose(); }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="enrollment_id" value={enrollmentId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="assignment_id" value={assignment.id} />
      <input
        name="title"
        required
        autoFocus
        defaultValue={assignment.title}
        className="rounded-lg border border-indigo-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <input
        name="description"
        defaultValue={assignment.description ?? ""}
        placeholder="รายละเอียด (ถ้ามี)"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
          บันทึก
        </button>
        <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

export function HomeworkSection({
  assignments,
  enrollmentId,
  date,
}: {
  assignments: AssignmentItem[];
  enrollmentId: string;
  date: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">การบ้าน</h2>
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-lg border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
          >
            + เพิ่มการบ้าน
          </button>
        )}
      </div>

      {assignments.length > 0 && (
        <ul className="mb-3 flex flex-col gap-3">
          {assignments.map((a) => {
            const sub = Array.isArray(a.submissions) ? a.submissions[0] : a.submissions;
            const submitted = sub?.status === "submitted";
            const practicedToday = sub?.last_practiced_date === date;
            const isEditing = editingId === a.id;

            return (
              <li key={a.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 px-3 py-3">
                {isEditing ? (
                  <EditHomeworkForm
                    assignment={a}
                    enrollmentId={enrollmentId}
                    date={date}
                    onClose={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${submitted ? "text-slate-400 line-through" : "text-slate-800"}`}>
                          {a.title}
                        </p>
                        {a.description && (
                          <p className="mt-0.5 text-xs text-slate-400">{a.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingId(a.id)}
                        className="shrink-0 rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        แก้ไข
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Practiced today */}
                      <form action={practiceHomeworkToday}>
                        <input type="hidden" name="assignment_id" value={a.id} />
                        <input type="hidden" name="enrollment_id" value={enrollmentId} />
                        <input type="hidden" name="date" value={date} />
                        <input type="hidden" name="uncheck" value={practicedToday ? "1" : "0"} />
                        <button
                          type="submit"
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            practicedToday
                              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[10px] ${
                            practicedToday ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300"
                          }`}>
                            {practicedToday ? "✓" : ""}
                          </span>
                          ซ้อมไปเรื่อยๆ
                        </button>
                      </form>

                      {/* Submit */}
                      {submitted ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">ส่งแล้ว ✓</span>
                      ) : (
                        <form action={submitHomeworkFromSession}>
                          <input type="hidden" name="assignment_id" value={a.id} />
                          <input type="hidden" name="enrollment_id" value={enrollmentId} />
                          <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                            ส่งการบ้าน
                          </button>
                        </form>
                      )}

                      {/* Close */}
                      <form action={closeAssignment}>
                        <input type="hidden" name="assignment_id" value={a.id} />
                        <input type="hidden" name="enrollment_id" value={enrollmentId} />
                        <input type="hidden" name="date" value={date} />
                        <button type="submit" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 hover:border-red-200 hover:text-red-500">
                          จบการบ้านนี้ ไม่ต้องทำแล้ว
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showAdd ? (
        <AddHomeworkForm enrollmentId={enrollmentId} date={date} onClose={() => setShowAdd(false)} />
      ) : assignments.length === 0 ? (
        <p className="text-xs text-slate-400">ยังไม่มีการบ้าน</p>
      ) : null}
    </div>
  );
}
