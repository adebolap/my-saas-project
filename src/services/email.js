const axios = require('axios');

const ADMIN = process.env.ADMIN_EMAIL || 'info@thinkviva.org';
const FROM  = process.env.FROM_EMAIL  || 'ThinkViva <onboarding@resend.dev>';

async function send({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping:', subject);
    return;
  }
  try {
    await axios.post(
      'https://api.resend.com/emails',
      { from: FROM, to, subject, html },
      { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[email] Failed to send:', subject, detail);
  }
}

async function notifyAdminNewLead({ parentName, email, phone, country, childName, grade, subjects, message, id }) {
  await send({
    to: ADMIN,
    subject: `New Booking Request — ${parentName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#1E5A3A;">New Session Booking Request</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr><td style="padding:8px 0;color:#555;">Parent</td><td style="padding:8px 0;font-weight:600;">${parentName}</td></tr>
          <tr><td style="padding:8px 0;color:#555;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding:8px 0;color:#555;">Phone</td><td style="padding:8px 0;">${phone}</td></tr>` : ''}
          ${childName ? `<tr><td style="padding:8px 0;color:#555;">Child</td><td style="padding:8px 0;">${childName}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#555;">Grade</td><td style="padding:8px 0;">${grade}</td></tr>
          <tr><td style="padding:8px 0;color:#555;">Subjects</td><td style="padding:8px 0;">${(subjects || []).join(', ') || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#555;">Country</td><td style="padding:8px 0;">${country}</td></tr>
          ${message ? `<tr><td style="padding:8px 0;color:#555;vertical-align:top;">Note</td><td style="padding:8px 0;">${message}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#555;">Lead ID</td><td style="padding:8px 0;font-family:monospace;font-size:13px;">${id}</td></tr>
        </table>
        <p style="margin-top:24px;color:#888;font-size:13px;">Review in the admin dashboard and follow up within 24 hours.</p>
      </div>
    `,
  });
}

async function confirmLead({ parentName, email, childName, grade, subjects }) {
  const subjectList = (subjects || []).join(', ') || 'your selected subjects';
  const child = childName || 'your child';

  await send({
    to: email,
    subject: "We've received your ThinkViva booking request",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#1E5A3A;">Booking Request Received!</h2>
        <p>Hi ${parentName},</p>
        <p>Thanks for reaching out. We've received your request to book sessions for <strong>${child}</strong> in <strong>${subjectList}</strong> (${grade}).</p>
        <div style="background:#EAFAF1;border-left:4px solid #1E5A3A;padding:16px 20px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;font-weight:700;color:#1E5A3A;">What happens next:</p>
          <ul style="margin:12px 0 0;padding-left:20px;color:#333;">
            <li style="margin-bottom:8px;">Our team will review your request and match ${child} with the right tutor</li>
            <li style="margin-bottom:8px;">We'll contact you within <strong>24 hours</strong> to confirm the schedule</li>
            <li>Sessions are held live on Zoom or Google Meet</li>
          </ul>
        </div>
        <p style="color:#555;">If you have any questions in the meantime, reply to this email or WhatsApp us at <strong>+234 707 734 0116</strong>.</p>
        <p style="color:#555;">— The ThinkViva Team</p>
      </div>
    `,
  });
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

module.exports = { notifyAdminNewApplication, notifyAdminNewLead };
