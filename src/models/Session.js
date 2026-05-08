const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'TutorApplication' },
  subject: { type: String },
  grade: { type: String },
  scheduledAt: { type: Date },
  duration: { type: Number }, // minutes
  zoomMeetingId: { type: String },
  zoomRecordingUrl: { type: String },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  // Populated via Zoom webhook → AI processing pipeline
  assessment: {
    studentProgress: String,
    tutorPerformance: String,
    recommendations: [String],
    score: Number,
    processedAt: Date,
  },
  // Complexity tracking for the Discovery Dashboard
  timezoneOffset: { type: Number }, // hours difference tutor↔parent
  connectionIssues: { type: Boolean, default: false },
  feedback: {
    parentRating: { type: Number, min: 1, max: 5 },
    parentComment: String,
    studentEngagement: { type: Number, min: 1, max: 5 },
    submittedAt: Date,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Session', sessionSchema);
