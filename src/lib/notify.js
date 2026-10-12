// Optional email notifications through Resend (https://resend.com).
// Only sends when RESEND_API_KEY and MAIL_FROM are configured; otherwise the
// message is skipped and the reason is returned (never reported as sent).
import 'server-only';

export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendEmail({ to, subject, text }) {
  if (!emailConfigured()) return { sent: false, reason: 'Email provider not configured' };
  if (!to) return { sent: false, reason: 'No recipient' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, text }),
    });
    return res.ok ? { sent: true } : { sent: false, reason: `Provider returned ${res.status}` };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}
