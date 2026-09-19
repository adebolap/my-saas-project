const mongoose = require('mongoose');

const resourceLeadSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, lowercase: true, trim: true },
  phone:       { type: String, trim: true },
  resourceKey: {
    type: String,
    required: true,
    enum: ['math-g2-4', 'math-g5-6', 'eng-g2-4', 'eng-g5-6'],
  },
  source:    { type: String, default: 'resource_hub' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ResourceLead', resourceLeadSchema);
