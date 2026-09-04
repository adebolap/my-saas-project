const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Session = require('../models/Session');
const { notifyAdminNewLead, confirmLead } = require('../services/email');

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
