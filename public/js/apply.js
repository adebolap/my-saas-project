/* =====================
   EduBridge Africa — Tutor Application Page JS
   ===================== */

const STEPS = 4;
const stepLabels = [
  'Step 1 of 4: Your Profile',
  'Step 2 of 4: Equipment Check',
  'Step 3 of 4: IT Test',
  'Step 4 of 4: Result',
];
const stepSubs = ['Personal Info', 'Tech Setup', 'IT Readiness Test', 'Application Submitted'];

let currentStep = 1;
let itAnswers   = {};  // { questionId: selectedOptionIndex }

function toggleReferralOther(val) {
  const el = document.getElementById('t-referral-other');
  if (el) el.style.display = val === 'Other (please specify)' ? 'block' : 'none';
}

function onTrcnChange(val) {
  const rejectEl = document.getElementById('trcn-reject');
  if (rejectEl) rejectEl.style.display = val === 'no' ? 'block' : 'none';
}

function updateStepUI(step) {
  for (let i = 1; i <= STEPS; i++) {
    const el = document.getElementById('step-' + i);
    const dot = document.getElementById('dot-' + i);
    if (el) el.classList.toggle('active', i === step);
    if (dot) {
      dot.classList.remove('done', 'current');
      if (i < step)  dot.classList.add('done');
      if (i === step) dot.classList.add('current');
    }
  }
  const lbl = document.getElementById('step-label');
  const sub = document.getElementById('step-sublabel');
  if (lbl) lbl.textContent = stepLabels[step - 1];
  if (sub) sub.textContent = stepSubs[step - 1];
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep(step) {
  if (step === 2 && !validateStep1()) return;
  if (step === 3 && !validateStep2()) return;
  if (step === 3) renderITTest();
  updateStepUI(step);
}

function validateStep1() {
  const name = document.getElementById('t-name').value.trim();
  const email = document.getElementById('t-email').value.trim();
  const phone = document.getElementById('t-phone').value.trim();
  const qual = document.getElementById('t-qualification').value;
  const subjects = document.querySelectorAll('.t-subjects:checked').length;
  const grades = document.querySelectorAll('.t-grades:checked').length;

  const trcn = document.querySelector('input[name="trcn"]:checked')?.value;

  if (!name) { showToast('Please enter your full name.', 'error'); return false; }
  if (!email || !email.includes('@')) { showToast('Please enter a valid email address.', 'error'); return false; }
  if (!phone) { showToast('Please enter your phone number.', 'error'); return false; }
  if (!trcn) { showToast('Please confirm your TRCN registration status.', 'error'); return false; }
  if (trcn === 'no') { showToast('TRCN registration is required to apply. Please register at trcn.gov.ng and reapply.', 'error'); return false; }
  if (!qual) { showToast('Please select your qualification.', 'error'); return false; }
  if (!subjects) { showToast('Please select at least one subject.', 'error'); return false; }
  if (!grades) { showToast('Please select at least one grade.', 'error'); return false; }
  return true;
}

function validateStep2() {
  const computer = document.querySelector('input[name="eq-computer"]:checked');
  const cam = document.querySelector('input[name="eq-cam"]:checked');
  const zoom = document.querySelector('input[name="eq-zoom"]:checked');
  const space = document.querySelector('input[name="eq-space"]:checked');
  const internet = document.getElementById('t-internet').value;

  if (!computer) { showToast('Please confirm whether you have a computer.', 'error'); return false; }
  if (!cam) { showToast('Please confirm your webcam/microphone setup.', 'error'); return false; }
  if (!zoom) { showToast('Please indicate your Zoom experience.', 'error'); return false; }
  if (!space) { showToast('Please confirm your teaching space.', 'error'); return false; }
  if (!internet) { showToast('Please select your internet speed.', 'error'); return false; }
  return true;
}

// ---- IT TEST ----
const itQuestions = [
  {
    id: 1,
    text: 'Which tool would you use for a live video call with your student?',
    options: ['WhatsApp Chat only', 'Zoom or Google Meet', 'SMS', 'Email'],
    correct: 1,
  },
  {
    id: 2,
    text: 'What is the minimum internet speed recommended for online teaching?',
    options: ['1 Mbps', '5 Mbps', '10 Mbps', '50 Mbps'],
    correct: 1,
  },
  {
    id: 3,
    text: 'A student cannot hear you during a Zoom call. What do you check first?',
    options: [
      'Restart your entire computer',
      'Check that your microphone is not muted in Zoom',
      'Ask the student to leave and rejoin',
      'End the call immediately',
    ],
    correct: 1,
  },
  {
    id: 4,
    text: 'What is Google Drive primarily used for?',
    options: [
      'Video calls only',
      'Storing and sharing files in the cloud',
      'Internet browsing',
      'Sending money transfers',
    ],
    correct: 1,
  },
  {
    id: 5,
    text: 'How would you share a worksheet with a student during class?',
    options: [
      'Print it and post it to them',
      'Share your screen or send a Google Drive link in the Zoom chat',
      'Read the whole worksheet aloud only',
      'Take a photo and send it on WhatsApp after the class',
    ],
    correct: 1,
  },
];

function renderITTest() {
  const container = document.getElementById('it-questions');
  if (!container) return;

  container.innerHTML = itQuestions.map((q, qi) => `
    <div class="it-test-q" id="q-${q.id}">
      <div class="q-num">Question ${qi + 1} of ${itQuestions.length}</div>
      <div class="q-text">${q.text}</div>
      ${q.options.map((opt, oi) => `
        <button class="option-btn" data-qid="${q.id}" data-opt="${oi}" onclick="selectOption(${q.id}, ${oi}, this)">
          <span class="option-letter">${String.fromCharCode(65 + oi)}</span>
          ${opt}
        </button>
      `).join('')}
    </div>
  `).join('');
}

function selectOption(qid, optIdx, btn) {
  itAnswers[qid] = optIdx;
  const qEl = document.getElementById('q-' + qid);
  qEl.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ---- SUBMIT ----
async function submitApplication() {
  // Validate IT test — warn but allow submission
  const answered = Object.keys(itAnswers).length;
  if (answered < itQuestions.length) {
    const proceed = confirm(`You have answered ${answered} of ${itQuestions.length} IT test questions. Unanswered questions will be marked as incorrect. Submit anyway?`);
    if (!proceed) return;
  }

  const btn = document.querySelector('#step-3 .btn-navy');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const subjects  = Array.from(document.querySelectorAll('.t-subjects:checked')).map(e => e.value);
  const grades    = Array.from(document.querySelectorAll('.t-grades:checked')).map(e => e.value);
  const days      = Array.from(document.querySelectorAll('.t-days:checked')).map(e => e.value);
  const equipmentNotes = [
    'Computer: '  + (document.querySelector('input[name="eq-computer"]:checked')?.value || 'not answered'),
    'Internet: '  + (document.getElementById('t-internet')?.value || 'not answered'),
    'Cam/Mic: '   + (document.querySelector('input[name="eq-cam"]:checked')?.value || 'not answered'),
    'Zoom exp: '  + (document.querySelector('input[name="eq-zoom"]:checked')?.value || 'not answered'),
    'Space: '     + (document.querySelector('input[name="eq-space"]:checked')?.value || 'not answered'),
    document.getElementById('t-equipment-notes')?.value || '',
  ].filter(Boolean).join(' | ');

  const fd = new FormData();
  fd.append('name',           document.getElementById('t-name').value.trim());
  fd.append('email',          document.getElementById('t-email').value.trim());
  fd.append('phone',          document.getElementById('t-phone').value.trim());
  fd.append('location',       document.getElementById('t-location').value.trim());
  fd.append('qualification',  document.getElementById('t-qualification').value);
  fd.append('experience',     document.getElementById('t-experience').value);
  const referralVal   = document.getElementById('t-referral').value;
  const referralOther = document.getElementById('t-referral-other').value.trim();
  fd.append('referralSource', referralVal === 'Other (please specify)' && referralOther ? `Other: ${referralOther}` : referralVal);
  fd.append('trcnRegistered', document.querySelector('input[name="trcn"]:checked')?.value || '');
  fd.append('linkedinUrl',    document.getElementById('t-linkedin').value.trim());
  fd.append('equipmentNotes', equipmentNotes);
  fd.append('subjects',       JSON.stringify(subjects));
  fd.append('grades',         JSON.stringify(grades));
  fd.append('availability',   JSON.stringify(days.map(d => ({ day: d, startTime: '', endTime: '' }))));
  fd.append('itTestAnswers',  JSON.stringify(itAnswers));

  const cvFile = document.getElementById('t-cv')?.files?.[0];
  if (cvFile) fd.append('cv', cvFile);

  try {
    const res  = await fetch('/api/tutors', {
      method: 'POST',
      body: fd,
    });
    const json = await res.json();
    if (json.alreadyApplied) {
      renderAlreadyApplied(json.message);
      updateStepUI(4);
      return;
    }
    renderResult(json);
    updateStepUI(4);
  } catch {
    showToast('Network error. Please check your connection and try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Submit Application →';
  }
}

function renderResult(json) {
  const el = document.getElementById('score-display');
  if (!el) return;

  const passed = json.passed;
  const score  = json.score ?? 0;

  el.innerHTML = `
    <div class="score-circle ${passed ? 'pass' : 'fail'}">
      <span>${score}%</span>
      <small>IT Score</small>
    </div>
    <h2 style="color:var(--navy);font-size:1.3rem;font-weight:800;margin-bottom:12px;">
      ${passed ? '🎉 Application Received!' : '📚 Keep Practising'}
    </h2>
    <p style="color:var(--muted);max-width:420px;margin:0 auto 24px;font-size:0.95rem;">
      ${json.message}
    </p>
    ${passed ? `
      <div style="background:#EAFAF1;border-radius:10px;padding:20px;max-width:380px;margin:0 auto;text-align:left;">
        <p style="font-size:0.875rem;font-weight:700;color:var(--green);margin-bottom:8px;">Next Steps:</p>
        <ul style="list-style:none;font-size:0.875rem;color:var(--text);">
          <li style="margin-bottom:8px;">✓ We will review your application within 48 hours</li>
          <li style="margin-bottom:8px;">✓ You'll receive an email with further instructions</li>
          <li>✓ Equipment verification call will be scheduled</li>
        </ul>
      </div>
    ` : `
      <div style="background:#FEF9E7;border-radius:10px;padding:20px;max-width:380px;margin:0 auto;text-align:left;">
        <p style="font-size:0.875rem;font-weight:700;color:#9A7D0A;margin-bottom:8px;">Tips to improve:</p>
        <ul style="list-style:none;font-size:0.875rem;color:var(--text);">
          <li style="margin-bottom:8px;">• Download Zoom and practise using it</li>
          <li style="margin-bottom:8px;">• Explore Google Drive and Google Meet</li>
          <li>• Re-apply after 7 days when you're ready</li>
        </ul>
      </div>
    `}
    <a href="/" class="btn btn-navy mt-8" style="margin-top:24px;display:inline-flex;">← Back to Home</a>
  `;
}

function renderAlreadyApplied(message) {
  const el = document.getElementById('score-display');
  if (!el) return;
  el.innerHTML = `
    <div style="font-size:3rem;margin-bottom:16px;">📋</div>
    <h2 style="color:var(--navy);font-size:1.3rem;font-weight:800;margin-bottom:12px;">Application Already Submitted</h2>
    <p style="color:var(--muted);max-width:420px;margin:0 auto 24px;font-size:0.95rem;">${message}</p>
    <a href="/" class="btn btn-navy" style="display:inline-flex;">← Back to Home</a>
  `;
}
