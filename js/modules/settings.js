// ─── Settings Module — Company-scoped ────────────────────────────────────────
const Settings = {
  _tab: 'company',
  _companyId: null,

  render: function (container) {
    const companies = window.DB.companies || [];
    if (!this._companyId && companies.length) {
      this._companyId = companies[0].id;
    }
    const comp = companies.find(c => c.id === this._companyId) || companies[0];

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.25rem;margin:0;">Settings</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">Configuration per company &amp; system preferences</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Settings.saveAll()">
          <i class="fas fa-save"></i> Save Changes
        </button>
      </div>

      <div style="display:grid;grid-template-columns:210px 1fr;gap:16px;align-items:start;">
        <div>
          ${companies.length > 1 ? `
          <div class="card" style="padding:10px;margin-bottom:10px;">
            <div style="font-size:0.6rem;text-transform:uppercase;color:var(--gray-400);margin-bottom:5px;font-weight:700;">Active Company</div>
            <select class="form-control" style="font-size:0.8rem;"
              onchange="Settings._companyId=isNaN(this.value)?this.value:parseInt(this.value);Settings.render(document.getElementById('content'))">
              ${companies.map(c => `<option value="${c.id}" ${Settings._companyId == c.id ? 'selected' : ''} >${c.name}</option>`).join('')}
            </select>
            <div style="font-size:0.65rem;color:var(--gray-400);margin-top:3px;">Settings apply to this company</div>
          </div>` : ''}
          <div class="card" style="padding:8px;">
            <div style="font-size:0.58rem;text-transform:uppercase;color:var(--gray-400);padding:3px 8px 5px;font-weight:700;">Per Company</div>
            ${['company', 'payroll', 'leave', 'notifications'].map(k => Settings._navItem(k)).join('')}
            <div style="font-size:0.58rem;text-transform:uppercase;color:var(--gray-400);padding:10px 8px 5px;font-weight:700;">System-wide</div>
            ${['users', 'appearance', 'security', 'system'].map(k => Settings._navItem(k)).join('')}
          </div>
        </div>
        <div id="settPanel">${Settings._renderTab(Settings._tab, comp)}</div>
      </div>`;
  },

  _labels: {
    company: 'Company Profile', payroll: 'Payroll Defaults', leave: 'Leave Policy',
    notifications: 'Notifications', users: 'Users & Roles', appearance: 'Appearance',
    security: 'Security', system: 'System Info'
  },
  _icons: {
    company: 'fas fa-building', payroll: 'fas fa-money-bill-wave', leave: 'fas fa-calendar-alt',
    notifications: 'fas fa-bell', users: 'fas fa-users-cog', appearance: 'fas fa-palette',
    security: 'fas fa-shield-alt', system: 'fas fa-cogs'
  },

  _navItem: function (key) {
    const active = this._tab === key;
    return `<button onclick="Settings._tab='${key}';Settings.render(document.getElementById('content'))"
      style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:none;
             border-radius:7px;cursor:pointer;font-size:0.81rem;text-align:left;margin-bottom:2px;
             background:${active ? 'var(--primary-soft,#eef2ff)' : ' transparent'};
             color:${active ? 'var(--primary,#4f46e5)' : ' var(--gray-700)'};
             font-weight:${active ? '700' : '400'};">
      <i class="${this._icons[key]}" style="width:13px;text-align:center;"></i>
      ${this._labels[key]}
    </button>`;
  },

  _getCS: function (id) {
    window.DB.companySettings = window.DB.companySettings || {};
    return id ? (window.DB.companySettings[id] || {}) : {};
  },
  _setCS: function (id, data) {
    window.DB.companySettings = window.DB.companySettings || {};
    window.DB.companySettings[id] = Object.assign(window.DB.companySettings[id] || {}, data);
    window.DB.save();
  },

  _renderTab: function (tab, comp) {
    if (tab === 'company') return this.tabCompany(comp);
    if (tab === 'payroll') return this.tabPayroll(comp);
    if (tab === 'leave') return this.tabLeave(comp);
    if (tab === 'notifications') return this.tabNotifications(comp);
    if (tab === 'users') return this.tabUsers();
    if (tab === 'appearance') return this.tabAppearance();
    if (tab === 'security') return this.tabSecurity();
    if (tab === 'system') return this.tabSystem();
    return '';
  },

  tabCompany: function (comp) {
    if (!comp) return '<div class="card"><div class="card-body"><div class="empty-state"><div class="empty-state-title">No company found</div><button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="loadPage(\'companies\')">Add Company</button></div></div></div>';
    return `<div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-building text-primary"></i> Company Profile</h3>
        <span class="badge badge-info" style="font-size:0.65rem;">${comp.name}</span>
      </div>
      <div class="card-body">
        <div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:18px;">
          <div style="text-align:center;flex-shrink:0;">
            <div style="width:76px;height:76px;border-radius:10px;border:1px solid var(--gray-200);
                        overflow:hidden;display:flex;align-items:center;justify-content:center;
                        background:var(--gray-50);margin-bottom:6px;">
              ${comp.logo
        ? `<img src="${comp.logo}" id="sLogoImg" style="max-width:100%;max-height:100%;object-fit:contain;">`
        : `<i class="fas fa-building" style="font-size:1.6rem;color:var(--gray-300);"></i><img id="sLogoImg" style="display:none;max-width:100%;max-height:100%;object-fit:contain;">`}
            </div>
            <button class="btn btn-outline btn-sm" style="font-size:0.7rem;"
              onclick="document.getElementById('sLogoInput').click()">
              <i class="fas fa-camera"></i> Logo
            </button>
            <input type="file" id="sLogoInput" style="display:none;" accept="image/*"
              onchange="Settings._prevLogo(this)">
          </div>
          <div style="flex:1;">
            <div class="grid-2">
              <div class="form-group"><label class="form-label">Company Name</label>
                <input id="sc_name" class="form-control" value="${comp.name || ''}" ></div>
              <div class="form-group"><label class="form-label">Registration No.</label>
                <input id="sc_reg" class="form-control" value="${comp.registrationNumber || ''}"></div>
            </div>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Email Address</label>
            <input id="sc_email" type="email" class="form-control" value="${comp.email || ''}" ></div>
          <div class="form-group"><label class="form-label">Phone</label>
            <input id="sc_phone" class="form-control" value="${comp.contact || ''}" ></div>
          <div class="form-group"><label class="form-label">PAYE Tax Reference</label>
            <input id="sc_tax" class="form-control" value="${comp.taxReference || comp.taxNumber || ''}" ></div>
          <div class="form-group"><label class="form-label">VAT Number</label>
            <input id="sc_vat" class="form-control" value="${comp.vatNumber || ''}" ></div>
          <div class="form-group"><label class="form-label">UIF Reference</label>
            <input id="sc_uif" class="form-control" value="${comp.uifNumber || ''}" ></div>
          <div class="form-group"><label class="form-label">SDL Number</label>
            <input id="sc_sdl" class="form-control" value="${comp.sdlNumber || ''}" ></div>
          <div class="form-group" style="grid-column:span 2;"><label class="form-label">Address</label>
            <input id="sc_addr" class="form-control" value="${comp.address || ''}" ></div>
        </div>
        <button class="btn btn-primary" onclick="Settings.saveCompany()">
          <i class="fas fa-save"></i> Save Company Profile
        </button>
      </div>
    </div>`;
  },

  tabPayroll: function (comp) {
    const cs = this._getCS(comp?.id);
    const freq = comp?.payFrequency || cs.payFrequency || 'Monthly';
    return `<div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-money-bill-wave text-success"></i> Payroll Defaults</h3>
        ${comp ? `<span class="badge badge-info" style="font-size:0.65rem;">${comp.name}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="alert alert-info" style="font-size:0.82rem;margin-bottom:14px;">
          <i class="fas fa-info-circle"></i>
          Defaults for payroll runs under <strong>${comp?.name || 'this company'}</strong>.
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Pay Frequency</label>
            <select id="pd_freq" class="form-control">
              ${['Monthly', 'Bi-Weekly', 'Weekly', 'Fortnightly'].map(f => `<option ${freq === f ? 'selected' : ''} >${f}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Default Pay Day</label>
            <select id="pd_payday" class="form-control">
              <option value="">— Not set —</option>
              ${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${(comp?.payDay || cs.payDay) == (i + 1) ? 'selected' : ''} >${i + 1}</option>`).join('')}
              <option value="last" ${(comp?.payDay || cs.payDay) === 'last' ? 'selected' : ''}>Last day</option>
            </select></div>
          <div class="form-group"><label class="form-label">UIF Rate (%)</label>
            <input id="pd_uif" type="number" step="0.01" class="form-control" value="${cs.uifRate || 1}">
            <div class="form-hint">Standard: 1%</div></div>
          <div class="form-group"><label class="form-label">SDL Rate (%)</label>
            <input id="pd_sdl" type="number" step="0.01" class="form-control" value="${cs.sdlRate || 1}">
            <div class="form-hint">Standard: 1%</div></div>
          <div class="form-group"><label class="form-label">Overtime Rate (×)</label>
            <input id="pd_ot" type="number" step="0.25" class="form-control" value="${cs.overtimeRate || 1.5}">
            <div class="form-hint">SA standard: 1.5×</div></div>
          <div class="form-group"><label class="form-label">Annual Leave Days</label>
            <input id="pd_leave" type="number" class="form-control" value="${cs.annualLeaveDays || 21}">
            <div class="form-hint">SA minimum: 21 consecutive</div></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem;margin-bottom:8px;">
          <input type="checkbox" id="pd_autoEmail" style="width:16px;height:16px;"
            ${cs.autoEmailOnApproval !== false ? 'checked' : ''}>
          Email company when new payroll run is submitted for approval
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem;">
          <input type="checkbox" id="pd_autoPayslips" style="width:16px;height:16px;"
            ${cs.autoSendPayslips ? 'checked' : ''}>
          Auto-email payslips when run is finalized
        </label>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="Settings.savePayroll()">
          <i class="fas fa-save"></i> Save Payroll Defaults
        </button>
      </div>
    </div>`;
  },

  tabLeave: function (comp) {
    const cs = this._getCS(comp?.id);
    return `<div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-calendar-alt text-warning"></i> Leave Policy</h3>
        ${comp ? `<span class="badge badge-info" style="font-size:0.65rem;">${comp.name}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="grid-2">
          ${[['Annual Leave Days', 'lv_annual', cs.annualLeaveDays || 21, 'SA minimum: 21 consecutive'],
      ['Sick Leave (per 3yr cycle)', 'lv_sick', cs.sickLeaveDays || 30, '30 days over 3 years'],
      ['Family Responsibility Days', 'lv_family', cs.familyLeaveDays || 3, '3 days per year'],
      ['Study Leave Days', 'lv_study', cs.studyLeaveDays || 0, '0 = disabled'],
      ['Maternity Leave (months)', 'lv_mat', cs.maternityMonths || 4, 'Statutory minimum: 4 months'],
      ['Leave Carry-over Days', 'lv_carry', cs.carryoverDays || 0, '0 = no carry-over']]
        .map(([l, id, v, h]) => `<div class="form-group"><label class="form-label">${l}</label>
              <input id="${id}" type="number" class="form-control" value="${v}" min="0">
              <div class="form-hint">${h}</div></div>`).join('')}
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem;margin-bottom:8px;">
          <input type="checkbox" id="lv_approve" style="width:16px;height:16px;" ${cs.leaveRequiresApproval !== false ? 'checked' : ''}>
          Require manager approval for all leave requests
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem;">
          <input type="checkbox" id="lv_email" style="width:16px;height:16px;" ${cs.emailOnLeaveRequest !== false ? 'checked' : ''}>
          Email HR when a leave request is submitted
        </label>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="Settings.saveLeave()">
          <i class="fas fa-save"></i> Save Leave Policy
        </button>
      </div>
    </div>`;
  },

  tabNotifications: function (comp) {
    const cs = this._getCS(comp?.id);
    const n = cs.notifications || {};
    const row = (id, lbl, desc, chk) => `<div style="display:flex;align-items:flex-start;justify-content:space-between;
      padding:10px 0;border-bottom:1px solid var(--gray-100);">
      <div><div style="font-size:0.83rem;font-weight:500;">${lbl}</div>
           <div style="font-size:0.72rem;color:var(--gray-500);">${desc}</div></div>
      <input type="checkbox" id="${id}" style="width:17px;height:17px;cursor:pointer;" ${chk ? 'checked' : ''}>
    </div>`;
    return `<div class="card">
      <div class="card-header">
        <h3 class="card-title"><i class="fas fa-bell text-warning"></i> Notifications</h3>
        ${comp ? `<span class="badge badge-info" style="font-size:0.65rem;">${comp.name}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="form-group"><label class="form-label">Notification Email</label>
          <input id="notif_email" type="email" class="form-control"
            value="${n.email || comp?.email || ''}" placeholder="hr@company.co.za">
          <div class="form-hint">Emails for this company go here</div>
        </div>
        ${row('n_payroll', 'Payroll Approval Required', 'When a run needs approval', n.payrollApproval !== false)}
        ${row('n_leave', 'Leave Request Pending', 'When employee submits leave', n.leaveApproval !== false)}
        ${row('n_contract', 'Contract Generated', 'When a contract is created', n.contractGenerated !== false)}
        ${row('n_newEmp', 'New Employee Added', 'When employee is created', n.newEmployee || false)}
        ${row('n_term', 'Employee Terminated', 'On termination', n.termination || false)}
        <button class="btn btn-primary" style="margin-top:14px;" onclick="Settings.saveNotifications()">
          <i class="fas fa-save"></i> Save
        </button>
      </div>
    </div>`;
  },

  tabUsers: function () {
    const users = window.DB.users || [];
    const companies = window.DB.companies || [];
    return `<div style="display:flex;flex-direction:column;gap:12px;">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">System Users</h3>
          <button class="btn btn-primary btn-sm" onclick="Settings.addUserModal()">
            <i class="fas fa-plus"></i> Add User</button>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table style="font-size:0.82rem;">
              <thead><tr><th>User</th><th>Username</th><th>Role</th><th>Company Access</th><th>Status</th><th></th></tr></thead>
              <tbody>
                ${users.map(u => {
      const ca = u.companyIds?.length
        ? companies.filter(c => u.companyIds.includes(c.id)).map(c => c.name).join(', ')
        : 'All Companies';
      return `<tr>
                    <td><div style="font-weight:600;">${u.name || u.username}</div>
                        <div style="font-size:0.7rem;color:var(--gray-500);">${u.email || '—'}</div></td>
                    <td><code>${u.username}</code></td>
                    <td><span class="badge badge-info" style="font-size:0.6rem;">${u.role || '—'}</span></td>
                    <td style="font-size:0.75rem;">${ca}</td>
                    <td><span class="badge badge-${u.status === 'Active' ? 'success' : 'danger'}" style="font-size:0.6rem;">${u.status || 'Active'}</span></td>
                    <td><div style="display:flex;gap:4px;">
                      <button class="btn-icon" onclick="Settings.editUserModal(${u.id})"><i class="fas fa-edit"></i></button>
                      ${u.id !== 1 ? `<button class="btn-icon" style="color:var(--danger);" onclick="Settings.deleteUser(${u.id})"><i class="fas fa-trash"></i></button>` : ''}</div></td>
                  </tr>`;
    }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  },

  tabAppearance: function () {
    const s = window.DB.settings || {};
    const user = window.currentUser;
    const comp = (window.DB.companies || []).find(c => c.id === this._companyId) || (window.DB.companies || [])[0];
    // Get current user+company color
    const cs = window.DB.companySettings || {};
    const userColors = (comp ? (cs[comp.id] || {}).userColors || {} : {});
    const currentColor = (user ? (userColors[user.id] || userColors[String(user.id)]) : null) || s.primaryColor || '#4f46e5';
    return `<div class="card">
      <div class="card-header"><h3 class="card-title">Appearance</h3>
        ${comp ? `<span class="badge badge-info" style="font-size:0.65rem;">${comp.name}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="alert alert-info" style="font-size:0.82rem;margin-bottom:14px;">
          <i class="fas fa-info-circle"></i>
          Colour changes apply only to <strong>${user?.name || 'you'}</strong> under <strong>${comp?.name || 'this company'}</strong>.
        </div>
        <div class="form-group"><label class="form-label">Primary Colour</label>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px;">
            ${['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']
        .map(hex => `<button onclick="Settings._setColor('${hex}')"
                style="width:28px;height:28px;border-radius:50%;background:${hex};cursor:pointer;
                       border:3px solid ${currentColor === hex ? '#1e293b' : 'transparent'};"></button>`).join('')}
            <input type="color" id="customColor" value="${currentColor}"
              style="width:28px;height:28px;border-radius:50%;border:none;cursor:pointer;padding:0;"
              oninput="Settings._setColor(this.value)">
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">System Name</label>
            <input id="app_sysName" class="form-control" value="${s.systemName || 'Nexa HR &amp; Payroll'}"></div>
          <div class="form-group"><label class="form-label">Date Format</label>
            <select id="app_dateFormat" class="form-control">
              ${['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'D MMM YYYY']
        .map(f => `<option ${(s.dateFormat || 'DD/MM/YYYY') === f ? 'selected' : ''} >${f}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Currency Symbol</label>
            <select id="app_currency" class="form-control">
              ${[['R', 'ZAR — Rand'], ['$', 'USD — Dollar'], ['£', 'GBP — Pound'], ['€', 'EUR — Euro']]
        .map(([v, l]) => `<option value="${v}" ${(s.currency || 'R') === v ? 'selected' : ''} >${l}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Timezone</label>
            <select id="app_tz" class="form-control">
              ${['Africa/Johannesburg (GMT+2)', 'UTC', 'Europe/London (GMT)', 'Africa/Nairobi (GMT+3)']
        .map(tz => `<option ${(s.timezone || 'Africa/Johannesburg (GMT+2)') === tz ? 'selected' : ''} >${tz}</option>`).join('')}
            </select></div>
        </div>
        <button class="btn btn-primary" onclick="Settings.saveAppearance()">
          <i class="fas fa-save"></i> Save Appearance
        </button>
      </div>
    </div>`;
  },

  tabSecurity: function () {
    const s = window.DB.settings || {};
    const sec = s.security || {};
    return `<div class="card">
      <div class="card-header"><h3 class="card-title">Security</h3></div>
      <div class="card-body">
        <div class="form-group"><label class="form-label">Session Timeout</label>
          <select id="sec_to" class="form-control" style="max-width:200px;">
            ${[15, 30, 60, 120, 480].map(m => `<option value="${m}" ${(sec.sessionTimeout || 60) === m ? 'selected' : ''} >${m} minutes</option>`).join('')}
          </select></div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem;
                      padding:10px 0;border-bottom:1px solid var(--gray-100);">
          <input type="checkbox" id="sec_strong" style="width:16px;height:16px;" ${sec.requireStrongPassword ? 'checked' : ''}>
          Require strong passwords
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem;padding:10px 0;">
          <input type="checkbox" id="sec_audit" style="width:16px;height:16px;" ${sec.auditLogging !== false ? 'checked' : ''}>
          Enable audit trail logging
        </label>
        <div style="margin-top:14px;padding:14px;background:var(--gray-50);border-radius:8px;border:1px solid var(--gray-200);">
          <div style="font-weight:600;font-size:0.83rem;margin-bottom:10px;">Change Admin Password</div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">New Password</label>
              <input id="sec_pw1" type="password" class="form-control"></div>
            <div class="form-group"><label class="form-label">Confirm</label>
              <input id="sec_pw2" type="password" class="form-control"></div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="Settings.changeAdminPassword()">Update</button>
        </div>
        <button class="btn btn-primary" style="margin-top:14px;" onclick="Settings.saveSecurity()">
          <i class="fas fa-save"></i> Save
        </button>
      </div>
    </div>`;
  },

  tabSystem: function () {
    const db = window.DB; let sz = 0;
    try { sz = new Blob([JSON.stringify(db)]).size; } catch (_) { }
    const fmt = b => b < 1024 ? b + 'B' : b < 1048576 ? (b / 1024).toFixed(1) + 'KB' : (b / 1048576).toFixed(2) + 'MB';
    return `<div style="display:flex;flex-direction:column;gap:12px;">
      <div class="card">
        <div class="card-header"><h3 class="card-title">Database</h3></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">
            ${[['Employees', (db.employees || []).length], ['Companies', (db.companies || []).length],
      ['Payroll Runs', (db.payrollRuns || []).length], ['Payslips', (db.payslips || []).length],
      ['Departments', (db.departments || []).length], ['Documents', (db.documents || []).length],
      ['Contracts', (db.contracts || []).length], ['Leave Req.', (db.leaveRequests || []).length],
      ['Audit Logs', (db.auditLogs || []).length], ['Storage', fmt(sz)]]
        .map(([l, v]) => `<div style="text-align:center;padding:10px;background:var(--gray-50);border-radius:6px;">
                <div style="font-size:1.2rem;font-weight:800;color:var(--primary);">${v}</div>
                <div style="font-size:0.65rem;color:var(--gray-500);">${l}</div>
              </div>`).join('')}
          </div>
          <div style="margin-top:8px;font-size:0.78rem;color:var(--gray-500);">
            Last saved: ${db._savedAt ? new Date(db._savedAt).toLocaleString() : 'Never'}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title" style="color:var(--danger);">Danger Zone</h3></div>
        <div class="card-body">
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="Settings.exportData()">
              <i class="fas fa-download"></i> Export JSON
            </button>
            <button class="btn btn-outline btn-sm" onclick="Settings.importDataModal()">
              <i class="fas fa-upload"></i> Import
            </button>
            <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);"
              onclick="Settings.clearData()">
              <i class="fas fa-trash-alt"></i> Factory Reset
            </button>
          </div>
        </div>
      </div>
    </div>`;
  },

  saveAll: function () {
    const t = this._tab; const comp = (window.DB.companies || []).find(c => c.id === this._companyId) || null;
    if (t === 'company') this.saveCompany();
    else if (t === 'payroll') this.savePayroll();
    else if (t === 'leave') this.saveLeave();
    else if (t === 'notifications') this.saveNotifications();
    else if (t === 'appearance') this.saveAppearance();
    else if (t === 'security') this.saveSecurity();
    else window.Toast.show('Settings saved', 'success');
  },

  saveCompany: function () {
    const comp = (window.DB.companies || []).find(c => c.id === this._companyId);
    if (!comp) return;
    const g = id => document.getElementById(id)?.value?.trim() || ''
      ; comp.name = g('sc_name') || comp.name; comp.registrationNumber = g('sc_reg') || comp.registrationNumber;
    comp.email = g('sc_email') || comp.email; comp.contact = g('sc_phone') || comp.contact;
    comp.taxReference = g('sc_tax') || comp.taxReference; comp.taxNumber = comp.taxReference;
    comp.vatNumber = g('sc_vat') || comp.vatNumber; comp.uifNumber = g('sc_uif') || comp.uifNumber;
    comp.sdlNumber = g('sc_sdl') || comp.sdlNumber; comp.address = g('sc_addr') || comp.address;
    const img = document.getElementById('sLogoImg');
    if (img?.src?.startsWith('data:')) comp.logo = img.src;
    window.DB.save(); window.Toast.show('Company profile saved', 'success');
  },

  savePayroll: function () {
    const comp = (window.DB.companies || []).find(c => c.id === this._companyId);
    if (comp) { comp.payFrequency = document.getElementById('pd_freq')?.value || comp.payFrequency; comp.payDay = document.getElementById('pd_payday')?.value || comp.payDay; }
    this._setCS(this._companyId, {
      payFrequency: document.getElementById('pd_freq')?.value || 'Monthly',
      payDay: document.getElementById('pd_payday')?.value || '||',
      uifRate: parseFloat(document.getElementById('pd_uif')?.value || 1),
      sdlRate: parseFloat(document.getElementById('pd_sdl')?.value || 1),
      overtimeRate: parseFloat(document.getElementById('pd_ot')?.value || 1.5),
      annualLeaveDays: parseInt(document.getElementById('pd_leave')?.value || 21),
      autoEmailOnApproval: document.getElementById('pd_autoEmail')?.checked !== false,
      autoSendPayslips: document.getElementById('pd_autoPayslips')?.checked || false,
    }); window.Toast.show('Payroll defaults saved', 'success');
  },

  saveLeave: function () {
    this._setCS(this._companyId, {
      annualLeaveDays: parseInt(document.getElementById('lv_annual')?.value || 21),
      sickLeaveDays: parseInt(document.getElementById('lv_sick')?.value || 30),
      familyLeaveDays: parseInt(document.getElementById('lv_family')?.value || 3),
      studyLeaveDays: parseInt(document.getElementById('lv_study')?.value || 0),
      maternityMonths: parseInt(document.getElementById('lv_mat')?.value || 4),
      carryoverDays: parseInt(document.getElementById('lv_carry')?.value || 0),
      leaveRequiresApproval: document.getElementById('lv_approve')?.checked !== false,
      emailOnLeaveRequest: document.getElementById('lv_email')?.checked !== false,
    }); window.Toast.show('Leave policy saved', 'success');
  },

  saveNotifications: function () {
    this._setCS(this._companyId, {
      notifications: {
        email: document.getElementById('notif_email')?.value?.trim() || ''
        , payrollApproval: document.getElementById('n_payroll')?.checked !== false
        , leaveApproval: document.getElementById('n_leave')?.checked !== false
        , contractGenerated: document.getElementById('n_contract')?.checked !== false
        , newEmployee: document.getElementById('n_newEmp')?.checked || false
        , termination: document.getElementById('n_term')?.checked || false
      }
    }); window.Toast.show('Notification settings saved', 'success');
  },

  saveAppearance: function () {
    const s = window.DB.settings = window.DB.settings || {};
    s.systemName = document.getElementById('app_sysName')?.value?.trim() || s.systemName;
    s.dateFormat = document.getElementById('app_dateFormat')?.value || s.dateFormat;
    s.currency = document.getElementById('app_currency')?.value || s.currency;
    s.timezone = document.getElementById('app_tz')?.value || s.timezone;
    // Save color per company+user
    const cc = document.getElementById('customColor');
    if (cc?.value) {
      const user = window.currentUser;
      const compId = this._companyId;
      if (user && compId) {
        window.DB.companySettings = window.DB.companySettings || {};
        window.DB.companySettings[compId] = window.DB.companySettings[compId] || {};
        window.DB.companySettings[compId].userColors = window.DB.companySettings[compId].userColors || {};
        window.DB.companySettings[compId].userColors[user.id] = cc.value;
      } else {
        s.primaryColor = cc.value;
      }
    }
    window.DB.save(); window.Toast.show('Appearance saved', 'success');
  },

  saveSecurity: function () {
    const s = window.DB.settings = window.DB.settings || {};
    s.security = {
      sessionTimeout: parseInt(document.getElementById('sec_to')?.value || 60)
      , requireStrongPassword: document.getElementById('sec_strong')?.checked || false
      , auditLogging: document.getElementById('sec_audit')?.checked !== false
    }; window.DB.save(); window.Toast.show('Security settings saved', 'success');
  },

  changeAdminPassword: function () {
    const p1 = document.getElementById('sec_pw1')?.value, p2 = document.getElementById('sec_pw2')?.value;
    if (!p1) { window.Toast.show('Enter a new password', 'warning'); return; }
    if (p1 !== p2) { window.Toast.show('Passwords do not match', 'warning'); return; }
    if (p1.length < 4) { window.Toast.show('Min 4 characters', 'warning'); return; }
    const a = (window.DB.users || []).find(u => u.id === 1 || u.role === 'Super Admin');
    if (a) { a.password = p1; window.DB.save(); }
    document.getElementById('sec_pw1').value = ''; document.getElementById('sec_pw2').value = '';
    window.Toast.show('Password updated', 'success');
  },

  addUserModal: function () {
    const roles = window.DB.roles || [], companies = window.DB.companies || [];
    const html = `<div class="card" style="width:100%;max-width:460px;margin:auto;">
      <div class="card-header"><h3 class="card-title">Add User</h3>
        <button class="btn btn-outline btn-sm" onclick="closeModal('addUserModal')"><i class="fas fa-times"></i></button>
      </div>
      <div class="card-body">
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Name</label><input id="nu_name" class="form-control"></div>
          <div class="form-group"><label class="form-label">Email</label><input id="nu_email" type="email" class="form-control"></div>
          <div class="form-group"><label class="form-label">Username *</label><input id="nu_user" class="form-control"></div>
          <div class="form-group"><label class="form-label">Password *</label><input id="nu_pwd" type="password" class="form-control"></div>
          <div class="form-group"><label class="form-label">Role</label>
            <select id="nu_role" class="form-control">${roles.map(r => `<option>${r.name}</option>`).join('')}</select></div>
        </div>
        ${companies.length > 1 ? `<div class="form-group"><label class="form-label">Company Access</label>
          <select id="nu_comps" class="form-control" multiple style="height:90px;">
            ${companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select><div class="form-hint">Leave blank = all companies</div></div>`: ''
      }
        <button class="btn btn-primary" style="width:100%;" onclick="Settings.saveNewUser()">
          <i class="fas fa-save"></i> Create
        </button>
      </div>
    </div>`;
    window.showModal('addUserModal', html);
  },

  saveNewUser: function () {
    const un = document.getElementById('nu_user')?.value?.trim(), pw = document.getElementById('nu_pwd')?.value;
    if (!un || !pw) { window.Toast.show('Username & password required', 'warning'); return; }
    if ((window.DB.users || []).some(u => u.username === un)) { window.Toast.show('Username taken', 'warning'); return; }
    const sel = document.getElementById('nu_comps');
    const cids = sel ? [...sel.selectedOptions].map(o => parseInt(o.value)) : [];
    const u = {
      id: (window.DB.users || []).reduce((m, u) => Math.max(m, u.id || 0), 0) + 1
      , name: document.getElementById('nu_name')?.value?.trim() || un
      , email: document.getElementById('nu_email')?.value?.trim() || ''
      , username: un, password: pw
      , role: document.getElementById('nu_role')?.value || 'HR Manager'
      , companyIds: cids, status: 'Active', lastLogin: '', permissions: []
    };
    window.DB.users = window.DB.users || []; window.DB.users.push(u);
    window.DB.save(); window.Toast.show(`User "${un}" created`, 'success');
    window.closeModal('addUserModal'); this._tab = 'users'; this.render(document.getElementById('content'));
  },

  editUserModal: function (uid) {
    const u = (window.DB.users || []).find(u => u.id === uid); if (!u) return;
    const roles = window.DB.roles || [];
    const companies = window.DB.companies || [];
    const html = `<div class="card" style="width:100%;max-width:460px;margin:auto;">
      <div class="card-header"><h3 class="card-title">Edit — ${u.username}</h3>
        <button class="btn btn-outline btn-sm" onclick="closeModal('editUserModal')"><i class="fas fa-times"></i></button>
      </div>
      <div class="card-body">
        <div class="form-group"><label class="form-label">Name</label><input id="eu_name" class="form-control" value="${u.name || ''}" ></div>
        <div class="form-group"><label class="form-label">Email</label><input id="eu_email" type="email" class="form-control" value="${u.email || ''}" ></div>
        <div class="form-group"><label class="form-label">Role</label>
          <select id="eu_role" class="form-control">${roles.map(r => `<option ${u.role === r.name ? 'selected' : ''} >${r.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select id="eu_status" class="form-control">
            <option ${u.status === 'Active' ? 'selected' : ''}>Active</option>
            <option ${u.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
          </select></div>
        ${companies.length > 1 ? `<div class="form-group"><label class="form-label">Company Access</label>
          <select id="eu_comps" class="form-control" multiple style="height:90px;">
            ${companies.map(c => `<option value="${c.id}" ${(u.companyIds || []).includes(c.id) ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select><div class="form-hint">Leave all unselected = access to all companies</div></div>`: ''}
        <div class="form-group"><label class="form-label">New Password (leave blank to keep)</label><input id="eu_pwd" type="password" class="form-control"></div>
        <button class="btn btn-primary" style="width:100%;" onclick="Settings.updateUser(${uid})"><i class="fas fa-save"></i> Save</button>
      </div>
    </div>`;
    window.showModal('editUserModal', html);
  },

  updateUser: function (uid) {
    const u = (window.DB.users || []).find(u => u.id === uid); if (!u) return;
    u.name = document.getElementById('eu_name')?.value?.trim() || u.name;
    u.email = document.getElementById('eu_email')?.value?.trim() || u.email;
    u.role = document.getElementById('eu_role')?.value || u.role;
    u.status = document.getElementById('eu_status')?.value || u.status;
    const pw = document.getElementById('eu_pwd')?.value; if (pw) u.password = pw;
    // Save company access
    const sel = document.getElementById('eu_comps');
    if (sel) {
      const cids = [...sel.selectedOptions].map(o => parseInt(o.value));
      u.companyIds = cids; // empty array means all companies
    }
    window.DB.save(); window.Toast.show('Updated', 'success');
    window.closeModal('editUserModal'); this._tab = 'users'; this.render(document.getElementById('content'));
  },

  deleteUser: function (uid) {
    const u = (window.DB.users || []).find(u => u.id === uid); if (!u || u.id === 1) return;
    window.showConfirmation('Delete User', `Delete <strong>${u.username}</strong>?`, () => {
      window.DB.users = (window.DB.users || []).filter(u => u.id !== uid);
      window.DB.save(); window.Toast.show('Deleted', 'success');
      this._tab = 'users'; this.render(document.getElementById('content'));
    });
  },

  _prevLogo: function (input) {
    if (!input.files?.[0]) return;
    const r = new FileReader();
    r.onload = e => { const img = document.getElementById('sLogoImg'); if (img) { img.src = e.target.result; img.style.display = ''; } };
    r.readAsDataURL(input.files[0]);
  },

  _setColor: function (hex) {
    document.documentElement.style.setProperty('--primary', hex);
    const ci = document.getElementById('customColor'); if (ci) ci.value = hex;
    // Re-style the palette buttons
    document.querySelectorAll('[onclick^="Settings._setColor"]').forEach(btn => {
      btn.style.borderColor = (btn.style.background === hex || btn.getAttribute('style')?.includes(hex)) ? '#1e293b' : 'transparent';
    });
  },

  exportData: function () {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(window.DB, null, 2)], { type: 'application/json' }));
    a.download = `NexaHR_${new Date().toISOString().split('T')[0]}.json`; a.click();
    window.Toast.show('Exported', 'success');
  },

  importDataModal: function () {
    window.showModal('importModal', `<div class="card" style="width:100%;max-width:400px;margin:auto;">
      <div class="card-header"><h3 class="card-title">Import Data</h3>
        <button class="btn btn-outline btn-sm" onclick="closeModal('importModal')"><i class="fas fa-times"></i></button>
      </div>
      <div class="card-body">
        <div class="alert alert-warning" style="font-size:0.82rem;margin-bottom:10px;">
          <i class="fas fa-exclamation-triangle"></i> This overwrites all current data.
        </div>
        <input type="file" id="impFile" class="form-control" accept=".json">
        <button class="btn btn-danger" style="width:100%;margin-top:10px;" onclick="Settings.importData()">
          <i class="fas fa-upload"></i> Import
        </button>
      </div>
    </div>`);
  },

  importData: function () {
    const f = document.getElementById('impFile')?.files?.[0]; if (!f) { window.Toast.show('Select file', 'warning'); return; }
    const r = new FileReader();
    r.onload = e => {
      try {
        Object.assign(window.DB, JSON.parse(e.target.result)); window.DB.save();
        window.Toast.show('Imported', 'success'); window.closeModal('importModal'); this.render(document.getElementById('content'));
      }
      catch (_) { window.Toast.show('Invalid file', 'warning'); }
    };
    r.readAsText(f);
  },

  clearData: function () {
    window.showConfirmation('Factory Reset', '<strong style="color:var(--danger)">Delete ALL data?</strong>', () => {
      localStorage.removeItem(window.StorageManager?.KEY || 'hrpms_data_v2');
      window.Toast.show('Resetting…', 'success'); setTimeout(() => window.location.reload(), 1200);
    });
  }
};

window.Settings = Settings;
window.renderSettings = function (c) { Settings.render(c); };