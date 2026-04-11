/**
 * Nexa HR & Payroll — Audit Log
 * Shows server-side DB logs when available, falls back to local window.DB.auditLogs
 */
const AuditLog = {
  _logs: [],
  _filter: { action: '', user: '', module: '' },
  _page: 1,
  _perPage: 50,

  render: async function (container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="header-content">
          <h2 class="page-title">
            <i class="fas fa-shield-alt" style="color:var(--primary);margin-right:10px;"></i>System Audit Log
          </h2>
          <p class="page-subtitle">All system actions, logins, data changes and security events</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline btn-sm" onclick="AuditLog.exportCSV()">
            <i class="fas fa-download"></i> Export CSV
          </button>
          <button class="btn btn-outline btn-sm" onclick="AuditLog.loadAll()">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Summary stats -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px;" id="auditStats">
        <div class="card" style="padding:16px 20px;border-left:4px solid var(--info);">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);">Total Events</div>
          <div style="font-size:1.6rem;font-weight:700;" id="statTotal">—</div>
        </div>
        <div class="card" style="padding:16px 20px;border-left:4px solid var(--success);">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);">Logins Today</div>
          <div style="font-size:1.6rem;font-weight:700;color:var(--success);" id="statLogins">—</div>
        </div>
        <div class="card" style="padding:16px 20px;border-left:4px solid var(--danger);">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);">Failed Auth</div>
          <div style="font-size:1.6rem;font-weight:700;color:var(--danger);" id="statFailed">—</div>
        </div>
        <div class="card" style="padding:16px 20px;border-left:4px solid var(--warning);">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);">Data Changes</div>
          <div style="font-size:1.6rem;font-weight:700;color:var(--warning);" id="statChanges">—</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;">
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
            <div class="form-group" style="margin:0;flex:1;min-width:150px;">
              <label style="font-size:0.78rem;font-weight:600;">Action</label>
              <select class="form-control form-control-sm" id="filterAction" onchange="AuditLog.applyFilter()">
                <option value="">All Actions</option>
                <option>LOGIN_SUCCESS</option><option>LOGIN_SUCCESS_2FA</option>
                <option>LOGIN_FAIL</option><option>LOGOUT</option>
                <option>OTP_SENT</option><option>OTP_FAIL</option>
                <option>USER_CREATED</option><option>DOCUMENT_UPLOAD</option>
                <option>EMAIL_SENT</option><option>SYNC_SAVE</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;flex:1;min-width:150px;">
              <label style="font-size:0.78rem;font-weight:600;">Module</label>
              <select class="form-control form-control-sm" id="filterModule" onchange="AuditLog.applyFilter()">
                <option value="">All Modules</option>
                <option>Auth</option><option>Payroll</option><option>Employees</option>
                <option>Documents</option><option>Settings</option><option>Email</option>
                <option>System</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;flex:2;min-width:180px;">
              <label style="font-size:0.78rem;font-weight:600;">Search User</label>
              <input class="form-control form-control-sm" id="filterUser" placeholder="Username..."
                oninput="AuditLog.applyFilter()">
            </div>
            <button class="btn btn-outline btn-sm" onclick="AuditLog.clearFilters()" style="margin-bottom:0;">
              <i class="fas fa-times"></i> Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Log table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table" style="font-size:0.82rem;">
            <thead>
              <tr>
                <th style="width:160px;">Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>IP Address</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody id="auditTableBody">
              <tr>
                <td colspan="6" style="text-align:center;padding:40px;">
                  <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:var(--gray-400);"></i>
                  <div style="margin-top:8px;color:var(--gray-400);">Loading audit logs...</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div id="auditPagination" style="padding:12px 20px;border-top:1px solid var(--gray-100);display:flex;align-items:center;justify-content:space-between;font-size:0.82rem;"></div>
      </div>
    `;

    await this.loadAll();
  },

  loadAll: async function () {
    // Try server first, fall back to local logs
    let serverLogs = [];
    try {
      const token = (document.cookie.match(/nexa_session=([^;]+)/) || [])[1] || '';
      const res = await fetch('api/audit.php?action=list&limit=500', {
        credentials: 'include',
        headers: { 'X-Auth-Token': token }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.logs)) {
          serverLogs = data.logs.map(l => ({
            timestamp: l.timestamp || l.created_at,
            username:  l.username,
            action:    l.action,
            module:    l.module || 'System',
            ip:        l.ip_address || '—',
            details:   typeof l.details === 'string'
                         ? this._tryParseDetails(l.details)
                         : (l.details || {}),
            source: 'server'
          }));
        }
      }
    } catch (_) {}

    // Local logs from window.DB.auditLogs
    const localLogs = (window.DB?.auditLogs || []).map(l => ({
      timestamp: l.timestamp || l.createdAt || new Date().toISOString(),
      username:  l.username  || l.user || 'system',
      action:    l.action,
      module:    l.module || 'System',
      ip:        l.ip || '—',
      details:   l.details || {},
      source: 'local'
    }));

    // Merge: deduplicate by action+username+timestamp (approx)
    const allLogs = [...serverLogs];
    const serverKeys = new Set(serverLogs.map(l => `${l.action}|${l.username}|${l.timestamp?.slice(0,16)}`));
    localLogs.forEach(l => {
      const key = `${l.action}|${l.username}|${l.timestamp?.slice(0,16)}`;
      if (!serverKeys.has(key)) allLogs.push(l);
    });

    // Sort newest first
    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this._logs = allLogs;
    this._page = 1;
    this._updateStats();
    this.applyFilter();
  },

  _tryParseDetails: function (str) {
    try { return JSON.parse(str); } catch (_) { return { info: str }; }
  },

  _updateStats: function () {
    const today = new Date().toISOString().slice(0, 10);
    const total   = this._logs.length;
    const logins  = this._logs.filter(l => l.action?.includes('LOGIN_SUCCESS') && l.timestamp?.startsWith(today)).length;
    const failed  = this._logs.filter(l => l.action?.includes('FAIL') || l.action?.includes('ERROR')).length;
    const changes = this._logs.filter(l => ['USER_CREATED','DOCUMENT_UPLOAD','EMAIL_SENT','SYNC_SAVE'].includes(l.action)).length;

    const s = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    s('statTotal',   total);
    s('statLogins',  logins);
    s('statFailed',  failed);
    s('statChanges', changes);
  },

  applyFilter: function () {
    const action = document.getElementById('filterAction')?.value?.toLowerCase() || '';
    const module = document.getElementById('filterModule')?.value?.toLowerCase() || '';
    const user   = document.getElementById('filterUser')?.value?.toLowerCase()   || '';

    const filtered = this._logs.filter(l => {
      if (action && !(l.action || '').toLowerCase().includes(action)) return false;
      if (module && !(l.module || '').toLowerCase().includes(module)) return false;
      if (user   && !(l.username || '').toLowerCase().includes(user)) return false;
      return true;
    });

    this._renderPage(filtered);
  },

  clearFilters: function () {
    ['filterAction','filterModule'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const fu = document.getElementById('filterUser'); if (fu) fu.value = '';
    this.applyFilter();
  },

  _renderPage: function (filtered) {
    const total  = filtered.length;
    const start  = (this._page - 1) * this._perPage;
    const page   = filtered.slice(start, start + this._perPage);
    const body   = document.getElementById('auditTableBody');
    const pager  = document.getElementById('auditPagination');
    if (!body) return;

    if (!page.length) {
      body.innerHTML = `
        <tr><td colspan="6" style="text-align:center;padding:48px;color:var(--gray-400);">
          <i class="fas fa-search" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>
          No audit events found
        </td></tr>`;
      if (pager) pager.innerHTML = '';
      return;
    }

    body.innerHTML = page.map(log => {
      const badgeColor = this._actionColor(log.action);
      const ts = log.timestamp
        ? new Date(log.timestamp).toLocaleString('en-ZA', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : '—';
      const detailStr = this._formatDetails(log.details);
      return `
        <tr>
          <td style="font-family:monospace;font-size:0.77rem;white-space:nowrap;color:var(--gray-500);">${ts}</td>
          <td><strong style="color:var(--gray-800);">${log.username || '—'}</strong>
            ${log.source === 'local' ? '<span style="font-size:0.65rem;color:var(--gray-400);margin-left:4px;">(local)</span>' : ''}
          </td>
          <td>
            <span style="background:${badgeColor.bg};color:${badgeColor.text};padding:2px 8px;border-radius:4px;
                         font-size:0.72rem;font-weight:700;white-space:nowrap;">
              ${log.action || '—'}
            </span>
          </td>
          <td style="color:var(--gray-600);">${log.module || '—'}</td>
          <td style="font-family:monospace;font-size:0.77rem;color:var(--gray-500);">${log.ip || '—'}</td>
          <td style="color:var(--gray-500);font-size:0.78rem;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
              title="${detailStr.replace(/"/g,"'")}">${detailStr}</td>
        </tr>`;
    }).join('');

    // Pagination
    const totalPages = Math.ceil(total / this._perPage);
    if (pager) {
      pager.innerHTML = `
        <span style="color:var(--gray-500);">
          Showing ${start + 1}–${Math.min(start + this._perPage, total)} of <strong>${total}</strong> events
        </span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-outline btn-sm" onclick="AuditLog._page=Math.max(1,AuditLog._page-1);AuditLog.applyFilter();"
            ${this._page <= 1 ? 'disabled' : ''}>‹ Prev</button>
          <span style="line-height:30px;font-weight:600;">Page ${this._page} / ${totalPages}</span>
          <button class="btn btn-outline btn-sm" onclick="AuditLog._page=Math.min(${totalPages},AuditLog._page+1);AuditLog.applyFilter();"
            ${this._page >= totalPages ? 'disabled' : ''}>Next ›</button>
        </div>`;
    }
  },

  _actionColor: function (action) {
    const a = (action || '').toUpperCase();
    if (a.includes('SUCCESS') || a.includes('SENT'))  return { bg: 'rgba(5,150,105,0.1)',   text: '#059669' };
    if (a.includes('FAIL')    || a.includes('ERROR'))  return { bg: 'rgba(220,38,38,0.1)',   text: '#DC2626' };
    if (a.includes('DELETE')  || a.includes('REVOKE')) return { bg: 'rgba(217,119,6,0.1)',   text: '#D97706' };
    if (a.includes('CREATED') || a.includes('UPLOAD')) return { bg: 'rgba(2,132,199,0.1)',   text: '#0284C7' };
    if (a.includes('LOGIN')   || a.includes('OTP'))    return { bg: 'rgba(99,102,241,0.1)',  text: '#6366F1' };
    return { bg: 'rgba(100,116,139,0.1)', text: '#64748B' };
  },

  _formatDetails: function (details) {
    if (!details || typeof details !== 'object') return details ? String(details) : '—';
    return Object.entries(details)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ') || '—';
  },

  exportCSV: function () {
    const rows = [['Timestamp','User','Action','Module','IP','Details']];
    this._logs.forEach(l => rows.push([
      l.timestamp, l.username, l.action, l.module, l.ip, this._formatDetails(l.details)
    ]));
    const csv  = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `audit_log_${new Date().toISOString().slice(0,10)}.csv`
    });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    Toast.show('Audit log exported', 'success');
  }
};

window.AuditLog      = AuditLog;
window.renderAuditLog = c => AuditLog.render(c);
