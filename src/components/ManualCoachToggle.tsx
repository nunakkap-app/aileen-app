"use client";

import { useState } from "react";

export function ManualCoachToggle({ className }: { className: string }) {
  const [manual, setManual] = useState(false);

  return (
    <>
      {manual ? (
        <input
          name="coach_name"
          placeholder="ชื่อครู (ยังไม่มี user)"
          required
          className={className}
        />
      ) : (
        <input name="coach_email" type="email" placeholder="อีเมลครู/โค้ช" required className={className} />
      )}
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <input
          type="checkbox"
          name="manual"
          value="true"
          checked={manual}
          onChange={(e) => setManual(e.target.checked)}
        />
        ผปค.กรอกแทน (ครูยังไม่มี user)
      </label>
    </>
  );
}
