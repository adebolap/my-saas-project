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
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px;">No leads yet. Share the landing page!</td></tr>';
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
        <td><span class="status-badge status-${l.status}">${l.status}</span></td>
        <td style="font-size:0.8rem;color:var(--muted);">${fmtDate(l.createdAt)}</td>
        <td>
          <select onchange="updateLeadStatus('${l._id}', this.value)" style="font-size:0.75rem;padding:4px 8px;border:1px solid var(--border);border-radius:4px;cursor:pointer;">
            ${['new','contacted','booked','active','churned'].map(s =>
              `<option value="${s}" ${s === l.status ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
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
  other:             { label: 'Other', color: '#666' },
};

async function loadEmailLogs() {
  try {
    const res  = await fetch('/api/admin/email-logs', { headers: apiHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('emails-tbody');

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px;">No emails logged yet. Logs appear after the next submission.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(e => {
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
  } catch (err) {
    showToast('Error loading email logs: ' + err.message, 'error');
  }
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
