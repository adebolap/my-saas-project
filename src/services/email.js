const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

const ADMIN = process.env.ADMIN_EMAIL || 'info@thinkviva.org';
const FROM  = process.env.FROM_EMAIL  || process.env.SMTP_USER;

function createTransport() {
  const port = parseInt(process.env.SMTP_PORT || '465');
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function send({ to, subject, html, attachments, type }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP credentials not set — skipping:', subject);
    return;
  }
  const mailOptions = { from: FROM, to, subject, html };
  if (attachments?.length) {
    mailOptions.attachments = attachments.map(a => ({
      filename: a.filename,
      content:  Buffer.from(a.content, 'base64'),
    }));
  }
  try {
    await createTransport().sendMail(mailOptions);
    EmailLog.create({ to, subject, type: type || 'other', status: 'sent' }).catch(() => {});
  } catch (err) {
    console.error('[email] Failed to send:', subject, err.message);
    EmailLog.create({ to, subject, type: type || 'other', status: 'failed', error: err.message }).catch(() => {});
  }
}

async function notifyAdminNewLead({ parentName, email, phone, country, childName, grade, package: pkg, subjects, message, id }) {
  await send({
    to: ADMIN,
    type: 'admin_booking',
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
          ${pkg ? `<tr><td style="padding:8px 0;color:#555;">Package</td><td style="padding:8px 0;font-weight:600;color:#1E5A3A;">${pkg}</td></tr>` : ''}
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
    type: 'parent_confirm',
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

const IT_QUESTIONS = [
  'Which tool would you use for a live video call with your student?',
  'What is the minimum internet speed recommended for online teaching?',
  'A student cannot hear you during a Zoom call. What do you check first?',
  'What is Google Drive primarily used for?',
  'How would you share a worksheet with a student during class?',
];
const IT_OPTIONS = [
  ['WhatsApp Chat only', 'Zoom or Google Meet', 'SMS', 'Email'],
  ['1 Mbps', '5 Mbps', '10 Mbps', '50 Mbps'],
  ['Restart your entire computer', 'Check that your microphone is not muted in Zoom', 'Ask the student to leave and rejoin', 'End the call immediately'],
  ['Video calls only', 'Storing and sharing files in the cloud', 'Internet browsing', 'Sending money transfers'],
  ['Print it and post it to them', 'Share your screen or send a Google Drive link in the Zoom chat', 'Read the whole worksheet aloud only', 'Take a photo and send it on WhatsApp after the class'],
];

function row(label, value) {
  if (!value && value !== 0) return '';
  return `<tr><td style="padding:7px 12px 7px 0;color:#555;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:7px 0;font-weight:500;">${value}</td></tr>`;
}

async function notifyAdminNewApplication({
  name, email, phone, location, qualification, experience,
  subjects, grades, availability, linkedinUrl, equipmentNotes,
  itTestAnswers, score, passed, id, cvData, cvFilename, cvMimeType,
}) {
  const statusBadge = passed
    ? '<span style="color:#1E5A3A;font-weight:700;">PASSED ✓</span>'
    : '<span style="color:#C0392B;font-weight:700;">FAILED ✗</span>';

  const availDays = Array.isArray(availability)
    ? availability.map(a => a.day).filter(Boolean).join(', ') || '—'
    : '—';

  const itAnswerRows = IT_QUESTIONS.map((q, i) => {
    const qid = i + 1;
    const chosen = itTestAnswers?.[qid] ?? itTestAnswers?.[String(qid)];
    const answer = (chosen !== undefined && chosen !== null)
      ? (IT_OPTIONS[i]?.[parseInt(chosen)] || `Option ${chosen}`)
      : '<em style="color:#999;">Not answered</em>';
    const isCorrect = parseInt(chosen) === 1;
    const mark = (chosen !== undefined && chosen !== null)
      ? (isCorrect ? '<span style="color:#1E5A3A;">✓</span>' : '<span style="color:#C0392B;">✗</span>')
      : '';
    return `
      <tr>
        <td colspan="2" style="padding:6px 0 2px;font-size:13px;color:#444;">${qid}. ${q}</td>
      </tr>
      <tr>
        <td style="padding:0 12px 8px 16px;font-size:13px;" colspan="2">↳ ${answer} ${mark}</td>
      </tr>`;
  }).join('');

  const attachments = [];
  if (cvData) {
    attachments.push({
      filename: cvFilename || 'cv.pdf',
      content: cvData.toString('base64'),
    });
  }

  await send({
    to: ADMIN,
    type: 'admin_application',
    subject: `New Tutor Application — ${name}`,
    attachments,
    html: `
      <div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#222;">
        <h2 style="color:#1E5A3A;margin-bottom:4px;">New Tutor Application Received</h2>
        <p style="color:#888;font-size:13px;margin-top:0;">ID: <code>${id}</code></p>

        <h3 style="color:#1E5A3A;border-bottom:1px solid #eee;padding-bottom:6px;">Personal Information</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${row('Name', `<strong>${name}</strong>`)}
          ${row('Email', `<a href="mailto:${email}">${email}</a>`)}
          ${row('Phone', phone)}
          ${row('Location', location)}
          ${row('Qualification', qualification)}
          ${row('Experience', experience)}
          ${row('Subjects', (subjects || []).join(', ') || '—')}
          ${row('Grades', (grades || []).join(', ') || '—')}
          ${row('Availability', availDays)}
          ${linkedinUrl ? row('LinkedIn', `<a href="${linkedinUrl}">${linkedinUrl}</a>`) : ''}
          ${row('CV', cvFilename ? `Attached (${cvFilename})` : '<em style="color:#999;">Not provided</em>')}
        </table>

        <h3 style="color:#1E5A3A;border-bottom:1px solid #eee;padding-bottom:6px;margin-top:24px;">Equipment &amp; Setup</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${row('Notes', equipmentNotes || '—')}
        </table>

        <h3 style="color:#1E5A3A;border-bottom:1px solid #eee;padding-bottom:6px;margin-top:24px;">IT Readiness Test — ${score}% ${statusBadge}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${itAnswerRows}
        </table>

        <p style="margin-top:24px;color:#888;font-size:12px;">Review and update status in the admin dashboard.</p>
      </div>
    `,
  });
}

async function confirmApplicant({ name, email }) {
  await send({
    to: email,
    type: 'applicant_confirm',
    subject: 'Thank You for Applying to Become a ThinkViva Tutor',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#222;">
        <h2 style="color:#1E5A3A;">Thank You for Applying to Become a ThinkViva Tutor</h2>
        <p>Dear ${name},</p>
        <p>Thank you for your interest in joining ThinkViva as an online tutor.</p>
        <p>Our team will carefully assess your submission, and if your profile matches our current needs, you will be contacted within the next week for the next stage of the process, which may include a short interview and/or teaching demonstration.</p>
        <div style="background:#EAFAF1;border-left:4px solid #1E5A3A;padding:14px 18px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;color:#1E5A3A;font-size:0.9rem;">Due to the number of applications we receive, only shortlisted candidates will be contacted. We truly appreciate your interest in being part of the ThinkViva community.</p>
        </div>
        <p>We wish you the very best and look forward to the possibility of working with you.</p>
        <p style="margin-top:32px;color:#555;">
          Warm regards,<br/>
          <strong>The ThinkViva Team</strong><br/>
          <span style="color:#888;font-size:0.875rem;">ThinkViva — Smart Learning for Growing Minds</span><br/><br/>
          <span style="font-size:0.875rem;color:#555;">🌐 <a href="https://thinkviva.org" style="color:#1E5A3A;">thinkviva.org</a></span><br/>
          <span style="font-size:0.875rem;color:#555;">📞 +234 707 734 0116</span><br/>
          <span style="font-size:0.875rem;color:#555;">📸 <a href="https://instagram.com/thinkviva_ng" style="color:#1E5A3A;">@thinkviva_ng</a></span>
        </p>
      </div>
    `,
  });
}

module.exports = { notifyAdminNewApplication, notifyAdminNewLead, confirmApplicant, confirmLead };
