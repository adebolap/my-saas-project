require('dotenv').config();
const { notifyAdminNewLead, confirmLead, notifyAdminNewApplication, confirmApplicant } = require('./src/services/email');

async function run() {
  console.log('SMTP config:');
  console.log('  HOST:', process.env.SMTP_HOST || '(not set)');
  console.log('  PORT:', process.env.SMTP_PORT || '(not set)');
  console.log('  USER:', process.env.SMTP_USER || '(not set)');
  console.log('  PASS:', process.env.SMTP_PASS ? '***set***' : '(not set)');
  console.log('');

  console.log('Sending test booking emails...');
  await notifyAdminNewLead({
    parentName: 'Test Parent',
    email: process.env.SMTP_USER,
    phone: '+234 800 000 0000',
    country: 'UK',
    childName: 'Test Child',
    grade: 'P3',
    subjects: ['Math', 'English'],
    message: 'This is a smoke test.',
    id: 'test-lead-001',
  });
  await confirmLead({
    parentName: 'Test Parent',
    email: process.env.SMTP_USER,
    childName: 'Test Child',
    grade: 'P3',
    subjects: ['Math', 'English'],
  });

  console.log('Sending test tutor application emails...');
  await notifyAdminNewApplication({
    name: 'Test Tutor',
    email: process.env.SMTP_USER,
    subjects: ['Math', 'Science'],
    score: 80,
    passed: true,
    id: 'test-tutor-001',
  });
  await confirmApplicant({
    name: 'Test Tutor',
    email: process.env.SMTP_USER,
    score: 80,
    passed: true,
  });

  console.log('Done. Check your inbox.');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
