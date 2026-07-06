import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = "https://aileen28.vercel.app";
const FROM = "Aileen App <onboarding@resend.dev>";

export async function sendParentInviteEmail({
  toEmail,
  childName,
  inviterName,
}: {
  toEmail: string;
  childName: string;
  inviterName: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `คุณได้รับเชิญเป็นผู้ปกครองของ ${childName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1e293b">คำเชิญจาก Aileen</h2>
        <p style="color:#475569">${inviterName} เชิญให้คุณเป็นผู้ปกครองของ <strong>${childName}</strong></p>
        <p style="color:#475569">เข้าสู่ระบบหรือสมัครสมาชิกเพื่อตอบรับคำเชิญ</p>
        <a href="${APP_URL}/login"
          style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          เข้าสู่ระบบ / สมัครสมาชิก
        </a>
        <p style="margin-top:24px;color:#94a3b8;font-size:12px">ถ้าไม่ได้ร้องขอ ไม่ต้องสนใจ email นี้</p>
      </div>
    `,
  });
}

export async function sendCoachInviteEmail({
  toEmail,
  childName,
  subjectName,
  inviteLink,
}: {
  toEmail: string;
  childName: string;
  subjectName: string;
  inviteLink: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `คุณได้รับเชิญเป็นครูของ ${childName} วิชา ${subjectName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1e293b">คำเชิญจาก Aileen</h2>
        <p style="color:#475569">คุณได้รับเชิญเป็นครูของ <strong>${childName}</strong> วิชา <strong>${subjectName}</strong></p>
        <p style="color:#475569">กดปุ่มด้านล่างเพื่อรับคำเชิญ</p>
        <a href="${inviteLink}"
          style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          รับคำเชิญเป็นครู
        </a>
        <p style="margin-top:24px;color:#94a3b8;font-size:12px">ถ้าไม่ได้ร้องขอ ไม่ต้องสนใจ email นี้</p>
      </div>
    `,
  });
}
