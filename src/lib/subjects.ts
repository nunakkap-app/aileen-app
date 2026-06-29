export const subjectOptions: Record<string, string[]> = {
  sport: [
    "ฟุตบอล",
    "บาสเกตบอล",
    "วอลเลย์บอล",
    "แบดมินตัน",
    "เทนนิส",
    "ว่ายน้ำ",
    "มวยไทย",
    "กอล์ฟ",
    "ยิมนาสติก",
    "กรีฑา",
    "เทควันโด",
    "ยูโด",
  ],
  music: [
    "เปียโน",
    "กีตาร์",
    "ไวโอลิน",
    "ขับร้อง",
    "กลอง",
    "ขลุ่ย",
    "อูคูเลเล่",
    "ดนตรีไทย",
    "ทฤษฎีดนตรี",
  ],
  academic: [
    "คณิตศาสตร์",
    "ภาษาอังกฤษ",
    "ภาษาไทย",
    "วิทยาศาสตร์",
    "ภาษาจีน",
    "ภาษาญี่ปุ่น",
    "ติว O-NET",
    "ติว A-Level",
    "การเขียนโปรแกรม",
  ],
};

export const categoryLabel: Record<string, string> = {
  sport: "กีฬา",
  music: "ดนตรี",
  academic: "วิชาการ",
};

// Each category gets its own color family. Lesson-vs-practice is shown separately
// as a small colored dot (see modeDotColor) so it doesn't compete with the category color.
export const categoryColor: Record<string, { bg: string; text: string; hoverBg: string; dot: string }> = {
  sport: { bg: "bg-emerald-50", text: "text-emerald-700", hoverBg: "hover:bg-emerald-100", dot: "bg-emerald-500" },
  music: { bg: "bg-purple-50", text: "text-purple-700", hoverBg: "hover:bg-purple-100", dot: "bg-purple-500" },
  academic: { bg: "bg-blue-50", text: "text-blue-700", hoverBg: "hover:bg-blue-100", dot: "bg-blue-500" },
};

export const modeDotColor: Record<string, string> = {
  lesson: "bg-amber-500",
  practice: "bg-slate-400",
};

export const modeLabel: Record<string, string> = {
  lesson: "เรียน",
  practice: "ซ้อม",
};
