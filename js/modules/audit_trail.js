// ─── Audit Trail Module ───────────────────────────────────────────────────────
// Records every meaningful DB change with before/after values.
// Call AuditTrail.log(action, entity, entityId, changes, details) from any module.
// ──────────────────────────────────────────────────────────────────────────────

const AuditTrail = {

  // ── Log a change ─────────────────────────────────────────────────────────────
  log: function (action, entity, entityId, changes = {}, details = '') {
    try {
      window.DB.auditLogs = window.DB.auditLogs || [];
      const entry = {
        id:        'AUD_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        timestamp: new Date().toISOString(),
        userId:    window.currentUser?.id   || null,
        user:      window.currentUser?.name || window.currentUser?.username || 'System',
        action,        // e.g. 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'LOGIN'
        entity,        // e.g. 'Employee', 'PayrollRun', 'Company'
        entityId:  String(entityId || ''),
        changes,       // { field: { before, after } }
        details        // free-text summary
      };
      window.DB.auditLogs.push(entry);
      // Keep last 2000 entries in memory to avoid bloat
      if (window.DB.auditLogs.length > 2000) {
        window.DB.auditLogs = window.DB.auditLogs.slice(-2000);
      }
      window.DB.save();
    } catch (e) {
      console.warn('[AuditTrail] log error:', e.message);
    }
  },

  // ── Helper to diff two objects and log field-level changes ──────────────────
  diff: function (before, after, fields) {
    const changes = {};
    (fields || Object.keys({ ...before, ...after })).forEach(k => {
      const bv = before?.[k];
      const av = after?.[k];
      if (String(bv) !== String(av)) {
        changes[k] = { before: bv ?? null, after: av ?? null };
      }
    });
    return changes;
  },

  // ── Render page ───────────────────────────────────────────────────────────────
  render: function (container) {
    const logs      = (window.DB.auditLogs || []).slice().reverse(); // newest first
    const users     = window.DB.users    || [];
    const employees = window.DB.employees|| [];

    const filterAction = window._auditAction || '';
    const filterEntity = window._auditEntity || '';
    const filterUser   = window._auditUser   || '';
    const filterSearch = window._auditSearch || '';
    const pageSize     = 50;
    window._auditPage  = window._auditPage || 0;

    let filtered = logs;
    if (filterAction) filtered = filtered.filter(l => l.action === filterAction);
    if (filterEntity) filtered = filtered.filter(l => l.entity === filterEntity);
    if (filterUser)   filtered = filtered.filter(l => l.user === filterUser || l.userId == filterUser);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      filtered = filtered.filter(l =>
        (l.entity||'').toLowerCase().includes(q) ||
        (l.action||'').toLowerCase().includes(q) ||
        (l.user||'').toLowerCase().includes(q)   ||
        (l.details||'').toLowerCase().includes(q)||
        (l.entityId||'').toLowerCase().includes(q)
      );
    }

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    window._auditPage = Math.min(window._auditPage, totalPages - 1);
    const page    = filtered.slice(window._auditPage * pageSize, (window._auditPage + 1) * pageSize);
    const entities= [...new Set(logs.map(l => l.entity).filter(Boolean))].sort();
    const actions = [...new Set(logs.map(l => l.action).filter(Boolean))].sort();
    const userNames=[...new Set(logs.map(l => l.user).filter(Boolean))].sort();

    // Stats
    const today = new Date().toISOString().split('T')[0];
    const todayCount    = logs.filter(l => l.timestamp?.startsWith(today)).length;
    const weekStart     = new Date(); weekStart.setDate(weekStart.getDate()-7);
    const weekCount     = logs.filter(l => new Date(l.timestamp) >= weekStart).length;
    const criticalCount = logs.filter(l => ['DELETE','APPROVE','REJECT','TERMINATE','REINSTATE'].includes(l.action)).length;

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.25rem;margin:0;">Audit Trail</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            Complete change log — ${logs.length} total events
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="AuditTrail.exportCSV()">
            <i class="fas fa-file-csv"></i> Export CSV
          </button>
          <button class="btn btn-outline btn-sm" style="color:var(--danger);"
            onclick="AuditTrail.clearOldLogs()">
            <i class="fas fa-trash"></i> Clear Old
          </button>
        </div>
      </div>

      <!-- KPI strip -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
        ${[
          ['Total Events',    logs.length,      'primary', 'fas fa-list'],
          ['Today',           todayCount,       'success', 'fas fa-calendar-day'],
          ['Last 7 Days',     weekCount,        'info',    'fas fa-calendar-week'],
          ['Critical Actions',criticalCount,    'danger',  'fas fa-exclamation-triangle'],
        ].map(([l,v,c,icon]) => `
          <div class="card" style="padding:10px 14px;border-left:3px solid var(--${c});">
            <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-400);">${l}</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--${c});">${v}</div>
          </div>`).join('')}
      </div>

      <!-- Filters -->
      <div class="card" style="padding:10px 14px;margin-bottom:14px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <input type="text" class="search-input" style="flex:1;min-width:180px;"
            placeholder="Search user, entity, details..."
            value="${filterSearch}"
            oninput="window._auditSearch=this.value;window._auditPage=0;AuditTrail.render(document.getElementById('content'))">
          <select class="form-control" style="width:140px;"
            onchange="window._auditAction=this.value;window._auditPage=0;AuditTrail.render(document.getElementById('content'))">
            <option value="">All Actions</option>
            ${actions.map(a=>`<option value="${a}" ${filterAction===a?'selected':''}>${a}</option>`).join('')}
          </select>
          <select class="form-control" style="width:150px;"
            onchange="window._auditEntity=this.value;window._auditPage=0;AuditTrail.render(document.getElementById('content'))">
            <option value="">All Entities</option>
            ${entities.map(e=>`<option value="${e}" ${filterEntity===e?'selected':''}>${e}</option>`).join('')}
          </select>
          <select class="form-control" style="width:160px;"
            onchange="window._auditUser=this.value;window._auditPage=0;AuditTrail.render(document.getElementById('content'))">
            <option value="">All Users</option>
            ${userNames.map(u=>`<option value="${u}" ${filterUser===u?'selected':''}>${u}</option>`).join('')}
          </select>
          <button class="btn btn-outline btn-sm" onclick="
            window._auditAction='';window._auditEntity='';window._auditUser='';window._auditSearch='';window._auditPage=0;
            AuditTrail.render(document.getElementById('content'))">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Results info + pagination -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:0.78rem;color:var(--gray-500);">
        <span>Showing ${page.length} of ${filtered.length} events</span>
        ${totalPages > 1 ? `
          <div style="display:flex;gap:4px;align-items:center;">
            <button class="btn btn-xs btn-outline" ${window._auditPage===0?'disabled':''}
              onclick="window._auditPage--;AuditTrail.render(document.getElementById('content'))">
              <i class="fas fa-chevron-left"></i>
            </button>
            <span>Page ${window._auditPage+1} / ${totalPages}</span>
            <button class="btn btn-xs btn-outline" ${window._auditPage>=totalPages-1?'disabled':''}
              onclick="window._auditPage++;AuditTrail.render(document.getElementById('content'))">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>` : ''}
      </div>

      ${!page.length ? `
        <div class="empty-state" style="padding:60px;">
          <div class="empty-state-icon"><i class="fas fa-history"></i></div>
          <div class="empty-state-title">No audit events yet</div>
          <div class="empty-state-desc">Events are recorded automatically when data changes.</div>
        </div>` : `
      <!-- Log table -->
      <div class="card" style="padding:0;overflow:hidden;">
        <div class="table-responsive">
          <table style="font-size:0.78rem;">
            <thead>
              <tr>
                <th style="width:145px;">Timestamp</th>
                <th style="width:90px;">User</th>
                <th style="width:90px;">Action</th>
                <th style="width:110px;">Entity</th>
                <th>Details / Changes</th>
                <th style="width:36px;"></th>
              </tr>
            </thead>
            <tbody>
              ${page.map(log => {
                const ac = this._actionColor(log.action);
                const hasChanges = log.changes && Object.keys(log.changes).length > 0;
                const changeCount = hasChanges ? Object.keys(log.changes).length : 0;
                const ts = log.timestamp ? new Date(log.timestamp) : null;
                const tsStr = ts ? ts.toLocaleString('en-ZA',{
                  day:'2-digit',month:'short',year:'2-digit',
                  hour:'2-digit',minute:'2-digit',hour12:false
                }) : '—';

                return `
                  <tr id="auditrow_${log.id}">
                    <td style="font-size:0.72rem;color:var(--gray-500);white-space:nowrap;">${tsStr}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:5px;">
                        <div style="width:22px;height:22px;border-radius:50%;background:var(--primary-soft);
                                    color:var(--primary);display:flex;align-items:center;justify-content:center;
                                    font-size:0.6rem;font-weight:700;flex-shrink:0;">
                          ${(log.user||'?').charAt(0).toUpperCase()}
                        </div>
                        <span style="font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60px;">
                          ${log.user||'System'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-${ac}" style="font-size:0.62rem;">
                        ${log.action||'—'}
                      </span>
                    </td>
                    <td>
                      <div style="font-weight:500;font-size:0.78rem;">${log.entity||'—'}</div>
                      ${log.entityId ? `<div style="font-size:0.65rem;color:var(--gray-400);">#${log.entityId}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-size:0.75rem;">${log.details||'—'}</div>
                      ${hasChanges ? `
                        <button class="btn btn-xs btn-outline" style="margin-top:3px;font-size:0.62rem;"
                          onclick="AuditTrail.toggleChanges('${log.id}')">
                          <i class="fas fa-code-branch"></i> ${changeCount} field${changeCount>1?'s':''} changed
                        </button>
                        <div id="changes_${log.id}" style="display:none;margin-top:6px;">
                          ${Object.entries(log.changes).map(([field, {before,after}]) => `
                            <div style="display:flex;align-items:flex-start;gap:6px;font-size:0.68rem;
                                        padding:3px 0;border-top:1px solid var(--gray-100);">
                              <span style="min-width:80px;color:var(--gray-500);">${field}</span>
                              <span style="color:var(--danger);text-decoration:line-through;max-width:100px;overflow:hidden;text-overflow:ellipsis;">
                                ${before !== null && before !== undefined ? String(before).slice(0,40) : '—'}
                              </span>
                              <i class="fas fa-arrow-right" style="color:var(--gray-400);font-size:0.6rem;margin-top:1px;"></i>
                              <span style="color:var(--success);max-width:100px;overflow:hidden;text-overflow:ellipsis;">
                                ${after !== null && after !== undefined ? String(after).slice(0,40) : '—'}
                              </span>
                            </div>`).join('')}
                        </div>` : ''}
                    </td>
                    <td>
                      <button class="btn-icon" style="font-size:0.65rem;" title="Copy ID"
                        onclick="navigator.clipboard?.writeText('${log.id}');window.Toast?.show('Copied','success')">
                        <i class="fas fa-copy"></i>
                      </button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`}`;
  },

  toggleChanges: function (logId) {
    const el = document.getElementById('changes_' + logId);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  },

  _actionColor: function (action) {
    const map = {
      CREATE:'success', UPDATE:'info', DELETE:'danger', APPROVE:'success',
      REJECT:'danger', LOGIN:'gray', LOGOUT:'gray', TERMINATE:'danger',
      REINSTATE:'success', FINALIZE:'primary', GENERATE:'teal', EMAIL:'info',
      UPLOAD:'info', EXPORT:'gray', IMPORT:'warning', RESET:'danger'
    };
    return map[action] || 'gray';
  },

  exportCSV: function () {
    const logs = (window.DB.auditLogs || []).slice().reverse();
    const rows = ['ID,Timestamp,User,Action,Entity,EntityID,Details,Changes'];
    logs.forEach(l => {
      const changes = l.changes ? JSON.stringify(l.changes).replace(/"/g,'""') : '';
      rows.push([
        l.id, l.timestamp, l.user||'', l.action||'', l.entity||'',
        l.entityId||'', (l.details||'').replace(/,/g,' '), `"${changes}"`
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `AuditTrail_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.Toast?.show('Audit trail exported', 'success');
  },

  clearOldLogs: function () {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3); // keep 3 months
    window.showConfirmation('Clear Old Logs',
      'Delete audit logs older than 3 months? Recent logs are kept.',
      () => {
        const before = (window.DB.auditLogs||[]).length;
        window.DB.auditLogs = (window.DB.auditLogs||[]).filter(l => {
          return !l.timestamp || new Date(l.timestamp) >= cutoff;
        });
        const removed = before - window.DB.auditLogs.length;
        window.DB.save();
        window.Toast?.show(`Removed ${removed} old log entries`, 'success');
        this.render(document.getElementById('content'));
      }
    );
  }
};

// ── Auto-hook: intercept DB.save to capture changes ──────────────────────────
// Wrap critical operations so audit logging happens automatically.
(function patchDB() {
  const _origSave = window.DB?.save?.bind(window.DB);
  // Patching happens after page load when DB is ready
})();

window.AuditTrail = AuditTrail;
window.renderAuditTrail = function (container) { AuditTrail.render(container); };
