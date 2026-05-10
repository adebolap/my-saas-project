require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/leads', require('./routes/leads'));
app.use('/api/tutors', require('./routes/tutors'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/curriculum', require('./routes/curriculum'));

app.get('/apply', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/apply.html'))
);
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/admin.html'))
);
app.get('/pricing', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/pricing.html'))
);
app.get('/terms', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/terms.html'))
);
app.get('/about', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/about.html'))
);

// Serverless-safe connection cache — reuses the connection across warm invocations
let cachedConn = null;

async function connectDB() {
  if (cachedConn && mongoose.connection.readyState === 1) return cachedConn;
  cachedConn = await mongoose.connect(process.env.MONGODB_URI);
  return cachedConn;
}

if (process.env.VERCEL) {
  // On Vercel: connect lazily per request so cold starts don't fail
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      console.error('DB connection error:', err);
      res.status(503).json({ error: 'Database unavailable. Please try again.' });
    }
  });
} else {
  // Local dev: connect once then start listening
  connectDB()
    .then(() => {
      console.log('MongoDB connected');
      const port = process.env.PORT || 3000;
      app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
}

// Required by Vercel — export the Express app as the serverless handler
module.exports = app;
