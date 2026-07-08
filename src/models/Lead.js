const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  parentName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  country: { type: String, required: true, trim: true },
  timezone: { type: String },
  childName: { type: String, trim: true },
  grade: { type: String, enum: ['K', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9'], required: true },
  package: { type: String, enum: ['Bright Start', 'Rising Stars', 'Academic Achievers', 'Homework Helpers', 'Success Squad', ''] },
  subjects: [{ type: String, enum: ['Math', 'English', 'Science', 'Local Languages'] }],
  preferredDays: [{ type: String }],
  preferredTime: { type: String },
  message: { type: String },
  referralCode: { type: String },
  status: {
    type: String,
    enum: ['new', 'contacted', 'booked', 'active', 'churned'],
    default: 'new',
  },
  assignedTutor: { type: mongoose.Schema.Types.ObjectId, ref: 'TutorApplication' },
  source: { type: String, default: 'landing_page' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Lead', leadSchema);
