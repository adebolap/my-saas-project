const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  parentName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  country: { type: String, required: true, trim: true },
  timezone: { type: String },
  childName: { type: String, trim: true },
  grade: { type: String, enum: ['P1', 'P2', 'P3', 'P4', 'P5'], required: true },
  subjects: [{ type: String, enum: ['Math', 'English', 'Science', 'Local Languages'] }],
  preferredDays: [{ type: String }],
  preferredTime: { type: String },
  message: { type: String },
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
