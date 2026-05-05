/* =====================
   EduBridge Africa — Shared Frontend JS
   ===================== */

// ---- TOAST ----
function showToast(msg, type = 'default') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type !== 'default' ? ' ' + type : '');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = 'toast'; }, 4000);
}

// ---- MODAL ----
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) closeModal(el.id);
  });
});

// ---- GRADE PILLS (hero) ----
const gradeDescriptions = {
  P1: 'Primary 1 (age 5–6): Number recognition, basic addition/subtraction, phonics, and sight words. Building the very first learning foundations.',
  P2: 'Primary 2 (age 6–7): Numbers to 200, multiplication introduction, reading comprehension, and sentence writing.',
  P3: 'Primary 3 (age 7–8): Times tables, fractions, tenses, parts of speech — a critical year for fluency.',
  P4: 'Primary 4 (age 8–9): Long multiplication/division, decimals, advanced grammar, and creative writing.',
  P5: 'Primary 5 (age 9–10): Algebra, percentages, essay writing, and exam readiness for Common Entrance / BECE.',
};

let selectedGrade = '';

document.querySelectorAll('.grade-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.grade-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedGrade = btn.dataset.grade;
    const desc = document.getElementById('grade-desc');
    const cta  = document.getElementById('hero-grade-cta');
    if (desc) desc.textContent = gradeDescriptions[selectedGrade] || '';
    if (cta)  cta.style.display = 'block';
  });
});

// ---- BOOKING MODAL ----
function openBooking() { openModal('booking-modal'); }
function closeBooking() { closeModal('booking-modal'); }

function openBookingWithGrade() {
  openModal('booking-modal');
  if (selectedGrade) {
    const sel = document.getElementById('booking-grade');
    if (sel) sel.value = selectedGrade;
  }
}

const bookingForm = document.getElementById('booking-form');
if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = bookingForm.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const data = {};
    const fd = new FormData(bookingForm);
    data.parentName = fd.get('parentName');
    data.email      = fd.get('email');
    data.phone      = fd.get('phone') || undefined;
    data.country    = fd.get('country');
    data.childName  = fd.get('childName') || undefined;
    data.grade      = fd.get('grade');
    data.subjects   = fd.getAll('subjects');
    data.preferredDays = fd.getAll('preferredDays');
    data.preferredTime = fd.get('preferredTime') || undefined;
    data.message    = fd.get('message') || undefined;

    try {
      const res  = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        closeModal('booking-modal');
        showToast('Thank you! We will contact you within 24 hours.', 'success');
        bookingForm.reset();
      } else {
        showToast(json.message || 'Something went wrong. Please try again.', 'error');
      }
    } catch {
      showToast('Network error. Please check your connection and try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📅 Submit Booking Request';
    }
  });
}

// ---- FEEDBACK WIDGET ----
let feedbackRating = 0;
let feedbackRole   = 'parent';

document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    feedbackRole = btn.dataset.role;
  });
});

document.querySelectorAll('.star').forEach(star => {
  star.addEventListener('click', () => {
    feedbackRating = parseInt(star.dataset.val);
    document.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('active', i < feedbackRating);
    });
  });
  star.addEventListener('mouseover', () => {
    const val = parseInt(star.dataset.val);
    document.querySelectorAll('.star').forEach((s, i) => {
      s.style.color = i < val ? 'var(--gold)' : '#D5D8DC';
    });
  });
});
const starRow = document.getElementById('star-row');
if (starRow) {
  starRow.addEventListener('mouseleave', () => {
    document.querySelectorAll('.star').forEach((s, i) => {
      s.style.color = i < feedbackRating ? 'var(--gold)' : '#D5D8DC';
    });
  });
}

const feedbackForm = document.getElementById('feedback-form');
if (feedbackForm) {
  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = feedbackForm.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const data = {
      name:    document.getElementById('fb-name').value.trim() || undefined,
      email:   document.getElementById('fb-email').value.trim() || undefined,
      rating:  feedbackRating || 0,
      comment: document.getElementById('fb-comment').value.trim(),
      role:    feedbackRole,
    };

    try {
      const res  = await fetch('/api/leads/general-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Feedback sent. Thank you!', 'success');
        feedbackForm.reset();
        feedbackRating = 0;
        document.querySelectorAll('.star').forEach(s => { s.classList.remove('active'); s.style.color = ''; });
        document.querySelectorAll('.role-btn').forEach((b, i) => { b.classList.toggle('active', i === 0); });
        feedbackRole = 'parent';
      } else {
        showToast('Could not send feedback. Please try again.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Feedback';
    }
  });
}
