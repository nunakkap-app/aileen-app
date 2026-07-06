"use client";

import { useState } from "react";
import {
  createGoal,
  deleteGoal,
  markGoalAchieved,
  assignGoalCoach,
  addMilestone,
  toggleMilestone,
  deleteMilestone,
} from "@/app/dashboard/goals/actions";

export type CoachEnrollment = { id: string; coachName: string };

export type Milestone = {
  id: string;
  title: string;
  target_date: string | null;
  achieved_at: string | null;
  sort_order: number;
};

export type Goal = {
  id: string;
  enrollment_id: string;
  responsible_enrollment_id: string | null;
  title: string;
  goal_type: string;
  expectation: string | null;
  target_date: string | null;
  status: string;
  milestones: Milestone[];
};

export type SubjectGroup = {
  subjectName: string;
  category: string;
  enrollments: CoachEnrollment[];
  goals: Goal[];
};

const GOAL_TYPES = ["สอบ", "แข่ง", "โชว์", "อื่นๆ"];
const TYPE_COLOR: Record<string, string> = {
  สอบ: "bg-blue-100 text-blue-700",
  แข่ง: "bg-red-100 text-red-700",
  โชว์: "bg-amber-100 text-amber-700",
  อื่นๆ: "bg-slate-100 text-slate-600",
};

function daysLeft(targetDate: string): { label: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate + "T00:00:00");
  const days = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: `เลยมาแล้ว ${-days} วัน`, color: "text-red-500" };
  if (days === 0) return { label: "วันนี้!", color: "text-red-600 font-bold" };
  if (days <= 7) return { label: `อีก ${days} วัน`, color: "text-orange-500 font-medium" };
  if (days <= 30) return { label: `อีก ${days} วัน`, color: "text-amber-600" };
  return { label: `อีก ${days} วัน`, color: "text-slate-500" };
}

