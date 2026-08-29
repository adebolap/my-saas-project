const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

const ADMIN    = process.env.ADMIN_EMAIL    || 'info@thinkviva.org';
const BOOKINGS = process.env.BOOKINGS_EMAIL || 'Bookings@thinkviva.org';
const FROM     = process.env.FROM_EMAIL     || process.env.SMTP_USER;

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

async function notifyAdminNewLead({ parentName, email, phone, country, childName, grade, package: pkg, subjects, message, referralCode, id }) {
  await send({
    to: BOOKINGS,
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
          ${referralCode ? `<tr><td style="padding:8px 0;color:#555;">Referral</td><td style="padding:8px 0;font-family:monospace;font-weight:700;color:#1E5A3A;">${referralCode}</td></tr>` : ''}
          ${message ? `<tr><td style="padding:8px 0;color:#555;vertical-align:top;">Note</td><td style="padding:8px 0;">${message}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#555;">Lead ID</td><td style="padding:8px 0;font-family:monospace;font-size:13px;">${id}</td></tr>
        </table>
        <p style="margin-top:24px;color:#888;font-size:13px;">Review in the admin dashboard and follow up within 24 hours.</p>
      </div>
    `,
  });
}

async function sendReviewRequest({ parentName, email }) {
  const reviewUrl = process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/CREjb5uVNmz8EBM/review';
  await send({
    to: email,
    type: 'review_request',
    subject: 'How is ThinkViva working for your family?',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#222;">
        <h2 style="color:#1E5A3A;">Hi ${parentName},</h2>
        <p>We hope you have had a positive experience so far! Would you mind leaving us a quick review? It would mean so much to the team and help other diaspora families find the right support and reliable Nigerian tutors.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${reviewUrl}" style="display:inline-block;background:#1E5A3A;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:1rem;">
            &#11088; Leave a Google Review
          </a>
        </div>
        <p style="color:#555;font-size:0.875rem;">We also appreciate referrals! If you know another diaspora family looking for reliable Nigerian tutors, we would love for you to share ThinkViva with them. Help another child learn and thrive.</p>
        <p style="color:#555;font-size:0.875rem;">If there is anything we can improve, simply reply to this email. We read every message and will get back to you within 24 hours.</p>
        <p style="color:#555;">Thank you,<br/><strong>The ThinkViva Team</strong><br/>
          <span style="font-size:0.875rem;">&#127758; <a href="https://thinkviva.org" style="color:#1E5A3A;">thinkviva.org</a></span><br/>
          <span style="font-size:0.875rem;">&#128222; +234 707 734 0116</span>
        </p>
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
  'You are screen-sharing in Google Meet and a student says they can only see your desktop wallpaper, not the document you have open. What do you do?',
  'You want each student to have their own editable copy of a worksheet in Google Classroom. Which attachment setting do you choose?',
  'A student submits a Google Classroom assignment but it shows as "Missing" instead of "Turned in." What most likely happened?',
  'The record button is missing from your Google Meet session. What is the most likely reason?',
  'You post a Google Form quiz on Google Classroom but students are seeing the correct answers immediately after submitting. What setting did you miss?',
  'You want to leave a private feedback message for one student on their work without the rest of the class seeing it. How do you do this in Google Classroom?',
  "During a Google Meet class a student's audio keeps cutting out. You have asked them to check their microphone but the problem continues. What do you do next to keep the lesson going?",
];
const IT_OPTIONS = [
  ['WhatsApp Chat only', 'Zoom or Google Meet', 'SMS', 'Email'],
  ['1 Mbps', '5 Mbps', '10 Mbps', '50 Mbps'],
  ['Restart your entire computer', 'Check that your microphone is not muted in Zoom', 'Ask the student to leave and rejoin', 'End the call immediately'],
  ['Video calls only', 'Storing and sharing files in the cloud', 'Internet browsing', 'Sending money transfers'],
  ['Print it and post it to them', 'Share your screen or send a Google Drive link in the Zoom chat', 'Read the whole worksheet aloud only', 'Take a photo and send it on WhatsApp after the class'],
  ['End the screen share and share again, this time selecting the specific window or tab', 'Ask the student to refresh their browser', 'Restart Google Meet', 'Switch to a different browser'],
  ['View only', 'Edit — so everyone works on the same document together', 'Make a copy for each student', 'Download and email to each student individually'],
  ["The student's account was suspended", 'They submitted after the due date, so Classroom marked it Missing before the late submission registered', 'The file was too large to upload', 'The assignment had already been graded'],
  ['You need to update your browser', 'Recording only works in Google Chrome', 'Recording requires a Google Workspace account — it is not available on a free Gmail account', 'The meeting was started from a phone'],
  ['You forgot to set a due date on the assignment', 'In Google Forms you left "Release grade immediately after each submission" on instead of "After manual review"', 'The quiz was posted as a question, not an assignment', 'Students need to be removed and re-added to the class'],
  ["Post a class announcement and include the student's name", "Use the private comment box on that student's submission inside the assignment", 'Email them directly from Gmail instead', 'Create a separate classroom just for that student'],
  ['Ask them to type responses in the chat and continue the lesson without interrupting the class', 'End the call and reschedule the lesson', 'Ask all other students to leave the call', 'Mute all participants one by one to find the source'],
];
const IT_CORRECT = [1, 1, 1, 1, 1, 0, 2, 1, 2, 1, 1, 0];

// Category definitions for digital readiness profiling (question IDs, 1-based)
const IT_CATEGORIES = [
  { label: 'Google Meet',      ids: [6, 9, 12],     threshold: 0.67 },
  { label: 'Google Classroom', ids: [7, 8, 10, 11], threshold: 0.75 },
  { label: 'General IT',       ids: [1, 2, 3, 4, 5], threshold: 0.80 },
];

function buildDigitalProfile(itTestAnswers) {
  return IT_CATEGORIES.map(cat => {
    let correct = 0;
    cat.ids.forEach(id => {
      const chosen = itTestAnswers?.[id] ?? itTestAnswers?.[String(id)];
      if (chosen !== undefined && parseInt(chosen) === IT_CORRECT[id - 1]) correct++;
    });
    const pct = Math.round((correct / cat.ids.length) * 100);
    const strong = pct >= cat.threshold * 100;
    const partial = pct >= 34 && !strong;
    const signal  = strong ? 'Strong' : partial ? 'Partial' : 'Weak';
    const color   = strong ? '#1E5A3A' : partial ? '#9A7D0A' : '#C0392B';
    return { label: cat.label, correct, total: cat.ids.length, pct, signal, color };
  });
}

function buildInsights(profile, answers) {
  const meet      = profile.find(c => c.label === 'Google Meet');
  const classroom = profile.find(c => c.label === 'Google Classroom');
  const general   = profile.find(c => c.label === 'General IT');
  const insights  = [];

  if (meet.pct >= 67 && classroom.pct >= 75) {
    insights.push({ type: 'strength', text: 'Strong Google teaching suite fluency. Candidate is ready for a live teaching demonstration.' });
  } else if (meet.pct >= 67 || classroom.pct >= 75) {
    insights.push({ type: 'caution', text: 'Partial platform fluency — probe the weaker category during the teaching demonstration.' });
  } else {
    insights.push({ type: 'concern', text: 'Limited Google tools experience. Significant coaching investment likely required before independent delivery.' });
  }

  // Specific flags per question
  const q9ans = parseInt(answers?.[9] ?? answers?.['9']);
  if (!isNaN(q9ans) && q9ans !== 2) {
    insights.push({ type: 'concern', text: 'Did not know recording requires Google Workspace. May have unrealistic expectations about session recording.' });
  }
  const q7ans = parseInt(answers?.[7] ?? answers?.['7']);
  if (!isNaN(q7ans) && q7ans !== 2) {
    insights.push({ type: 'concern', text: 'Unfamiliar with distributing individual copies in Classroom. Could struggle with digital worksheet delivery.' });
  }
  const q12ans = parseInt(answers?.[12] ?? answers?.['12']);
  if (!isNaN(q12ans) && q12ans !== 0) {
    insights.push({ type: 'concern', text: 'May interrupt the lesson to fix tech rather than adapt. Check classroom management approach in demo.' });
  }
  if (meet.pct === 100) {
    insights.push({ type: 'strength', text: 'Perfect Google Meet score — confident live session management expected.' });
  }
  if (classroom.pct === 100) {
    insights.push({ type: 'strength', text: 'Perfect Google Classroom score — deep understanding of digital classroom workflows.' });
  }
  if (general.pct === 100) {
    insights.push({ type: 'strength', text: 'Solid general IT foundations across all basic questions.' });
  }
  return insights;
}

function row(label, value) {
  if (!value && value !== 0) return '';
  return `<tr><td style="padding:7px 12px 7px 0;color:#555;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:7px 0;font-weight:500;">${value}</td></tr>`;
}

async function notifyAdminNewApplication({
  name, email, phone, location, qualification, experience, trcnRegistered,
  subjects, grades, availability, linkedinUrl, referralSource, equipmentNotes,
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
    const isCorrect = parseInt(chosen) === IT_CORRECT[i];
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
          ${row('TRCN Registered', trcnRegistered === 'yes' ? '<span style="color:#1E5A3A;font-weight:700;">Yes</span>' : '<span style="color:#C0392B;font-weight:700;">No</span>')}
          ${row('Subjects', (subjects || []).join(', ') || '—')}
          ${row('Grades', (grades || []).join(', ') || '—')}
          ${row('Availability', availDays)}
          ${linkedinUrl ? row('LinkedIn', `<a href="${linkedinUrl}">${linkedinUrl}</a>`) : ''}
          ${row('Heard about us', referralSource || '—')}
          ${row('CV', cvFilename ? `Attached (${cvFilename})` : '<em style="color:#999;">Not provided</em>')}
        </table>

        <h3 style="color:#1E5A3A;border-bottom:1px solid #eee;padding-bottom:6px;margin-top:24px;">Equipment &amp; Setup</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${row('Notes', equipmentNotes || '—')}
        </table>

        <h3 style="color:#1E5A3A;border-bottom:1px solid #eee;padding-bottom:6px;margin-top:24px;">IT Readiness Test — ${score}% ${statusBadge}</h3>

        ${(() => {
          const profile  = buildDigitalProfile(itTestAnswers);
          const insights = buildInsights(profile, itTestAnswers);

          const profileRows = profile.map(cat => `
            <tr>
              <td style="padding:7px 12px 7px 0;font-size:13px;color:#555;white-space:nowrap;">${cat.label}</td>
              <td style="padding:7px 0;font-size:13px;">
                <span style="font-weight:700;color:${cat.color};">${cat.correct}/${cat.total} (${cat.pct}%)</span>
                <span style="margin-left:8px;font-size:12px;color:${cat.color};font-style:italic;">${cat.signal}</span>
              </td>
            </tr>`).join('');

          const insightItems = insights.map(ins => {
            const bg    = ins.type === 'strength' ? '#EAFAF1' : ins.type === 'caution' ? '#FEF9E7' : '#FDEDEC';
            const color = ins.type === 'strength' ? '#1E5A3A' : ins.type === 'caution' ? '#9A7D0A' : '#C0392B';
            const icon  = ins.type === 'strength' ? '✓' : ins.type === 'caution' ? '⚠' : '✗';
            return `<li style="margin-bottom:8px;padding:8px 12px;background:${bg};border-radius:6px;font-size:13px;color:${color};list-style:none;">
              <strong>${icon}</strong> ${ins.text}
            </li>`;
          }).join('');

          return `
          <div style="background:#F8F9FA;border-radius:8px;padding:16px 20px;margin:12px 0 20px;">
            <p style="margin:0 0 10px;font-weight:700;font-size:13px;color:#333;">Digital Readiness Profile</p>
            <table style="width:100%;border-collapse:collapse;">${profileRows}</table>
          </div>
          <ul style="margin:0 0 20px;padding:0;">${insightItems}</ul>`;
        })()}

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

module.exports = { notifyAdminNewApplication, notifyAdminNewLead, confirmApplicant, confirmLead, sendReviewRequest };
