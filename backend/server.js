require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const webhookRoutes = require('./routes/webhook.routes');
const apiRoutes = require('./routes/api.routes');

connectDB();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf; // Save the raw buffer for the signature check
  }
}));

app.use('/api/webhooks', webhookRoutes);
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Scanner Engine running on port ${PORT}`);
});