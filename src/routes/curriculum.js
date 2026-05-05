const express = require('express');
const router = express.Router();
const path = require('path');

const curriculum = require(path.join(__dirname, '../../data/curriculum.json'));

router.get('/', (req, res) => res.json(curriculum));

router.get('/grade/:grade', (req, res) => {
  const grade = curriculum.grades[req.params.grade.toUpperCase()];
  if (!grade) return res.status(404).json({ error: 'Grade not found' });
  res.json(grade);
});

router.get('/grade/:grade/subject/:subject', (req, res) => {
  const grade = curriculum.grades[req.params.grade.toUpperCase()];
  if (!grade) return res.status(404).json({ error: 'Grade not found' });
  const subject = grade.subjects[req.params.subject];
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
});

module.exports = router;
