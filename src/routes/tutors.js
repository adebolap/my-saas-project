const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const TutorApplication = require('../models/TutorApplication');
const Session = require('../models/Session');
const { notifyAdminNewApplication, confirmApplicant } = require('../services/email');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(req, file, cb) {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const IT_TEST = [
  {
    id: 1,
    question: 'Which tool would you use for a video call with your student?',
    options: ['WhatsApp Chat only', 'Zoom or Google Meet', 'SMS', 'Email'],
    correct: 1,
  },
  {
    id: 2,
    question: 'What is the minimum internet speed recommended for online teaching?',
    options: ['1 Mbps', '5 Mbps', '10 Mbps', '50 Mbps'],
    correct: 1,
  },
  {
    id: 3,
    question: 'A student cannot hear you during a Zoom call. What do you check first?',
    options: [
      'Restart your computer',
      'Check your microphone is not muted in Zoom',
      'Ask the student to leave and rejoin',
      'End the call',
    ],
    correct: 1,
  },
  {
    id: 4,
    question: 'What is Google Drive used for?',
    options: [
      'Video calls only',
      'Storing and sharing files in the cloud',
      'Internet browsing',
      'Sending money',
    ],
    correct: 1,
  },
  {
    id: 5,
    question: 'How would you share a worksheet with a student during class?',
    options: [
      'Print and post it',
      'Share screen or send a Google Drive link',
      'Read it aloud only',
      'Take a photo and send on WhatsApp',
    ],
    correct: 1,
  },
];

router.get('/it-test', (req, res) => {
  res.json(IT_TEST.map(({ id, question, options }) => ({ id, question, options })));
});

router.post('/', upload.single('cv'), async (req, res) => {
  try {
    // Body arrives as multipart/form-data; arrays and objects are JSON-encoded strings
    const body = req.body;
    const parseJSON = (val) => { try { return JSON.parse(val); } catch { return val; } };

    const itTestAnswers    = parseJSON(body.itTestAnswers);
    const subjects         = parseJSON(body.subjects);
    const grades           = parseJSON(body.grades);
    const availability     = parseJSON(body.availability);

    const applicationData = {
      name:           body.name,
      email:          body.email,
      phone:          body.phone,
      location:       body.location,
      timezone:       body.timezone,
      qualification:  body.qualification,
      experience:     body.experience,
      linkedinUrl:    body.linkedinUrl,
      equipmentNotes: body.equipmentNotes,
      subjects,
      grades,
      availability,
    };

    // Strip undefined keys so Mongoose defaults apply correctly
    Object.keys(applicationData).forEach(k => applicationData[k] === undefined && delete applicationData[k]);

    // Check for existing application by email
    const existing = await TutorApplication.findOne({
      email: applicationData.email?.toLowerCase().trim(),
    }).sort({ createdAt: -1 });

    if (existing) {
      const BLOCKED = ['equipment_check', 'interview_scheduled', 'approved'];
      if (BLOCKED.includes(existing.status)) {
        return res.status(409).json({
          success: false,
          alreadyApplied: true,
          message: `You have already submitted an application and it is currently under review. Please wait for our team to contact you.`,
        });
      }
      // Failed applicant — enforce 7-day cooldown
      if (existing.status === 'it_test_pending') {
        const daysSince = (Date.now() - new Date(existing.createdAt)) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) {
          const canRetry = new Date(existing.createdAt);
          canRetry.setDate(canRetry.getDate() + 7);
          const retryDate = canRetry.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          return res.status(409).json({
            success: false,
            alreadyApplied: true,
            message: `You can re-apply from ${retryDate}. Please use that time to review your tech setup.`,
          });
        }
      }
    }

    let itTestScore = 0;
    if (itTestAnswers && typeof itTestAnswers === 'object') {
      IT_TEST.forEach((q) => {
        if (parseInt(itTestAnswers[q.id]) === q.correct) itTestScore += 20;
      });
    }

    const passed = itTestScore >= 60;

    const tutorDoc = {
      ...applicationData,
      itTestAnswers,
      itTestScore,
      status: passed ? 'equipment_check' : 'it_test_pending',
    };

    if (req.file) {
      tutorDoc.cvData     = req.file.buffer;
      tutorDoc.cvFilename = req.file.originalname;
      tutorDoc.cvMimeType = req.file.mimetype;
    }

    const tutor = new TutorApplication(tutorDoc);
    await tutor.save();

    // Send emails in background — don't block the response
    notifyAdminNewApplication({
      name:           applicationData.name,
      email:          applicationData.email,
      phone:          applicationData.phone,
      location:       applicationData.location,
      qualification:  applicationData.qualification,
      experience:     applicationData.experience,
      subjects:       applicationData.subjects || [],
      grades:         applicationData.grades || [],
      availability:   applicationData.availability || [],
      linkedinUrl:    applicationData.linkedinUrl,
      equipmentNotes: applicationData.equipmentNotes,
      itTestAnswers,
      score:          itTestScore,
      passed,
      id:             tutor._id,
      cvData:         req.file?.buffer,
      cvFilename:     req.file?.originalname,
      cvMimeType:     req.file?.mimetype,
    }).catch(err => console.error('[email] admin tutor alert failed:', err.message));

    confirmApplicant({ name: applicationData.name, email: applicationData.email })
      .catch(err => console.error('[email] applicant confirm failed:', err.message));

    res.status(201).json({
      success: true,
      passed,
      score: itTestScore,
      message: passed
        ? `Great work! You scored ${itTestScore}%. Your application is moving to equipment verification. Expect a follow-up within 48 hours.`
        : `You scored ${itTestScore}%. We require 60% or above. Please review your tech setup and re-apply after 7 days.`,
      id: tutor._id,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Zoom webhook — fires after a recorded session ends
router.post('/sessions/webhook', async (req, res) => {
  try {
    const { event, payload } = req.body;
    if (event === 'recording.completed') {
      const { object } = payload;
      const recordingUrl = object.recording_files?.[0]?.download_url || null;
      await Session.findOneAndUpdate(
        { zoomMeetingId: String(object.id) },
        {
          zoomRecordingUrl: recordingUrl,
          status: 'completed',
          'assessment.processedAt': new Date(),
        }
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
