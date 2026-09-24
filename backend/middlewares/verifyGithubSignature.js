const crypto = require('crypto');

exports.verifyGithubSignature = (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(401).send("Unauthorized: Missing signature");
  }
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

  if (signature.length !== digest.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
    console.error("Webhook signature mismatch!");
    return res.status(401).send("Unauthorized: Signature mismatch");
  }

  next();
};