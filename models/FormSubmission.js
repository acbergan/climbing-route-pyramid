// FormSubmission.js

var mongoose = require('mongoose');

var FormSubmissionSchema = new mongoose.Schema({
  email: String,
  num_ticks: Number,
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FormSubmission', FormSubmissionSchema);