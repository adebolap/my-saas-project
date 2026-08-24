require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Serverless-safe connection cache — reuses the connection across warm invocations
let cachedConn = null;

async function connectDB() {
  if (cachedConn && mongoose.connection.readyState === 1) return cachedConn;
  cachedConn = await mongoose.connect(process.env.MONGODB_URI);
  return cachedConn;
}

if (process.env.VERCEL) {
  // On Vercel: connect lazily per request — must be registered BEFORE routes
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      console.error('DB connection error:', err);
      res.status(503).json({ error: 'Database unavailable. Please try again.' });
    }
  });
}

app.use('/api/leads', require('./routes/leads'));
app.use('/api/tutors', require('./routes/tutors'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/curriculum', require('./routes/curriculum'));
app.use('/api/newsletter', require('./routes/newsletter'));

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
app.get('/faq', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/faq.html'))
);
app.get('/privacy', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/privacy.html'))
);
app.get('/blog', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/blog.html'))
);
app.get('/blog/online-tutoring-nigerian-diaspora', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/blog/online-tutoring-nigerian-diaspora.html'))
);
app.get('/blog/bece-preparation-abroad', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/blog/bece-preparation-abroad.html'))
);
app.get('/blog/nigerian-curriculum-guide-diaspora', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/blog/nigerian-curriculum-guide-diaspora.html'))
);
app.get('/blog/safeguarding-children-online-tutoring', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/blog/safeguarding-children-online-tutoring.html'))
);
app.get('/blog/google-workspace-student-blogging-guide', (req, res) =>
  res.sendFile(path.join(__dirname, '../public/blog/google-workspace-student-blogging-guide.html'))
);

if (!process.env.VERCEL) {
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
