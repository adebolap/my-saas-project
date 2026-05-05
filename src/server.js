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

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
