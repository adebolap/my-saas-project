const express = require('express');
const router = express.Router();
const TutorApplication = require('../models/TutorApplication');
const Session = require('../models/Session');

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

router.post('/', async (req, res) => {
  try {
    const { itTestAnswers, ...applicationData } = req.body;

    let itTestScore = 0;
    if (itTestAnswers && typeof itTestAnswers === 'object') {
      IT_TEST.forEach((q) => {
        if (parseInt(itTestAnswers[q.id]) === q.correct) itTestScore += 20;
      });
    }

    const passed = itTestScore >= 60;
    const tutor = new TutorApplication({
      ...applicationData,
      itTestAnswers,
      itTestScore,
      status: passed ? 'equipment_check' : 'it_test_pending',
    });
    await tutor.save();

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
