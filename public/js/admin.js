/* =====================
   EduBridge Africa — Admin Dashboard JS
   ===================== */

let adminToken = '';

function adminLogin() {
  const token = document.getElementById('admin-token-input').value.trim();
  if (!token) { showToast('Please enter an admin token.', 'error'); return; }
  adminToken = token;
  document.getElementById('login-gate').style.display = 'none';
  document.getElementById('dashboard-content').style.display = 'block';
  document.getElementById('auth-section').innerHTML =
    `<span style="color:rgba(255,255,255,0.6);font-size:0.8rem;">Authenticated</span>
     <button class="btn btn-outline btn-sm" onclick="adminLogout()">Logout</button>`;
  loadDashboard();
  loadLeads();
  loadTutors();
  loadSessions();
  loadEmailLogs();
  renderShortlist();
  loadFeedback();
}

function adminLogout() {
  adminToken = '';
  location.reload();
}

function apiHeaders() {
  return { 'Content-Type': 'application/json', 'x-admin-token': adminToken };
}

async function loadDashboard() {
  try {
    const res  = await fetch('/api/admin/dashboard', { headers: apiHeaders() });
    if (!res.ok) { showToast('Auth failed. Check your token.', 'error'); return; }
    const data = await res.json();

    document.getElementById('m-leads').textContent     = data.metrics.totalLeads;
    document.getElementById('m-new-leads').textContent = data.metrics.newLeads + ' new';
    document.getElementById('m-tutors').textContent    = data.metrics.totalTutors;
    document.getElementById('m-approved').textContent  = data.metrics.approvedTutors + ' approved';
    document.getElementById('m-sessions').textContent  = data.metrics.totalSessions;
    document.getElementById('m-completed').textContent = data.metrics.completedSessions + ' completed';

    renderBarChart('grade-chart', data.gradeBreakdown);
    renderBarChart('subject-chart', data.subjectDemand);
    renderBarChart('country-chart', data.countryBreakdown);
  } catch (err) {
    showToast('Error loading dashboard: ' + err.message, 'error');
  }
}

