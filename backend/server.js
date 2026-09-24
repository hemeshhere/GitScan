require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Make sure this path matches your actual file structure
const webhookRoutes = require('./routes/webhook.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf; // Save the raw buffer for the signature check
  }
}));

app.use('/api/webhooks', webhookRoutes);

app.listen(PORT, () => {
  console.log(`Scanner Engine running on port ${PORT}`);
});