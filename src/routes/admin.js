const express = require('express');
const router = express.Router();
const multer = require('multer');
const Groq = require('groq-sdk');
const Lead = require('../models/Lead');
const TutorApplication = require('../models/TutorApplication');
const Session = require('../models/Session');
const EmailLog = require('../models/EmailLog');
const { sendReviewRequest } = require('../services/email');

const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('cv');

// Simple header-token auth, replace with proper auth before going to prod
router.use((req, res, next) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || token !== (process.env.ADMIN_TOKEN || 'admin123')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalLeads,
      newLeads,
      totalTutors,
      approvedTutors,
      totalSessions,
      completedSessions,
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ status: 'new' }),
      TutorApplication.countDocuments(),
      TutorApplication.countDocuments({ status: 'approved' }),
      Session.countDocuments(),
      Session.countDocuments({ status: 'completed' }),
    ]);

    const [gradeBreakdown, countryBreakdown, subjectDemand, tutorStatusBreakdown] =
      await Promise.all([
        Lead.aggregate([{ $group: { _id: '$grade', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
        Lead.aggregate([
          { $group: { _id: '$country', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Lead.aggregate([
          { $unwind: '$subjects' },
          { $group: { _id: '$subjects', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        TutorApplication.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);

    // Complexity metrics: average timezone offset from completed sessions
    const tzStats = await Session.aggregate([
      { $match: { timezoneOffset: { $exists: true, $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$timezoneOffset' }, max: { $max: '$timezoneOffset' } } },
    ]);

    res.json({
      metrics: { totalLeads, newLeads, totalTutors, approvedTutors, totalSessions, completedSessions },
      gradeBreakdown,
      countryBreakdown,
      subjectDemand,
      tutorStatusBreakdown,
      complexityMetrics: tzStats[0] || { avg: 0, max: 0 },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leads', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(200).populate('assignedTutor', 'name email');
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/leads/:id/review', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).select('parentName email');
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    await sendReviewRequest({ parentName: lead.parentName, email: lead.email });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/leads/:id', async (req, res) => {
  try {
    const prev = await Lead.findById(req.params.id).select('status');
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (prev && prev.status !== 'active' && lead.status === 'active') {
      sendReviewRequest({ parentName: lead.parentName, email: lead.email }).catch(() => {});
    }
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tutors', async (req, res) => {
  try {
    const tutors = await TutorApplication.find().sort({ createdAt: -1 }).limit(200);
    res.json(tutors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/tutors/:id', async (req, res) => {
  try {
    const tutor = await TutorApplication.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(tutor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await Session.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('lead', 'parentName childName grade country')
      .populate('tutor', 'name email');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/email-logs', async (req, res) => {
  try {
    const logs = await EmailLog.find().sort({ sentAt: -1 }).limit(500);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/email-logs/purge', async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await EmailLog.deleteMany({ sentAt: { $lt: cutoff } });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/feedback', async (req, res) => {
  try {
    const logs = await Lead.find({ source: 'feedback_widget' }).sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/screen-cv', (req, res, next) => {
  cvUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'Upload error: ' + err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CV file uploaded.' });
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured in environment.' });

  let text = '';
  try {
    const mime = req.file.mimetype;
    if (mime === 'application/pdf') {
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const parsed = await pdfParse(req.file.buffer);
      text = parsed.text;
    } else {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    }
  } catch (err) {
    return res.status(422).json({ error: 'Could not read CV: ' + err.message });
  }

  if (!text || text.trim().length < 50) {
    return res.status(422).json({ error: 'CV appears empty or unreadable. Try a different file.' });
  }

  const prompt = `You are a strict HR screener for ThinkViva, an online tutoring platform connecting diaspora families with qualified Nigerian tutors. Tutors teach Maths, English, Science, and Local Languages (Yoruba, Igbo, Hausa) for Kindergarten to Grade 9 (JS3).

Analyse this CV and return ONLY valid JSON, no markdown, no extra text.

STRICT criteria, apply all of these:
1. NIGERIA-BASED: Candidate must be located in Nigeria. Auto-Reject if not.
2. TRCN: Must be registered with the Teachers Registration Council of Nigeria (TRCN). Auto-Reject if not mentioned or absent.
3. QUALIFICATION: Must have a teaching qualification (B.Ed, PGDE, NCE, PGCE) or relevant university degree. Auto-Reject if absent.
4. SUBJECTS: Must be able to teach at least one of: Maths, English, Science, Yoruba, Igbo, Hausa. Auto-Reject if none match.
5. EXPERIENCE WITH CHILDREN: Must show evidence of teaching or tutoring children/students. No experience = Reject.
6. AVAILABILITY: Candidate should mention availability for online work, or show they are not locked in a conflicting full-time role. Unclear availability = downgrade to Maybe.
7. TECH READINESS: Must mention laptop/computer, Zoom, Google Meet, or online teaching experience. Missing = downgrade to Maybe.

Recommendation rules (be conservative, when in doubt go lower):
- "Shortlist": Meets ALL 7 criteria clearly
- "Maybe": Meets criteria 1–5 but missing availability clarity OR tech readiness
- "Reject": Fails ANY of criteria 1–4, or has no teaching experience with children

Return exactly this JSON:
{
  "firstName": "first name only",
  "lastName": "last name / surname only",
  "name": "full name from CV",
  "email": "email address from CV or empty string",
  "phone": "phone number from CV or empty string",
  "recommendation": "Shortlist" or "Maybe" or "Reject",
  "summary": "2 sentence hiring manager summary",
  "qualification": "highest qualification",
  "subjects": ["subject"],
  "experience": "e.g. 4 years classroom teaching",
  "location": "city, state or country",
  "nigeriaBase": true or false,
  "techReady": true or false,
  "availabilitySignal": "what the CV says about availability or 'Not mentioned'",
  "strengths": ["strength 1", "strength 2"],
  "concerns": ["concern 1", "concern 2"],
  "nextStep": "e.g. Schedule interview / Decline politely"
}

CV:
${text.slice(0, 6000)}`;

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'qwen/qwen3-32b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });
    const verdict = JSON.parse(completion.choices[0].message.content);
    res.json(verdict);
  } catch (err) {
    res.status(500).json({ error: 'AI screening failed: ' + err.message });
  }
});

module.exports = router;
