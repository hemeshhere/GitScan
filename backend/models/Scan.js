const mongoose = require('mongoose');

const leakSchema = new mongoose.Schema({
  file: { type: String, required: true },
  lineNumber: { type: Number, required: true },
  ruleId: { type: String, required: true },
  ruleName: { type: String, required: true },
  severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], required: true },
  maskedSecret: { type: String, required: true },
  contextSnippet: { type: String, required: true }
});

const scanSchema = new mongoose.Schema({
  repository: { type: String, required: true },
  commitId: { type: String, required: true, index: true },
  authorEmail: { type: String, required: true },
  status: { type: String, enum: ['CLEAN', 'LEAK_DETECTED', 'FAILED'], required: true },
  leaks: [leakSchema], 
  scannedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scan', scanSchema);