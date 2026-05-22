const nodemailer = require('nodemailer');

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const FROM = process.env.FROM_EMAIL || 'ThinkViva <info@thinkviva.org>';
const ADMIN = process.env.ADMIN_EMAIL || 'info@thinkviva.org';

async function send(options) {
  const transport = createTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping:', options.subject);
    return;
  }
  try {
    await transport.sendMail({ from: FROM, ...options });
  } catch (err) {
    console.error('[email] Failed to send:', options.subject, err.message);
  }
}

async function notifyAdminNewApplication({ name, email, subjects, score, passed, id }) {
  const statusBadge = passed
    ? '<span style="color:#1E5A3A;font-weight:700;">PASSED ✓</span>'
    : '<span style="color:#C0392B;font-weight:700;">FAILED ✗</span>';

  await send({
    to: ADMIN,
    subject: `New Tutor Application — ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#1E5A3A;">New Tutor Application Received</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr><td style="padding:8px 0;color:#555;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#555;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#555;">Subjects</td><td style="padding:8px 0;">${subjects.join(', ')}</td></tr>
          <tr><td style="padding:8px 0;color:#555;">IT Score</td><td style="padding:8px 0;">${score}% — ${statusBadge}</td></tr>
          <tr><td style="padding:8px 0;color:#555;">Application ID</td><td style="padding:8px 0;font-family:monospace;font-size:13px;">${id}</td></tr>
        </table>
        <p style="margin-top:24px;color:#888;font-size:13px;">Review in the admin dashboard.</p>
      </div>
    `,
  });
}

async function confirmApplicant({ name, email, score, passed }) {
  const html = passed
    ? `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#1E5A3A;">Application Received — You Passed!</h2>
        <p>Hi ${name},</p>
        <p>Great news! Your ThinkViva tutor application has been received and you scored <strong>${score}%</strong> on the IT readiness test.</p>
        <div style="background:#EAFAF1;border-left:4px solid #1E5A3A;padding:16px 20px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;font-weight:700;color:#1E5A3A;">What happens next:</p>
          <ul style="margin:12px 0 0;padding-left:20px;color:#333;">
            <li style="margin-bottom:8px;">Our team will review your application within <strong>48 hours</strong></li>
            <li style="margin-bottom:8px;">You'll receive a follow-up email with further instructions</li>
            <li>An equipment verification call will be scheduled</li>
          </ul>
        </div>
        <p style="color:#555;">Thank you for wanting to be part of the ThinkViva family. We'll be in touch soon.</p>
        <p style="color:#555;">— The ThinkViva Team</p>
      </div>
    `
    : `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#1E5A3A;">Application Received</h2>
        <p>Hi ${name},</p>
        <p>Thank you for applying to teach with ThinkViva. Your application has been submitted — however, your IT readiness score was <strong>${score}%</strong> and we require 60% or above.</p>
        <div style="background:#FEF9E7;border-left:4px solid #F39C12;padding:16px 20px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;font-weight:700;color:#9A7D0A;">Tips to improve before re-applying:</p>
          <ul style="margin:12px 0 0;padding-left:20px;color:#333;">
            <li style="margin-bottom:8px;">Download Zoom and practise using it</li>
            <li style="margin-bottom:8px;">Explore Google Drive and Google Meet</li>
            <li>You may re-apply after 7 days</li>
          </ul>
        </div>
        <p style="color:#555;">We hope to hear from you again soon.</p>
        <p style="color:#555;">— The ThinkViva Team</p>
      </div>
    `;

  await send({
    to: email,
    subject: passed
      ? 'Your ThinkViva Application Has Been Received'
      : 'Your ThinkViva Application — Next Steps',
    html,
  });
}

module.exports = { notifyAdminNewApplication, confirmApplicant };