function renderBarChart(containerId, data) {
  const el = document.getElementById(containerId);
  if (!el || !data || !data.length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:0.8rem;text-align:center;padding:20px 0;">No data yet</p>';
    return;
  }
  const max = Math.max(...data.map(d => d.count));
  el.innerHTML = data.map(d => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="min-width:80px;font-size:0.75rem;font-weight:600;color:var(--text);text-overflow:ellipsis;overflow:hidden;white-space:nowrap;" title="${d._id}">${d._id}</span>
      <div style="flex:1;background:var(--bg);border-radius:4px;height:18px;overflow:hidden;">
        <div style="width:${Math.round((d.count / max) * 100)}%;background:var(--navy);height:100%;border-radius:4px;transition:width 0.5s;"></div>
      </div>
      <span style="font-size:0.75rem;font-weight:700;color:var(--navy);min-width:20px;">${d.count}</span>
    </div>
  `).join('');
}

// ---- LEADS ----
async function loadLeads() {
  try {
    const res  = await fetch('/api/admin/leads', { headers: apiHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('leads-tbody');

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:32px;">No leads yet. Share the landing page!</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(l => `
      <tr>
        <td>
          <strong>${esc(l.parentName)}</strong><br>
          <small style="color:var(--muted);">${esc(l.email)}</small>
        </td>
        <td>${esc(l.childName || '—')}</td>
        <td><span style="font-weight:700;color:var(--navy);">${l.grade}</span></td>
        <td style="font-size:0.8rem;">${(l.subjects || []).join(', ') || '—'}</td>
        <td>${esc(l.country)}</td>
        <td style="font-size:0.75rem;font-family:monospace;color:${l.referralCode ? 'var(--navy)' : 'var(--muted)'};">${l.referralCode ? esc(l.referralCode) : '—'}</td>
        <td><span class="status-badge status-${l.status}">${l.status}</span></td>
        <td style="font-size:0.8rem;color:var(--muted);">${fmtDate(l.createdAt)}</td>
        <td>
          <select onchange="updateLeadStatus('${l._id}', this.value)" style="font-size:0.75rem;padding:4px 8px;border:1px solid var(--border);border-radius:4px;cursor:pointer;">
            ${['new','contacted','booked','active','churned'].map(s =>
              `<option value="${s}" ${s === l.status ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
          <button onclick="sendReviewEmail('${l._id}')" style="margin-top:6px;display:block;width:100%;font-size:0.7rem;padding:3px 8px;background:none;border:1px solid var(--border);border-radius:4px;color:var(--navy);cursor:pointer;">&#11088; Ask for review</button>
          <button onclick="deleteLead('${l._id}', this)" style="margin-top:4px;display:block;width:100%;font-size:0.7rem;padding:3px 8px;background:none;border:1px solid #e57373;border-radius:4px;color:#c0392b;cursor:pointer;">&#128465; Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Error loading leads: ' + err.message, 'error');
  }
}

async function updateLeadStatus(id, status) {
  try {
    await fetch('/api/admin/leads/' + id, {
      method: 'PATCH',
      headers: apiHeaders(),
      body: JSON.stringify({ status }),
    });
    showToast('Lead status updated.', 'success');
  } catch {
    showToast('Failed to update lead.', 'error');
  }
}

async function deleteLead(id, btn) {
  if (!confirm('Delete this booking record? This cannot be undone.')) return;
  try {
    const res = await fetch('/api/admin/leads/' + id, {
      method: 'DELETE',
      headers: apiHeaders(),
    });
    if (!res.ok) throw new Error();
    btn.closest('tr').remove();
    showToast('Record deleted.', 'success');
  } catch {
    showToast('Failed to delete record.', 'error');
  }
}

async function sendReviewEmail(id) {
  try {
    const res = await fetch('/api/admin/leads/' + id + '/review', {
      method: 'POST',
      headers: apiHeaders(),
    });
    if (!res.ok) throw new Error();
    showToast('Review request sent.', 'success');
  } catch {
    showToast('Failed to send review request.', 'error');
  }
}

// ---- TUTORS ----
async function loadTutors() {
  try {
    const res  = await fetch('/api/admin/tutors', { headers: apiHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('tutors-tbody');

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px;">No tutor applications yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(t => `
      <tr>
        <td>
          <strong>${esc(t.name)}</strong><br>
          <small style="color:var(--muted);">${esc(t.location || '—')}</small>
        </td>
        <td style="font-size:0.8rem;">${esc(t.email)}</td>
        <td style="font-size:0.8rem;">${(t.subjects || []).join(', ') || '—'}</td>
        <td style="font-size:0.8rem;">${(t.grades || []).join(', ') || '—'}</td>
        <td>
          <span style="font-weight:700;color:${(t.itTestScore || 0) >= 60 ? 'var(--green)' : '#C0392B'};">
            ${t.itTestScore != null ? t.itTestScore + '%' : '—'}
          </span>
        </td>
        <td><span class="status-badge status-${statusClass(t.status)}">${t.status.replace(/_/g, ' ')}</span></td>
        <td style="font-size:0.8rem;color:var(--muted);">${fmtDate(t.createdAt)}</td>
        <td>
          <select onchange="updateTutorStatus('${t._id}', this.value)" style="font-size:0.75rem;padding:4px 8px;border:1px solid var(--border);border-radius:4px;cursor:pointer;">
            ${['applied','it_test_pending','equipment_check','interview_scheduled','approved','rejected'].map(s =>
              `<option value="${s}" ${s === t.status ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`
            ).join('')}
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Error loading tutors: ' + err.message, 'error');
  }
}

async function updateTutorStatus(id, status) {
  try {
    await fetch('/api/admin/tutors/' + id, {
      method: 'PATCH',
      headers: apiHeaders(),
      body: JSON.stringify({ status }),
    });
    showToast('Tutor status updated.', 'success');
  } catch {
    showToast('Failed to update tutor.', 'error');
  }
}

// ---- SESSIONS ----
async function loadSessions() {
  try {
    const res  = await fetch('/api/admin/sessions', { headers: apiHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('sessions-tbody');

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px;">No sessions yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(s => `
      <tr>
        <td>${esc(s.lead?.childName || s.lead?.parentName || '—')}</td>
        <td>${esc(s.tutor?.name || '—')}</td>
        <td>${esc(s.subject || '—')}</td>
        <td>${esc(s.grade || '—')}</td>
        <td style="font-size:0.8rem;color:var(--muted);">${s.scheduledAt ? fmtDate(s.scheduledAt) : '—'}</td>
        <td><span class="status-badge status-${statusClass(s.status)}">${s.status}</span></td>
        <td>${s.feedback?.parentRating ? '⭐'.repeat(s.feedback.parentRating) : '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Error loading sessions: ' + err.message, 'error');
  }
}

// ---- EMAIL LOG ----
const EMAIL_TYPE_LABELS = {
  applicant_confirm: { label: 'Application Confirmation', color: '#1E5A3A' },
  admin_application: { label: 'Application Alert (Admin)', color: '#3A3A8C' },
  parent_confirm:    { label: 'Booking Confirmation', color: '#B45309' },
  admin_booking:     { label: 'Booking Alert (Admin)', color: '#6B3A8C' },
  review_request:    { label: 'Review Request', color: '#F5A623' },
  other:             { label: 'Other', color: '#666' },
};

let _allEmailLogs = [];
let _emailFilter  = 'today';

async function loadEmailLogs() {
  try {
    // Auto-purge logs older than 90 days
    fetch('/api/admin/email-logs/purge', { method: 'DELETE', headers: apiHeaders() }).catch(() => {});

    const res  = await fetch('/api/admin/email-logs', { headers: apiHeaders() });
    _allEmailLogs = await res.json();
    renderEmailLogs();
  } catch (err) {
    showToast('Error loading email logs: ' + err.message, 'error');
  }
}

function filterEmailLogs(range, btn) {
  _emailFilter = range;
  document.querySelectorAll('.email-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderEmailLogs();
}

function renderEmailLogs() {
  const tbody = document.getElementById('emails-tbody');
  const countEl = document.getElementById('email-log-count');
  const now = new Date();

  const filtered = _allEmailLogs.filter(e => {
    if (_emailFilter === 'all') return true;
    const sent = new Date(e.sentAt);
    const diffDays = (now - sent) / 86400000;
    if (_emailFilter === 'today') return diffDays < 1;
    if (_emailFilter === '7d')   return diffDays < 7;
    if (_emailFilter === '30d')  return diffDays < 30;
    return true;
  });

  if (countEl) countEl.textContent = filtered.length + ' record' + (filtered.length !== 1 ? 's' : '');

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px;">No emails in this period.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(e => {
    const meta  = EMAIL_TYPE_LABELS[e.type] || EMAIL_TYPE_LABELS.other;
    const badge = e.status === 'sent'
      ? '<span style="color:#1E5A3A;font-weight:700;font-size:0.8rem;">✓ Sent</span>'
      : `<span style="color:#C0392B;font-weight:700;font-size:0.8rem;" title="${esc(e.error || '')}">✗ Failed</span>`;
    return `
      <tr>
        <td style="font-size:0.8rem;color:var(--muted);white-space:nowrap;">${fmtDateTime(e.sentAt)}</td>
        <td style="font-size:0.85rem;">${esc(e.to)}</td>
        <td><span style="font-size:0.75rem;font-weight:700;color:${meta.color};background:${meta.color}18;padding:3px 8px;border-radius:20px;white-space:nowrap;">${meta.label}</span></td>
        <td style="font-size:0.8rem;color:var(--muted);">${esc(e.subject)}</td>
        <td>${badge}</td>
      </tr>`;
  }).join('');
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---- CV SCREENER ----
const MAX_CV_BATCH = 10;
let cvFiles = [];

function cvDragOver(e) {
  e.preventDefault();
  const z = document.getElementById('cv-drop-zone');
  z.style.borderColor = 'var(--navy)';
  z.style.background  = 'var(--white)';
}
function cvDragLeave() {
  const z = document.getElementById('cv-drop-zone');
  z.style.borderColor = 'var(--border)';
  z.style.background  = 'var(--bg)';
}
function cvDrop(e) {
  e.preventDefault();
  cvDragLeave();
  setCVFiles(Array.from(e.dataTransfer.files));
}
function cvFileSelected(input) {
  if (input.files.length) setCVFiles(Array.from(input.files));
}
function setCVFiles(files) {
  if (files.length > MAX_CV_BATCH) {
    showToast(`Max ${MAX_CV_BATCH} CVs per batch. First ${MAX_CV_BATCH} selected.`, 'error');
    files = files.slice(0, MAX_CV_BATCH);
  }
  cvFiles = files;
  const label = files.length === 1 ? `✓ ${files[0].name}` : `✓ ${files.length} CVs selected`;
  document.getElementById('cv-drop-label').textContent = label;
  document.getElementById('cv-drop-zone').style.borderColor = 'var(--navy)';
  document.getElementById('cv-screen-btn').style.display = 'block';
  document.getElementById('cv-screen-btn').textContent = files.length === 1 ? 'Screen this CV →' : `Screen ${files.length} CVs →`;
  document.getElementById('cv-verdict').style.display = 'none';
  document.getElementById('cv-progress').style.display = 'none';

  const listEl = document.getElementById('cv-file-list');
  listEl.style.display = 'block';
  listEl.innerHTML = files.map((f, i) =>
    `<div id="cv-file-row-${i}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px;font-size:0.85rem;">
      <span id="cv-file-status-${i}" style="font-size:1rem;">⏳</span>
      <span style="flex:1;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(f.name)}</span>
      <span id="cv-file-rec-${i}" style="font-size:0.75rem;font-weight:700;"></span>
    </div>`
  ).join('');
}

async function screenCVs() {
  if (!cvFiles.length) return;
  const btn = document.getElementById('cv-screen-btn');
  btn.disabled = true;

  document.getElementById('cv-verdict').style.display = 'none';
  const progressEl = document.getElementById('cv-progress');

  const results = [];
  for (let i = 0; i < cvFiles.length; i++) {
    btn.textContent = `Screening ${i + 1} of ${cvFiles.length}…`;
    progressEl.style.display = 'block';
    progressEl.innerHTML = `<div style="background:var(--bg);border-radius:8px;height:8px;overflow:hidden;">
      <div style="width:${Math.round(((i) / cvFiles.length) * 100)}%;background:var(--navy);height:100%;border-radius:8px;transition:width 0.4s;"></div>
    </div>
    <p style="font-size:0.8rem;color:var(--muted);margin-top:6px;text-align:center;">Screening ${i + 1} of ${cvFiles.length} — please wait…</p>`;

    document.getElementById(`cv-file-status-${i}`).textContent = '🔄';
    const fd = new FormData();
    fd.append('cv', cvFiles[i]);
    try {
      const res  = await fetch('/api/admin/screen-cv', { method: 'POST', headers: { 'x-admin-token': adminToken }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      results.push({ file: cvFiles[i].name, ...data });
      const recIcon = data.recommendation === 'Shortlist' ? '✅' : data.recommendation === 'Maybe' ? '🔶' : '❌';
      const recColor = data.recommendation === 'Shortlist' ? '#1E5A3A' : data.recommendation === 'Maybe' ? '#B45309' : '#C0392B';
      document.getElementById(`cv-file-status-${i}`).textContent = recIcon;
      document.getElementById(`cv-file-rec-${i}`).style.color = recColor;
      document.getElementById(`cv-file-rec-${i}`).textContent = data.recommendation || '';
    } catch (err) {
      document.getElementById(`cv-file-status-${i}`).textContent = '⚠️';
      document.getElementById(`cv-file-rec-${i}`).textContent = 'Error';
      results.push({ file: cvFiles[i].name, error: err.message });
    }
  }

  progressEl.innerHTML = `<p style="font-size:0.85rem;font-weight:700;color:var(--navy);text-align:center;margin-top:4px;">
    ✓ Done — ${results.filter(r => r.recommendation === 'Shortlist').length} Shortlist · ${results.filter(r => r.recommendation === 'Maybe').length} Maybe · ${results.filter(r => r.recommendation === 'Reject').length} Reject
  </p>`;

  if (cvFiles.length === 1) {
    renderVerdict(results[0]);
  } else {
    renderBulkResults(results);
  }

  btn.disabled = false;
  btn.textContent = cvFiles.length === 1 ? 'Screen this CV →' : `Screen ${cvFiles.length} CVs →`;
}

function renderBulkResults(results) {
  const el = document.getElementById('cv-verdict');
  el.style.display = 'block';
  const recColor = r => r === 'Shortlist' ? '#1E5A3A' : r === 'Maybe' ? '#B45309' : '#C0392B';
  const recIcon  = r => r === 'Shortlist' ? '✅' : r === 'Maybe' ? '🔶' : '❌';
  el.innerHTML = `
    <h4 style="color:var(--navy);font-size:0.9rem;font-weight:800;margin-bottom:12px;">Screening Results</h4>
    ${results.map((v, i) => v.error
      ? `<div style="padding:14px 16px;background:#FDEDEC;border-radius:8px;margin-bottom:8px;font-size:0.85rem;color:#C0392B;">⚠️ <strong>${esc(v.file)}</strong> — ${esc(v.error)}</div>`
      : `<div style="background:var(--white);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:10px;">
          <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:180px;">
              <div style="font-weight:800;color:var(--navy);font-size:0.9rem;">${esc(v.name || v.file)}</div>
              <div style="font-size:0.78rem;color:var(--muted);margin-top:2px;">${esc(v.qualification || '—')} · ${esc(v.location || '—')}</div>
              <div style="font-size:0.78rem;color:var(--muted);margin-top:1px;">${(v.subjects||[]).join(', ')||'—'} · ${v.nigeriaBase ? '<span style="color:#1E5A3A;">Nigeria ✓</span>' : '<span style="color:#C0392B;">Not Nigeria</span>'}</div>
              <div style="font-size:0.78rem;color:var(--muted);margin-top:2px;font-style:italic;">${esc(v.summary||'')}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
              <span style="font-size:0.8rem;font-weight:800;color:${recColor(v.recommendation)};">${recIcon(v.recommendation)} ${v.recommendation}</span>
              ${v.recommendation !== 'Reject' ? `<button class="btn btn-sm" style="font-size:0.75rem;padding:4px 12px;background:var(--navy);color:var(--white);border:none;border-radius:6px;cursor:pointer;" onclick='addToShortlist(${JSON.stringify(v)})'>+ Shortlist</button>` : ''}
            </div>
          </div>
        </div>`
    ).join('')}
    <button class="btn btn-sm" style="margin-top:8px;border:1px solid var(--border);background:var(--white);color:var(--navy);cursor:pointer;" onclick="resetScreener()">&#8592; Screen another batch</button>`;
}

function renderVerdict(v) {
  const el  = document.getElementById('cv-verdict');
  const rec = v.recommendation || 'Unknown';
  const colors = {
    Shortlist: { fg: '#1E5A3A', bg: '#EAFAF1', icon: '✅' },
    Maybe:     { fg: '#B45309', bg: '#FEF9E7', icon: '🔶' },
    Reject:    { fg: '#C0392B', bg: '#FDEDEC', icon: '❌' },
  };
  const c = colors[rec] || { fg: '#555', bg: '#f5f5f5', icon: '❓' };

  el.style.display = 'block';
  el.innerHTML = `
    <div style="background:${c.bg};border:1.5px solid ${c.fg}30;border-radius:12px;padding:28px;">

      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap;">
        <div style="font-size:2.2rem;line-height:1;">${c.icon}</div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:${c.fg};text-transform:uppercase;letter-spacing:1px;">Recommendation</div>
          <div style="font-size:1.5rem;font-weight:900;color:${c.fg};">${rec}</div>
        </div>
        <div style="margin-left:auto;text-align:right;">
          <div style="font-size:1rem;font-weight:800;color:var(--navy);">${esc(v.name || '—')}</div>
          <div style="font-size:0.8rem;color:var(--muted);">${esc(v.location || '—')}</div>
        </div>
      </div>

      <p style="color:var(--text);font-size:0.9rem;line-height:1.65;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid ${c.fg}20;">
        ${esc(v.summary || '—')}
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;font-size:0.85rem;">
        <div>
          <div style="color:var(--muted);font-size:0.7rem;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Qualification</div>
          <strong>${esc(v.qualification || '—')}</strong>
        </div>
        <div>
          <div style="color:var(--muted);font-size:0.7rem;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Experience</div>
          <strong>${esc(v.experience || '—')}</strong>
        </div>
        <div>
          <div style="color:var(--muted);font-size:0.7rem;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Subjects</div>
          <strong>${(v.subjects || []).join(', ') || '—'}</strong>
        </div>
        <div>
          <div style="color:var(--muted);font-size:0.7rem;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Nigeria-Based</div>
          <strong style="color:${v.nigeriaBase ? '#1E5A3A' : '#C0392B'};">${v.nigeriaBase ? '✓ Yes' : '✗ No / Unclear'}</strong>
        </div>
        <div style="grid-column:1/-1;">
          <div style="color:var(--muted);font-size:0.7rem;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Availability Signal</div>
          <strong>${esc(v.availabilitySignal || 'Not mentioned')}</strong>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:0.85rem;margin-bottom:20px;">
        <div>
          <div style="font-weight:700;color:#1E5A3A;margin-bottom:8px;">Strengths</div>
          ${(v.strengths || []).map(s => `<div style="margin-bottom:6px;color:var(--text);">✓ ${esc(s)}</div>`).join('')}
        </div>
        <div>
          <div style="font-weight:700;color:#C0392B;margin-bottom:8px;">Concerns</div>
          ${(v.concerns || []).map(c => `<div style="margin-bottom:6px;color:var(--text);">• ${esc(c)}</div>`).join('')}
        </div>
      </div>

      ${v.nextStep ? `
      <div style="padding-top:16px;border-top:1px solid ${c.fg}20;font-size:0.875rem;">
        <span style="font-weight:700;color:var(--navy);">Suggested next step:</span> ${esc(v.nextStep)}
      </div>` : ''}

      <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
        ${rec !== 'Reject' ? `<button class="btn btn-sm btn-navy" onclick='addToShortlist(${JSON.stringify(v)})'>+ Add to Shortlist</button>` : ''}
        <button class="btn btn-sm" style="border:1px solid var(--border);background:var(--white);color:var(--navy);cursor:pointer;" onclick="resetScreener()">&#8592; Screen another CV</button>
      </div>
    </div>`;
}

// ---- SHORTLIST ----
const SHORTLIST_KEY = 'tv_shortlist';

function getShortlist() {
  try { return JSON.parse(localStorage.getItem(SHORTLIST_KEY) || '[]'); } catch { return []; }
}
function saveShortlist(list) {
  localStorage.setItem(SHORTLIST_KEY, JSON.stringify(list));
}

function addToShortlist(v) {
  const list = getShortlist();
  list.push({
    firstName:      v.firstName || v.name?.split(' ')[0] || '—',
    lastName:       v.lastName  || v.name?.split(' ').slice(1).join(' ') || '—',
    email:          v.email     || '',
    phone:          v.phone     || '',
    subjects:       (v.subjects || []).join(', '),
    recommendation: v.recommendation || '',
    shortlistedAt:  new Date().toISOString(),
  });
  saveShortlist(list);
  renderShortlist();
  showToast('Added to shortlist ✓', 'success');
}

function removeFromShortlist(idx) {
  const list = getShortlist();
  list.splice(idx, 1);
  saveShortlist(list);
  renderShortlist();
}

function clearShortlist() {
  if (!confirm('Clear all shortlisted candidates?')) return;
  saveShortlist([]);
  renderShortlist();
}

function renderShortlist() {
  const list  = getShortlist();
  const tbody = document.getElementById('shortlist-tbody');
  const count = document.getElementById('shortlist-count');
  if (count) count.textContent = list.length + ' candidate' + (list.length !== 1 ? 's' : '') + ' shortlisted';
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:28px;font-size:0.875rem;">No candidates shortlisted yet. Screen a CV and click "Add to Shortlist".</td></tr>';
    return;
  }
  const recColor = r => r === 'Shortlist' ? '#1E5A3A' : r === 'Maybe' ? '#B45309' : '#555';
  tbody.innerHTML = list.map((c, i) => `
    <tr>
      <td><strong>${esc(c.firstName)}</strong></td>
      <td>${esc(c.lastName)}</td>
      <td style="font-size:0.8rem;">${esc(c.email) || '<span style="color:var(--muted);">—</span>'}</td>
      <td style="font-size:0.8rem;">${esc(c.phone) || '<span style="color:var(--muted);">—</span>'}</td>
      <td style="font-size:0.8rem;">${esc(c.subjects) || '—'}</td>
      <td><span style="font-size:0.75rem;font-weight:700;color:${recColor(c.recommendation)};">${esc(c.recommendation)}</span></td>
      <td style="font-size:0.75rem;color:var(--muted);white-space:nowrap;">${fmtDateTime(c.shortlistedAt)}</td>
      <td><button onclick="removeFromShortlist(${i})" style="background:none;border:none;color:#C0392B;cursor:pointer;font-size:0.8rem;padding:4px 8px;" title="Remove">✕</button></td>
    </tr>`).join('');
}

function downloadShortlistCSV() {
  const list = getShortlist();
  if (!list.length) { showToast('Shortlist is empty.', 'error'); return; }
  const header = ['First Name', 'Last Name', 'Email', 'Phone', 'Subjects', 'Verdict', 'Shortlisted At'];
  const rows = list.map(c => [
    c.firstName, c.lastName, c.email, c.phone, c.subjects, c.recommendation,
    new Date(c.shortlistedAt).toLocaleString('en-GB'),
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`));
  const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'thinkviva-shortlist.csv'; a.click();
  URL.revokeObjectURL(url);
}

function resetScreener() {
  cvFiles = [];
  document.getElementById('cv-file-input').value = '';
  document.getElementById('cv-drop-label').textContent = 'Drop CVs here or click to browse';
  document.getElementById('cv-drop-zone').style.borderColor = 'var(--border)';
  document.getElementById('cv-drop-zone').style.background  = 'var(--bg)';
  document.getElementById('cv-screen-btn').style.display = 'none';
  document.getElementById('cv-file-list').style.display = 'none';
  document.getElementById('cv-file-list').innerHTML = '';
  document.getElementById('cv-progress').style.display = 'none';
  document.getElementById('cv-verdict').style.display = 'none';
}

// ---- FEEDBACK ----
function parseFeedback(msg) {
  if (!msg) return { role: null, rating: null, comment: null };
  const m = msg.match(/^\[(.+?)\] Rating: (\d+)\/5 — ([\s\S]*)$/);
  if (!m) return { role: null, rating: null, comment: msg };
  return { role: m[1], rating: parseInt(m[2], 10), comment: m[3].trim() };
}

function stars(n) {
  const filled = '★'.repeat(Math.max(0, Math.min(5, n || 0)));
  const empty  = '☆'.repeat(5 - Math.max(0, Math.min(5, n || 0)));
  return `<span style="color:#F5A623;font-size:1.1rem;">${filled}</span><span style="color:var(--border);font-size:1.1rem;">${empty}</span>`;
}

async function loadFeedback() {
  try {
    const res  = await fetch('/api/admin/feedback', { headers: apiHeaders() });
    const data = await res.json();

    const statsEl = document.getElementById('feedback-stats');
    const cardsEl = document.getElementById('feedback-cards');
    if (!statsEl || !cardsEl) return;

    if (!data.length) {
      statsEl.innerHTML = '';
      cardsEl.innerHTML = '<p style="text-align:center;color:var(--muted);padding:32px;">No feedback submitted yet.</p>';
      return;
    }

    const parsed = data.map(d => ({ ...d, fb: parseFeedback(d.message) }));
    const rated  = parsed.filter(d => d.fb.rating !== null);
    const avg    = rated.length ? (rated.reduce((s, d) => s + d.fb.rating, 0) / rated.length).toFixed(1) : '—';
    const breakdown = [5,4,3,2,1].map(n => ({ n, count: rated.filter(d => d.fb.rating === n).length }));

    statsEl.innerHTML = `
      <div class="metric-card" style="text-align:center;">
        <div class="metric-val" style="font-size:2rem;">${data.length}</div>
        <div class="metric-label">Total Responses</div>
      </div>
      <div class="metric-card" style="text-align:center;">
        <div class="metric-val" style="font-size:2rem;">${avg}</div>
        <div class="metric-label">Avg Rating</div>
        <div style="margin-top:4px;">${avg !== '—' ? stars(Math.round(parseFloat(avg))) : ''}</div>
      </div>
      <div class="metric-card" style="padding:18px 20px;">
        <div style="font-size:0.7rem;font-weight:700;color:var(--navy);text-transform:uppercase;margin-bottom:10px;">Rating Breakdown</div>
        ${breakdown.map(b => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:0.8rem;">
            <span style="color:#F5A623;min-width:14px;">${b.n}★</span>
            <div style="flex:1;background:var(--bg);border-radius:4px;height:10px;">
              <div style="width:${rated.length ? Math.round((b.count/rated.length)*100) : 0}%;background:#F5A623;height:100%;border-radius:4px;"></div>
            </div>
            <span style="min-width:16px;text-align:right;color:var(--muted);">${b.count}</span>
          </div>`).join('')}
      </div>`;

    cardsEl.innerHTML = parsed.map(d => {
      const { role, rating, comment } = d.fb;
      return `
        <div style="background:var(--white);border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-bottom:12px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
            <div>
              <span style="font-weight:700;color:var(--navy);">${esc(d.parentName)}</span>
              ${role ? `<span style="margin-left:8px;font-size:0.75rem;background:var(--bg);border:1px solid var(--border);padding:2px 8px;border-radius:20px;color:var(--muted);">${esc(role)}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              ${rating !== null ? stars(rating) : ''}
              <span style="font-size:0.75rem;color:var(--muted);">${fmtDate(d.createdAt)}</span>
            </div>
          </div>
          ${comment ? `<p style="margin:0;color:var(--text);font-size:0.875rem;line-height:1.6;">"${esc(comment)}"</p>` : ''}
          ${d.email ? `<p style="margin:6px 0 0;font-size:0.75rem;color:var(--muted);">${esc(d.email)}</p>` : ''}
        </div>`;
    }).join('');
  } catch (err) {
    const cardsEl = document.getElementById('feedback-cards');
    if (cardsEl) cardsEl.innerHTML = `<p style="text-align:center;color:#C0392B;padding:32px;">Error loading feedback: ${esc(err.message)}</p>`;
  }
}

// ---- TABS ----
function switchTab(name, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
}

// ---- HELPERS ----
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusClass(status) {
  if (!status) return 'pending';
  if (['approved', 'active', 'completed'].includes(status)) return 'approved';
  if (['rejected'].includes(status)) return 'rejected';
  if (['new'].includes(status)) return 'new';
  return 'pending';
}

// Allow pressing Enter in token input
document.getElementById('admin-token-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') adminLogin();
});
