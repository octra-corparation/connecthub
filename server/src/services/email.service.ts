import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!env.smtp.host) {
    // No SMTP configured (e.g. local dev) — log instead of failing the request.
    console.log(`[email:dev] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Reset your ConnectHub password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your ConnectHub password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Reset Password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
