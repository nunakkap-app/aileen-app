"use client";

import { useState } from "react";
import { subjectOptions, categoryLabel } from "@/lib/subjects";

export function SubjectPicker({
  defaultCategory = "sport",
  className = "",
}: {
  defaultCategory?: string;
  className?: string;
}) {
  const [category, setCategory] = useState(defaultCategory);

  return (
    <>
      <select
        name="category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={className}
      >
        {Object.entries(categoryLabel).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <select name="subject_name" required className={className}>
        {subjectOptions[category].map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </>
  );
}
