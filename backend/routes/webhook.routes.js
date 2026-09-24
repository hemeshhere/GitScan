const express = require('express');
const router = express.Router();
const { handleGithubPush } = require('../controllers/webhook.controller');
const { verifyGithubSignature } = require('../middlewares/verifyGithubSignature');

// API CALL: POST /api/webhooks/github
router.post('/github', verifyGithubSignature, handleGithubPush);
module.exports = router;