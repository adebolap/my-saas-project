const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const TutorApplication = require('../models/TutorApplication');
const Session = require('../models/Session');
const EmailLog = require('../models/EmailLog');

// Simple header-token auth — replace with proper auth before going to prod
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

router.patch('/leads/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(lead);
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
    const logs = await EmailLog.find().sort({ sentAt: -1 }).limit(300);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