function AddGoalForm({
  enrollments,
  onClose,
}: {
  enrollments: CoachEnrollment[];
  onClose: () => void;
}) {
  const [goalType, setGoalType] = useState("อื่นๆ");
  const defaultEnrollmentId = enrollments[0]?.id ?? "";

  return (
    <form
      action={async (fd) => { await createGoal(fd); onClose(); }}
      className="mt-3 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
    >
      <input type="hidden" name="enrollment_id" value={defaultEnrollmentId} />

      {/* Goal type */}
      <div className="flex flex-wrap gap-2">
        {GOAL_TYPES.map((t) => (
          <label
            key={t}
            className={`flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              goalType === t ? TYPE_COLOR[t] : "border border-slate-200 bg-white text-slate-500"
            }`}
          >
            <input type="radio" name="goal_type" value={t} checked={goalType === t} onChange={() => setGoalType(t)} className="hidden" />
            {t}
          </label>
        ))}
      </div>

      <input
        name="title"
        required
        placeholder="ชื่อเป้าหมาย เช่น สอบ ABRSM Grade 5"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <textarea
        name="expectation"
        rows={2}
        placeholder="ความคาดหวัง เช่น ผ่านด้วยคะแนน Merit ขึ้นไป"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">วันเป้าหมาย</label>
          <input
            name="target_date"
            type="date"
            required
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {enrollments.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">ครูที่ดูแล</label>
            <select
              name="responsible_enrollment_id"
              defaultValue={defaultEnrollmentId}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {enrollments.map((e) => (
                <option key={e.id} value={e.id}>{e.coachName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
          เพิ่มเป้าหมาย
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function AddMilestoneForm({ goalId, onClose }: { goalId: string; onClose: () => void }) {
  return (
    <form
      action={async (fd) => { await addMilestone(fd); onClose(); }}
      className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2.5"
    >
      <input type="hidden" name="goal_id" value={goalId} />
      <input
        name="title"
        required
        placeholder="ชื่อ step"
        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
      <input
        name="target_date"
        type="date"
        className="rounded border border-slate-300 px-2 py-1 text-xs"
      />
      <button type="submit" className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700">เพิ่ม</button>
      <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">ยกเลิก</button>
    </form>
  );
}

function GoalCard({
  goal,
  enrollments,
}: {
  goal: Goal;
  enrollments: CoachEnrollment[];
}) {
  const [showAddStep, setShowAddStep] = useState(false);
  const done = goal.milestones.filter((m) => m.achieved_at).length;
  const total = goal.milestones.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const dl = goal.target_date ? daysLeft(goal.target_date) : null;
  const isAchieved = goal.status === "achieved";

  const responsibleCoach = enrollments.find((e) => e.id === goal.responsible_enrollment_id);

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${isAchieved ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLOR[goal.goal_type] ?? TYPE_COLOR["อื่นๆ"]}`}>
            {goal.goal_type}
          </span>
          <p className={`text-sm font-semibold ${isAchieved ? "text-emerald-700 line-through" : "text-slate-900"}`}>
            {isAchieved && "✓ "}{goal.title}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {!isAchieved && (
            <form action={markGoalAchieved}>
              <input type="hidden" name="id" value={goal.id} />
              <button type="submit" title="บรรลุเป้าหมาย" className="rounded px-1.5 py-0.5 text-xs text-emerald-600 hover:bg-emerald-100">✓</button>
            </form>
          )}
          <form action={deleteGoal}>
            <input type="hidden" name="id" value={goal.id} />
            <button type="submit" title="ลบ" className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:text-red-500">×</button>
          </form>
        </div>
      </div>

      {/* Expectation */}
      {goal.expectation && (
        <p className="mt-1.5 text-xs text-slate-500">
          <span className="font-medium text-slate-600">คาดหวัง:</span> {goal.expectation}
        </p>
      )}

      {/* Date + countdown */}
      {dl && goal.target_date && (
        <p className={`mt-1 text-xs ${dl.color}`}>
          {new Date(goal.target_date + "T00:00:00").toLocaleDateString("th-TH", { dateStyle: "long" })}
          {" · "}{dl.label}
        </p>
      )}

      {/* Coach assignment */}
      {enrollments.length > 1 && !isAchieved && (
        <form action={assignGoalCoach} className="mt-2 flex items-center gap-2">
          <input type="hidden" name="goal_id" value={goal.id} />
          <span className="text-xs text-slate-400">ครูที่ดูแล:</span>
          <select
            name="enrollment_id"
            defaultValue={goal.responsible_enrollment_id ?? ""}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          >
            <option value="">— ยังไม่ระบุ —</option>
            {enrollments.map((e) => (
              <option key={e.id} value={e.id}>{e.coachName}</option>
            ))}
          </select>
        </form>
      )}

      {enrollments.length === 1 && responsibleCoach && (
        <p className="mt-1.5 text-xs text-slate-400">ครูที่ดูแล: <span className="text-slate-600">{responsibleCoach.coachName}</span></p>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Steps {done}/{total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Milestones */}
      {goal.milestones.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {goal.milestones.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-2">
              <form action={toggleMilestone} className="flex flex-1 items-start gap-2">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="achieved" value={m.achieved_at ? "1" : "0"} />
                <button
                  type="submit"
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                    m.achieved_at
                      ? "border-indigo-400 bg-indigo-400 text-white"
                      : "border-slate-300 bg-white text-transparent hover:border-indigo-300"
                  }`}
                >
                  ✓
                </button>
                <span className={`text-xs leading-5 ${m.achieved_at ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  {m.title}
                  {m.target_date && (
                    <span className="ml-1.5 text-slate-400">
                      {new Date(m.target_date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </span>
              </form>
              <form action={deleteMilestone}>
                <input type="hidden" name="id" value={m.id} />
                <button type="submit" className="mt-0.5 text-xs text-slate-300 hover:text-red-400">×</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Add step */}
      {!isAchieved && (
        <div className="mt-2">
          {showAddStep ? (
            <AddMilestoneForm goalId={goal.id} onClose={() => setShowAddStep(false)} />
          ) : (
            <button type="button" onClick={() => setShowAddStep(true)} className="mt-1 text-xs text-indigo-500 hover:underline">
              + เพิ่ม step
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function GoalBoard({ subjectGroups }: { subjectGroups: SubjectGroup[] }) {
  const [openAddFor, setOpenAddFor] = useState<string | null>(null);

  if (!subjectGroups.length) {
    return <p className="text-sm text-slate-400">ยังไม่มีกิจกรรม — ไปเพิ่มวิชาที่หน้าจัดการตารางก่อน</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {subjectGroups.map((group) => (
        <div key={group.subjectName}>
          {/* Subject header */}
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">{group.subjectName}</h3>
            {group.enrollments.length > 1 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {group.enrollments.length} ครู
              </span>
            )}
          </div>

          {/* Coach chips */}
          {group.enrollments.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {group.enrollments.map((e) => (
                <span key={e.id} className="rounded-full bg-indigo-50 px-3 py-0.5 text-xs text-indigo-700">
                  {e.coachName}
                </span>
              ))}
            </div>
          )}

          {/* Goals */}
          <div className="flex flex-col gap-3">
            {group.goals.map((g) => (
              <GoalCard key={g.id} goal={g} enrollments={group.enrollments} />
            ))}
            {group.goals.length === 0 && (
              <p className="text-xs text-slate-400">ยังไม่มีเป้าหมาย</p>
            )}
          </div>

          {/* Add goal */}
          {openAddFor === group.subjectName ? (
            <AddGoalForm enrollments={group.enrollments} onClose={() => setOpenAddFor(null)} />
          ) : (
            <button
              type="button"
              onClick={() => setOpenAddFor(group.subjectName)}
              className="mt-3 text-sm text-indigo-600 hover:underline"
            >
              + เพิ่มเป้าหมาย
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
