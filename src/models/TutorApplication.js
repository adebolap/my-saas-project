const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema(
  { day: String, startTime: String, endTime: String },
  { _id: false }
);

const tutorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  location: { type: String, trim: true },
  timezone: { type: String, default: 'Africa/Lagos' },
  subjects: [{ type: String, enum: ['Math', 'English', 'Science', 'Local Languages'] }],
  grades: [{ type: String, enum: ['K', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'JS1', 'JS2', 'JS3', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9'] }],
  cvData: { type: Buffer },
  cvFilename: { type: String },
  cvMimeType: { type: String },
  experience: { type: String },
  qualification: { type: String },
  availability: [availabilitySlotSchema],
  itTestScore: { type: Number, min: 0, max: 100 },
  itTestAnswers: { type: mongoose.Schema.Types.Mixed },
  equipmentVerified: { type: Boolean, default: false },
  equipmentNotes: { type: String },
  linkedinUrl:    { type: String },
  referralSource: { type: String },
  status: {
    type: String,
    enum: [
      'applied',
      'it_test_pending',
      'equipment_check',
      'interview_scheduled',
      'approved',
      'rejected',
    ],
    default: 'applied',
  },
  hoursScheduled: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TutorApplication', tutorSchema);
