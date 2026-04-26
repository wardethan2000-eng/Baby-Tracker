import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL || "noreply@cribnotes.baby";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const APP_NAME = "CribNotes";

function baseHtml(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'IBM Plex Sans',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;">
    <tr>
      <td style="background:#0b1120;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#38bdf8;margin:0;font-size:24px;font-family:'DM Sans',sans-serif;">${APP_NAME}</h1>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
        ${content}
      </td>
    </tr>
    <tr>
      <td style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">
        ${APP_NAME} — Track your baby's activity
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Verify your ${APP_NAME} account`,
    html: baseHtml(`
      <h2 style="color:#0b1120;margin-top:0;">Welcome to ${APP_NAME}!</h2>
      <p style="color:#475569;">Please verify your email address to get started.</p>
      <a href="${link}" style="display:inline-block;background:#38bdf8;color:#ffffff;padding:12px 32px;border-radius:9999px;text-decoration:none;font-weight:600;margin:16px 0;">Verify Email</a>
      <p style="color:#94a3b8;font-size:13px;">If you didn't create an account, you can ignore this email.</p>
    `),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html: baseHtml(`
      <h2 style="color:#0b1120;margin-top:0;">Reset Your Password</h2>
      <p style="color:#475569;">We received a request to reset your password.</p>
      <a href="${link}" style="display:inline-block;background:#38bdf8;color:#ffffff;padding:12px 32px;border-radius:9999px;text-decoration:none;font-weight:600;margin:16px 0;">Reset Password</a>
      <p style="color:#94a3b8;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `),
  });
}

export async function sendInviteEmail(
  toEmail: string,
  ownerName: string,
  childName: string,
  token: string
) {
  const link = `${APP_URL}/invite/${token}`;
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `${ownerName} shared ${childName}'s tracker with you`,
    html: baseHtml(`
      <h2 style="color:#0b1120;margin-top:0;">You're Invited!</h2>
      <p style="color:#475569;">${ownerName} has invited you to track ${childName}'s activity on ${APP_NAME}.</p>
      <a href="${link}" style="display:inline-block;background:#818cf8;color:#ffffff;padding:12px 32px;border-radius:9999px;text-decoration:none;font-weight:600;margin:16px 0;">Accept Invite</a>
      <p style="color:#94a3b8;font-size:13px;">This invite expires in 72 hours.</p>
    `),
  });
}

export async function sendInviteAcceptedEmail(
  ownerEmail: string,
  inviteeName: string,
  childName: string
) {
  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `${inviteeName} accepted your invite`,
    html: baseHtml(`
      <h2 style="color:#0b1120;margin-top:0;">Invite Accepted</h2>
      <p style="color:#475569;">${inviteeName} has accepted your invite to track ${childName} on ${APP_NAME}.</p>
    `),
  });
}