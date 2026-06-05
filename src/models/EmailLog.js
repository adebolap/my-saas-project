const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to:      { type: String, required: true },
  subject: { type: String, required: true },
  type:    { type: String, required: true }, // e.g. 'applicant_confirm', 'admin_application', 'parent_confirm', 'admin_booking'
  status:  { type: String, enum: ['sent', 'failed'], required: true },
  error:   { type: String },
  sentAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('EmailLog', emailLogSchema);
