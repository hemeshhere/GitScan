const express = require('express');
const router = express.Router();
const { getRecentScans, getScanStats, scanHistoricalRepo } = require('../controllers/api.controller');

// GET /api/scans
router.get('/scans', getRecentScans);

// GET /api/stats
router.get('/stats', getScanStats);
router.post('/scan-repo', scanHistoricalRepo);

module.exports = router;