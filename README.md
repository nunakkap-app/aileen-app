# Aileen

ระบบเก็บข้อมูลตารางซ้อม/เรียนพิเศษ การบ้าน และผลประเมิน สำหรับผู้ปกครองและครู/โค้ช (กีฬา/ดนตรี/วิชาการ)

## Setup

1. สร้าง Supabase project ใหม่ (account แยกจาก TST)
2. รัน SQL ใน `supabase/migrations/0001_init.sql` ผ่าน Supabase SQL editor
3. คัดลอก `.env.local.example` เป็น `.env.local` แล้วกรอก `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` จากหน้า Project Settings → API
4. `npm install`
5. `npm run dev` แล้วเปิด http://localhost:3000

## สถานะปัจจุบัน (MVP step 1)

- Auth (signup/login/logout) พร้อมเลือก role ผู้ปกครอง/ครู
- ผู้ปกครอง: เพิ่ม/ดูรายชื่อลูก
- ครู: เพิ่ม/ดูวิชาที่สอน
- Schema เต็มรูปแบบรองรับ flow ถัดไปแล้ว (enrollments, schedules, attendance, assignments, submissions, evaluations, benchmarks) — ยังไม่มี UI

## ขั้นต่อไป

- หน้าผูก enrollment (ครูรับเด็กเข้าวิชา)
- หน้าตารางซ้อม/เรียน + เช็คชื่อ
- หน้าสั่ง/ส่ง/ตรวจการบ้าน + คอมเมนต์
- Dashboard วิเคราะห์ผลเทียบ benchmark

## Deploy

Push repo นี้ขึ้น GitHub แล้วเชื่อมกับ Vercel (เพิ่ม env vars เดียวกันใน Vercel project settings)
