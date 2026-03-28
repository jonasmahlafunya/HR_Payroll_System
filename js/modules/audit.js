/**
 * Nexa HR & Payroll — Audit Log Module
 */
const AuditLog = {
  render: async function (container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="header-content">
          <h2 class="page-title">System Audit Log</h2>
          <p class="page-subtitle">Track system actions, logins, and security events</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" onclick="AuditLog.refresh()">
            <span class="btn-icon">🔄</span> Refresh
          </button>
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom: 24px;">
        <div class="stat-card">
          <div class="stat-label">Critical Alerts (24h)</div>
          <div class="stat-value" id="auditAlertCount">0</div>
        </div>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>IP Address</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody id="auditLogBody">
              <tr><td colspan="6" style="text-align:center; padding:40px;">Loading logs...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.loadLogs();
    this.loadAlerts();
  },

  loadLogs: async function () {
    try {
      const res = await fetch('api/audit.php?action=list');
      const data = await res.json();
      const body = document.getElementById('auditLogBody');
      if (!body) return;

      if (data.status === 'success' && data.logs.length) {
        body.innerHTML = data.logs.map(log => `
          <tr>
            <td style="white-space:nowrap; font-family:monospace; font-size:0.8rem;">
              ${new Date(log.timestamp).toLocaleString()}
            </td>
            <td><strong>${log.username}</strong></td>
            <td>
              <span class="badge badge-${this.getActionColor(log.action)}">
                ${log.action}
              </span>
            </td>
            <td>${log.module}</td>
            <td style="font-family:monospace; font-size:0.8rem;">${log.ip_address}</td>
            <td>
              <small class="text-muted">${JSON.stringify(log.details || {})}</small>
            </td>
          </tr>
        `).join('');
      } else {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px;">No logs found.</td></tr>';
      }
    } catch (e) {
      Toast.show('Failed to load audit logs', 'danger');
    }
  },

  loadAlerts: async function () {
    try {
      const res = await fetch('api/audit.php?action=alerts');
      const data = await res.json();
      const alertCountEl = document.getElementById('auditAlertCount');
      if (alertCountEl) {
        alertCountEl.textContent = data.alerts?.length || 0;
        if (data.alerts?.length > 0) {
          alertCountEl.parentElement.style.borderColor = '#EF4444';
          alertCountEl.style.color = '#EF4444';
        }
      }
    } catch (e) { }
  },

  refresh: function () {
    this.loadLogs();
    this.loadAlerts();
  },

  getActionColor: function (action) {
    if (action.includes('SUCCESS')) return 'success';
    if (action.includes('FAIL') || action.includes('ERROR')) return 'danger';
    if (action.includes('DELETE')) return 'warning';
    return 'info';
  }
};

window.AuditLog = AuditLog;
