const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const ResourceLead = require('../models/ResourceLead');
const Session = require('../models/Session');
const { notifyAdminNewLead, confirmLead, confirmResourceLead, notifyAdminResourceLead } = require('../services/email');

const RESOURCE_META = {
  'math-g2-4': { title: 'Primary 2-4 Maths Diagnostic',    url: 'https://thinkviva.org/resources/math-primary-2-4' },
  'math-g5-6': { title: 'Primary 5-6 Maths Diagnostic',    url: 'https://thinkviva.org/resources/math-primary-5-6' },
  'eng-g2-4':  { title: 'Primary 2-4 English Diagnostic',  url: 'https://thinkviva.org/resources/english-primary-2-4' },
  'eng-g5-6':  { title: 'Primary 5-6 English Diagnostic',  url: 'https://thinkviva.org/resources/english-primary-5-6' },
};
const BEHAVIORAL_URL = 'https://thinkviva.org/resources/behavioral-checklist';

router.post('/', async (req, res) => {
  try {
    const lead = new Lead(req.body);
    await lead.save();

    // Await emails before responding: Vercel freezes the function on res.json()
    await Promise.allSettled([
      notifyAdminNewLead({
        parentName: lead.parentName,
        email: lead.email,
        phone: lead.phone,
        country: lead.country,
        childName: lead.childName,
        grade: lead.grade,
        package: lead.package,
        subjects: lead.subjects,
        message: lead.message,
        referralCode: lead.referralCode,
        id: lead._id,
      }),
      confirmLead({
        parentName: lead.parentName,
        email: lead.email,
        childName: lead.childName,
        grade: lead.grade,
        subjects: lead.subjects,
      }),
    ]);

    res.status(201).json({
      success: true,
      message:
        'Thank you! We will contact you within 24 hours to book your first session.',
      id: lead._id,
    });
  } catch (err) {
    console.error('[leads POST]', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const { sessionId, parentRating, parentComment, studentEngagement } = req.body;
    await Session.findByIdAndUpdate(sessionId, {
      'feedback.parentRating': parentRating,
      'feedback.parentComment': parentComment,
      'feedback.studentEngagement': studentEngagement,
      'feedback.submittedAt': new Date(),
    });
    res.json({ success: true, message: 'Feedback received. Thank you!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Resource hub registration: 1 free behavioral (always open) + 1 subject diagnostic (locked to first choice)
router.post('/resource', async (req, res) => {
  try {
    const { name, email, resourceKey, phone } = req.body;

    if (!name || !email || !resourceKey) {
      return res.status(400).json({ success: false, message: 'Name, email and resource selection are required.' });
    }

    const meta = RESOURCE_META[resourceKey];
    if (!meta) {
      return res.status(400).json({ success: false, message: 'Invalid resource selection.' });
    }

    const existing = await ResourceLead.findOne({ email: email.toLowerCase().trim() });

    if (existing) {
      const existingMeta = RESOURCE_META[existing.resourceKey];
      if (existing.resourceKey === resourceKey) {
        return res.json({
          success: true,
          alreadyClaimed: true,
          message: 'Welcome back! Here are your resources again.',
          resourceTitle: meta.title,
          resourceUrl: meta.url,
          behavioralUrl: BEHAVIORAL_URL,
        });
      }
      return res.json({
        success: false,
        alreadyClaimed: true,
        differentResource: true,
        originalResourceTitle: existingMeta ? existingMeta.title : existing.resourceKey,
        message: `You already claimed the ${existingMeta ? existingMeta.title : 'a resource'}. Each registration unlocks one subject diagnostic. Book a free consultation to discuss your child\'s results.`,
      });
    }

    const lead = new ResourceLead({ name, email, phone: phone || undefined, resourceKey });
    await lead.save();

    const mailerTasks = [
      confirmResourceLead({ name, email, resourceTitle: meta.title, resourceUrl: meta.url, behavioralUrl: BEHAVIORAL_URL }),
      notifyAdminResourceLead({ name, email, phone, resourceKey, resourceTitle: meta.title, id: lead._id }),
    ];

    if (process.env.MAILERLITE_API_KEY) {
      const groupId = process.env.MAILERLITE_RESOURCE_GROUP_ID || process.env.MAILERLITE_GROUP_ID || '196687939781002436';
      mailerTasks.push(
        fetch(`https://connect.mailerlite.com/api/groups/${groupId}/subscribers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
          },
          body: JSON.stringify({ email, fields: { name } }),
        }).catch(() => {})
      );
    }

    await Promise.allSettled(mailerTasks);

    res.status(201).json({
      success: true,
      message: 'Your free resources are ready!',
      resourceTitle: meta.title,
      resourceUrl: meta.url,
      behavioralUrl: BEHAVIORAL_URL,
    });
  } catch (err) {
    console.error('[leads/resource POST]', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// General feedback not tied to a session (pilot widget)
router.post('/general-feedback', async (req, res) => {
  try {
    const { name, email, rating, comment, role } = req.body;
    // Store as a lightweight lead with message for now
    const feedback = new Lead({
      parentName: name || 'Anonymous',
      email: email || 'feedback@edubridge.com',
      country: 'Feedback',
      grade: 'G1',
      message: `[${role || 'visitor'}] Rating: ${rating}/5: ${comment}`,
      source: 'feedback_widget',
      status: 'new',
    });
    await feedback.save();
    res.json({ success: true, message: 'Feedback received. Thank you!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
