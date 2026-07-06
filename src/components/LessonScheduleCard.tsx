"use client";

import { useState } from "react";
import { addLessonSchedule, updateLessonSchedule, deleteLessonSchedule } from "@/app/dashboard/actions";

type LessonSchedule = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string | null;
  note: string | null;
  price_per_session: number | null;
  pricing_type: string | null;
  total_price: number | null;
  total_sessions: number | null;
};

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function calcDuration(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalMin = eh * 60 + em - (sh * 60 + sm);
  if (totalMin <= 0) return "";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h && m ? `${h}ชม. ${m}น.` : h ? `${h}ชม.` : `${m}น.`;
}

function PriceDisplay({ s }: { s: LessonSchedule }) {
  if (!s.price_per_session && !s.total_price) return null;
  if (s.pricing_type === "course" && s.total_price && s.total_sessions) {
    return (
      <span className="text-amber-600">
        Course ฿{s.total_price.toLocaleString()}/{s.total_sessions}ครั้ง
        {" → "}฿{s.price_per_session?.toLocaleString()}/ครั้ง
      </span>
    );
  }
  return <span className="text-amber-600">฿{s.price_per_session?.toLocaleString()}/ครั้ง</span>;
}

function PricingFields({
  pricingType,
  onTypeChange,
  defaults,
}: {
  pricingType: "per_session" | "course";
  onTypeChange: (t: "per_session" | "course") => void;
  defaults?: Partial<LessonSchedule>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 text-xs text-slate-600">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="pricing_type"
            value="per_session"
            checked={pricingType === "per_session"}
            onChange={() => onTypeChange("per_session")}
          />
          รายครั้ง
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="pricing_type"
            value="course"
            checked={pricingType === "course"}
            onChange={() => onTypeChange("course")}
          />
          ราย course
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {pricingType === "per_session" ? (
          <input
            name="price_per_session"
            type="number"
            min="0"
            defaultValue={defaults?.price_per_session ?? ""}
            placeholder="฿/ครั้ง"
            className="w-28 rounded border border-slate-300 px-2 py-1 text-xs"
          />
        ) : (
          <>
            <input
              name="total_price"
              type="number"
              min="0"
              defaultValue={defaults?.total_price ?? ""}
              placeholder="฿ รวมทั้ง course"
              required
              className="w-36 rounded border border-slate-300 px-2 py-1 text-xs"
            />
            <input
              name="total_sessions"
              type="number"
              min="1"
              defaultValue={defaults?.total_sessions ?? ""}
              placeholder="จำนวนครั้ง"
              required
              className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
            />
          </>
        )}
      </div>
    </div>
  );
}

function EditRow({
  s,
  onClose,
}: {
  s: LessonSchedule;
  onClose: () => void;
}) {
  const [pricingType, setPricingType] = useState<"per_session" | "course">(
    s.pricing_type === "course" ? "course" : "per_session"
  );

  return (
    <form
      action={async (fd) => {
        await updateLessonSchedule(fd);
        onClose();
      }}
      className="mt-2 flex flex-col gap-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3"
    >
      <input type="hidden" name="id" value={s.id} />
      <div className="flex flex-wrap gap-2">
        <select name="weekday" defaultValue={s.weekday} required className="rounded border border-slate-300 px-2 py-1 text-xs">
          {WEEKDAYS.map((d, i) => (
            <option key={i} value={i}>ทุก{d}</option>
          ))}
        </select>
        <TimeRangeWithDuration defaultStart={s.start_time} defaultEnd={s.end_time} />
        <input name="start_date" type="date" defaultValue={s.start_date} required className="rounded border border-slate-300 px-2 py-1 text-xs" />
        <input name="end_date" type="date" defaultValue={s.end_date ?? ""} className="rounded border border-slate-300 px-2 py-1 text-xs" />
        <input name="note" defaultValue={s.note ?? ""} placeholder="หมายเหตุ" className="rounded border border-slate-300 px-2 py-1 text-xs" />
      </div>
      <PricingFields pricingType={pricingType} onTypeChange={setPricingType} defaults={s} />
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700">
          บันทึก
        </button>
        <button type="button" onClick={onClose} className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function TimeRangeWithDuration({
  defaultStart,
  defaultEnd,
}: {
  defaultStart?: string;
  defaultEnd?: string;
}) {
  const [start, setStart] = useState(defaultStart ?? "");
  const [end, setEnd] = useState(defaultEnd ?? "");
  const duration = calcDuration(start, end);

  return (
    <div className="flex items-center gap-1">
      <input
        name="start_time"
        type="time"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        required
        className="rounded border border-slate-300 px-2 py-1 text-xs"
      />
      <span className="text-slate-400 text-xs">-</span>
      <input
        name="end_time"
        type="time"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        required
        className="rounded border border-slate-300 px-2 py-1 text-xs"
      />
      {duration && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
          {duration}
        </span>
      )}
    </div>
  );
}

function AddRow({ enrollmentId }: { enrollmentId: string }) {
  const [open, setOpen] = useState(false);
  const [pricingType, setPricingType] = useState<"per_session" | "course">("per_session");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-xs text-indigo-600 hover:underline"
      >
        + เพิ่มตาราง
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await addLessonSchedule(fd);
        setOpen(false);
        setPricingType("per_session");
      }}
      className="mt-2 flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-3"
    >
      <input type="hidden" name="enrollment_id" value={enrollmentId} />
      <div className="flex flex-wrap gap-2">
        <select name="weekday" required className="rounded border border-slate-300 px-2 py-1 text-xs">
          {WEEKDAYS.map((d, i) => (
            <option key={i} value={i}>ทุก{d}</option>
          ))}
        </select>
        <TimeRangeWithDuration />
        <input name="start_date" type="date" required className="rounded border border-slate-300 px-2 py-1 text-xs" />
        <input name="end_date" type="date" className="rounded border border-slate-300 px-2 py-1 text-xs" />
        <input name="note" placeholder="หมายเหตุ" className="rounded border border-slate-300 px-2 py-1 text-xs" />
      </div>
      <PricingFields pricingType={pricingType} onTypeChange={setPricingType} />
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700">
          เพิ่มตาราง
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

export function LessonScheduleCard({
  enrollmentId,
  lessonSchedules,
}: {
  enrollmentId: string;
  lessonSchedules: LessonSchedule[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div>
      {!lessonSchedules.length && (
        <p className="mb-1 text-xs text-slate-400">ยังไม่มีตาราง</p>
      )}
      <ul className="flex flex-col gap-1.5">
        {lessonSchedules.map((s) => {
          const duration = calcDuration(s.start_time, s.end_time);
          return (
            <li key={s.id}>
              {editingId === s.id ? (
                <EditRow s={s} onClose={() => setEditingId(null)} />
              ) : (
                <div className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-medium">ทุก{WEEKDAYS[s.weekday]}</span>
                    <span>{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span>
                    {duration && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium text-slate-600">{duration}</span>
                    )}
                    <PriceDisplay s={s} />
                    {s.note && <span className="text-slate-400">{s.note}</span>}
                    <span className="text-slate-400">เริ่ม {s.start_date}{s.end_date ? ` – ${s.end_date}` : ""}</span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(s.id)}
                      className="text-indigo-500 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <form action={deleteLessonSchedule}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="text-red-400 hover:text-red-600">ลบ</button>
                    </form>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <AddRow enrollmentId={enrollmentId} />
    </div>
  );
}
