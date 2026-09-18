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

// Wrap multer so a bad/missing file never blocks the route handler
const uploadCV = (req, res, next) => {
  upload.single('cv')(req, res, (err) => {
    if (err) console.warn('[upload] CV parse error:', err.message);
    next();
  });
};

// weight: 1 = general IT, 3 = Google Meet / Classroom (higher weight = more impact on score)
const IT_TEST = [
  {
    id: 6,
    question: 'You are screen-sharing in Google Meet and a student says they can only see your desktop wallpaper, not the document you have open. What do you do?',
    options: [
      'End the screen share and share again, this time selecting the specific window or tab',
      'Ask the student to refresh their browser',
      'Restart Google Meet',
      'Switch to a different browser',
    ],
    correct: 0,
    weight: 3,
  },
  {
    id: 1,
    question: 'Which tool would you use for a video call with your student?',
    options: ['WhatsApp Chat only', 'Zoom or Google Meet', 'SMS', 'Email'],
    correct: 1,
    weight: 1,
  },
  {
    id: 9,
    question: 'The record button is missing from your Google Meet session. What is the most likely reason?',
    options: [
      'You need to update your browser',
      'Recording only works in Google Chrome',
      'Recording requires a Google Workspace account (it is not available on a free Gmail account)',
      'The meeting was started from a phone',
    ],
    correct: 2,
    weight: 3,
  },
  {
    id: 2,
    question: 'What is the minimum internet speed recommended for online teaching?',
    options: ['1 Mbps', '5 Mbps', '10 Mbps', '50 Mbps'],
    correct: 1,
    weight: 1,
  },
  {
    id: 7,
    question: 'You want each student to have their own editable copy of a worksheet in Google Classroom. Which attachment setting do you choose?',
    options: [
      'View only',
      'Edit, so everyone works on the same document together',
      'Make a copy for each student',
      'Download and email to each student individually',
    ],
    correct: 2,
    weight: 3,
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
    weight: 1,
  },
  {
    id: 11,
    question: 'You want to leave a private feedback message for one student on their work without the rest of the class seeing it. How do you do this in Google Classroom?',
    options: [
      "Post a class announcement and include the student's name",
      "Use the private comment box on that student's submission inside the assignment",
      'Email them directly from Gmail instead',
      'Create a separate classroom just for that student',
    ],
    correct: 1,
    weight: 3,
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
    weight: 1,
  },
  {
    id: 8,
    question: 'A student submits a Google Classroom assignment but it shows as "Missing" instead of "Turned in." What most likely happened?',
    options: [
      "The student's account was suspended",
      'They submitted after the due date, so Classroom marked it Missing before the late submission registered',
      'The file was too large to upload',
      'The assignment had already been graded',
    ],
    correct: 1,
    weight: 3,
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
    weight: 1,
  },
  {
    id: 10,
    question: 'You post a Google Form quiz on Google Classroom but students are seeing the correct answers immediately after submitting. What setting did you miss?',
    options: [
      'You forgot to set a due date on the assignment',
      'In Google Forms you left "Release grade immediately after each submission" on instead of "After manual review"',
      'The quiz was posted as a question, not an assignment',
      'Students need to be removed and re-added to the class',
    ],
    correct: 1,
    weight: 3,
  },
  {
    id: 12,
    question: "During a Google Meet class a student's audio keeps cutting out. You have asked them to check their microphone but the problem continues. What do you do next to keep the lesson going?",
    options: [
      'Ask them to type responses in the chat and continue the lesson without interrupting the class',
      'End the call and reschedule the lesson',
      'Ask all other students to leave the call',
      'Mute all participants one by one to find the source',
    ],
    correct: 0,
    weight: 3,
  },
];

router.get('/it-test', (req, res) => {
  res.json(IT_TEST.map(({ id, question, options }) => ({ id, question, options })));
});

router.post('/', uploadCV, async (req, res) => {
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
      trcnRegistered: body.trcnRegistered,
      linkedinUrl:    body.linkedinUrl,
      referralSource: body.referralSource,
      equipmentNotes: body.equipmentNotes,
      subjects,
      grades,
      availability,
    };

    // Strip undefined keys so Mongoose defaults apply correctly
    Object.keys(applicationData).forEach(k => applicationData[k] === undefined && delete applicationData[k]);

    // Check for existing application by email
    const TEST_EMAILS = ['kutegypsy@yahoo.ca'];
    const isTestEmail = TEST_EMAILS.includes(applicationData.email?.toLowerCase().trim());

    const existing = !isTestEmail && await TutorApplication.findOne({
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
      // Failed applicant: enforce 7-day cooldown
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

    let earnedWeight = 0;
    const totalWeight = IT_TEST.reduce((sum, q) => sum + q.weight, 0);
    if (itTestAnswers && typeof itTestAnswers === 'object') {
      IT_TEST.forEach((q) => {
        if (parseInt(itTestAnswers[q.id]) === q.correct) earnedWeight += q.weight;
      });
    }
    const itTestScore = Math.round((earnedWeight / totalWeight) * 100);

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

    // Await emails before responding: Vercel freezes the function on res.json()
    // which kills any in-flight HTTP connections (TLS disconnect)
    await Promise.allSettled([
      notifyAdminNewApplication({
        name:           applicationData.name,
        email:          applicationData.email,
        phone:          applicationData.phone,
        location:       applicationData.location,
        qualification:  applicationData.qualification,
        experience:     applicationData.experience,
        trcnRegistered: applicationData.trcnRegistered,
        subjects:       applicationData.subjects || [],
        grades:         applicationData.grades || [],
        availability:   applicationData.availability || [],
        linkedinUrl:    applicationData.linkedinUrl,
        referralSource: applicationData.referralSource,
        equipmentNotes: applicationData.equipmentNotes,
        itTestAnswers,
        score:          itTestScore,
        passed,
        id:             tutor._id,
        cvData:         req.file?.buffer,
        cvFilename:     req.file?.originalname,
        cvMimeType:     req.file?.mimetype,
      }),
      confirmApplicant({ name: applicationData.name, email: applicationData.email }),
    ]);

    res.status(201).json({
      success: true,
      passed,
      score: itTestScore,
      message: passed
        ? `You scored ${itTestScore}%. Your application has been received and is under review. If your profile is a match for our current needs, our team will be in touch.`
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

// Zoom webhook: fires after a recorded session ends
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
