// ─── Dashboard Module ─────────────────────────────────────────────────────────
const Dashboard = {

  render: function (container) {
    const now        = new Date();
    const thisMonth  = now.getMonth();
    const thisYear   = now.getFullYear();

    const employees  = window.DB.employees  || [];
    const companies  = window.DB.companies  || [];
    const payRuns    = window.DB.payrollRuns|| [];
    const leaves     = window.DB.leaveRequests || [];
    const payslips   = window.DB.payslips   || [];
    const contracts  = window.DB.contracts  || [];
    const documents  = window.DB.documents  || [];

    // ── KPIs ───────────────────────────────────────────────────────────────────
    const activeEmps    = employees.filter(e => e.status !== 'Terminated');
    const terminatedEmps= employees.filter(e => e.status === 'Terminated');
    const newThisMonth  = employees.filter(e => {
      if (!e.startDate && !e.createdAt) return false;
      const d = new Date(e.startDate || e.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    // Monthly payroll cost from the latest finalized run
    const latestRun     = payRuns
      .filter(r => r.status === 'Finalized' || r.status === 'Paid' || r.status === 'Approved')
      .sort((a, b) => (b.runDate || b.id || '').localeCompare(a.runDate || a.id || ''))
    [0];
    const monthlyPayroll = latestRun ? (latestRun.totalNet || 0) : 0;
    const totalPayroll   = activeEmps.reduce((s, e) => s + (e.basicSalary || 0), 0);

    // Pending leave requests
    const pendingLeave  = leaves.filter(l => l.status === 'Pending');
    const pendingRuns   = payRuns.filter(r => r.status === 'Pending Approval');
    const pendingTasks  = this._getPendingTasks();
    const notifications = this.getNotifications();

    // Payroll trend — last 6 months from payRuns
    const trendMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const year  = d.getFullYear();
      const mon   = d.getMonth();
      // Find a run whose period matches this month
      const run = payRuns.filter(r => {
        if (!r.period) return false;
        const rDate = new Date(r.period + '-01');
        return rDate.getMonth() === mon && rDate.getFullYear() === year;
      }).sort((a,b) => (b.totalNet||0) - (a.totalNet||0))[0];
      trendMonths.push({ label, value: run ? (run.totalNet || 0) : 0 });
    }

    // Department distribution
    const deptMap = {};
    activeEmps.forEach(e => {
      const d = e.department || 'Unassigned';
      deptMap[d] = (deptMap[d] || 0) + 1;
    });
    const deptItems = Object.entries(deptMap).sort((a,b) => b[1]-a[1]).slice(0,6);

    // Recent activity — payroll runs + new employees + leave requests
    const recentActivity = this._getRecentActivity();

    container.innerHTML = `
      <div style="margin-bottom:20px;">
        <h2 style="font-size:1.3rem;margin:0;">Dashboard</h2>
        <div style="color:var(--gray-500);font-size:0.85rem;">
          ${now.toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </div>
      </div>

      <!-- KPI Cards — single compact row, 8 cards -->
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-bottom:12px;">
        ${this._kpiCard('Employees',    activeEmps.length,                                   'fas fa-users',           'primary', '+'+newThisMonth.length+' new')}
        ${this._kpiCard('Payroll',      window.formatCurrency(monthlyPayroll||totalPayroll),  'fas fa-money-bill-wave', 'success', latestRun?latestRun.period:'No run')}
        ${this._kpiCard('Leave Req.',   pendingLeave.length,                                  'fas fa-calendar-times',  'warning', 'Pending')}
        ${this._kpiCard('Companies',    companies.length,                                     'fas fa-building',        'info',    companies.filter(c=>c.status==='Active'||!c.status).length+' active')}
        ${this._kpiCard('New Hires',    newThisMonth.length,                                  'fas fa-user-plus',       'teal',    'This month')}
        ${this._kpiCard('Runs',         payRuns.length,                                       'fas fa-file-invoice',    'purple',  pendingRuns.length+' pending')}
        ${this._kpiCard('Contracts',    contracts.length,                                     'fas fa-file-signature',  'orange',  documents.length+' docs')}
        ${this._kpiCard('Terminated',   terminatedEmps.length,                                'fas fa-user-minus',      'danger',  'Ex-employees')}
      </div>

      <!-- Main content grid -->
      <div style="display:grid;grid-template-columns:1fr 340px;gap:16px;margin-bottom:16px;">

        <!-- Payroll Trend -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-chart-line text-primary"></i> Payroll Trend (6 Months)</h3>
          </div>
          <div class="card-body">
            ${this._renderTrendChart(trendMonths)}
          </div>
        </div>

        <!-- Pending Tasks -->
        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
            <h3 class="card-title"><i class="fas fa-tasks text-warning"></i> Pending Tasks</h3>
            <span class="badge badge-warning">${pendingTasks.length}</span>
          </div>
          <div class="card-body" style="padding:0;">
            ${pendingTasks.length ? pendingTasks.map(t => `
              <div style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;
                          border-bottom:1px solid var(--gray-100);" class="hover-row">
                <div style="width:32px;height:32px;border-radius:50%;
                            background:var(--${t.color}-soft,var(--primary-soft));
                            color:var(--${t.color},var(--primary));
                            display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i class="${t.icon}" style="font-size:0.8rem;"></i>
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.82rem;font-weight:600;color:var(--gray-800);">${t.title}</div>
                  <div style="font-size:0.72rem;color:var(--gray-500);">${t.desc}</div>
                </div>
                <button class="btn btn-xs btn-outline" onclick="${t.action}"
                  style="font-size:0.65rem;padding:2px 8px;white-space:nowrap;">View</button>
              </div>`).join('') : `
              <div style="padding:40px;text-align:center;color:var(--gray-400);">
                <i class="fas fa-check-circle" style="font-size:1.8rem;margin-bottom:8px;display:block;color:var(--success);"></i>
                All caught up!
              </div>`}
          </div>
        </div>
      </div>

      <!-- Bottom grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">

        <!-- Department Distribution -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-sitemap text-primary"></i> Headcount by Department</h3>
          </div>
          <div class="card-body">
            ${deptItems.length ? deptItems.map(([dept, count]) => {
              const pct = Math.round((count / activeEmps.length) * 100) || 0;
              return `
                <div style="margin-bottom:12px;">
                  <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
                    <span style="font-weight:500;">${dept}</span>
                    <span style="color:var(--gray-500);">${count} (${pct}%)</span>
                  </div>
                  <div style="height:6px;background:var(--gray-100);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:99px;
                                transition:width 0.6s ease;"></div>
                  </div>
                </div>`;
            }).join('') : '<div style="color:var(--gray-400);text-align:center;padding:24px;">No employee data yet</div>'}
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-history text-info"></i> Recent Activity</h3>
          </div>
          <div class="card-body" style="padding:0;max-height:300px;overflow-y:auto;">
            ${recentActivity.length ? recentActivity.map(a => `
              <div style="display:flex;gap:10px;padding:10px 16px;border-bottom:1px solid var(--gray-100);">
                <div style="width:28px;height:28px;border-radius:50%;background:var(--${a.color}-soft,var(--primary-soft));
                            color:var(--${a.color},var(--primary));display:flex;align-items:center;justify-content:center;
                            flex-shrink:0;font-size:0.7rem;">
                  <i class="${a.icon}"></i>
                </div>
                <div>
                  <div style="font-size:0.8rem;font-weight:500;">${a.text}</div>
                  <div style="font-size:0.7rem;color:var(--gray-400);">${a.time}</div>
                </div>
              </div>`).join('') : `
              <div style="padding:40px;text-align:center;color:var(--gray-400);">
                No recent activity
              </div>`}
          </div>
        </div>
      </div>

      <!-- Leave & Payroll pending approvals -->
      ${(pendingLeave.length || pendingRuns.length) ? `
      <div class="grid-2" style="gap:16px;">
        ${pendingLeave.length ? `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-calendar-check text-warning"></i> Leave Awaiting Approval</h3>
            <span class="badge badge-warning">${pendingLeave.length}</span>
          </div>
          <div class="card-body" style="padding:0;">
            ${pendingLeave.slice(0,5).map(l => {
              const emp = employees.find(e => e.id == l.employeeId);
              return `
              <div style="display:flex;align-items:center;justify-content:space-between;
                          padding:10px 16px;border-bottom:1px solid var(--gray-100);">
                <div>
                  <div style="font-size:0.82rem;font-weight:600;">
                    ${emp ? emp.firstName + ' ' + emp.lastName : 'Unknown'}
                  </div>
                  <div style="font-size:0.72rem;color:var(--gray-500);">
                    ${l.leaveType || 'Leave'} • ${l.startDate} – ${l.endDate}
                  </div>
                </div>
                <button class="btn btn-xs btn-primary" onclick="loadPage('leave')">Review</button>
              </div>`;
            }).join('')}
            ${pendingLeave.length > 5 ? `
              <div style="padding:8px 16px;text-align:center;font-size:0.75rem;color:var(--primary);cursor:pointer;"
                onclick="loadPage('leave')">+${pendingLeave.length - 5} more →</div>` : ''}
          </div>
        </div>` : ''}

        ${pendingRuns.length ? `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-file-invoice-dollar text-danger"></i> Payroll Awaiting Approval</h3>
            <span class="badge badge-danger">${pendingRuns.length}</span>
          </div>
          <div class="card-body" style="padding:0;">
            ${pendingRuns.slice(0,5).map(r => `
              <div style="display:flex;align-items:center;justify-content:space-between;
                          padding:10px 16px;border-bottom:1px solid var(--gray-100);">
                <div>
                  <div style="font-size:0.82rem;font-weight:600;">${r.period}</div>
                  <div style="font-size:0.72rem;color:var(--gray-500);">
                    ${r.company || ''} • ${r.employeeCount || 0} employees
                  </div>
                </div>
                <button class="btn btn-xs btn-primary" onclick="loadPage('payroll')">Approve</button>
              </div>`).join('')}
          </div>
        </div>` : ''}
      </div>` : ''}`;
  },

  _kpiCard: function (title, value, icon, color, sub) {
    return `
      <div class="card" style="padding:6px 8px;border-left:3px solid var(--${color},var(--primary));">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:2px;">
          <div style="min-width:0;flex:1;">
            <div style="font-size:0.55rem;text-transform:uppercase;letter-spacing:0.3px;
              color:var(--gray-500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
            <div style="font-size:0.9rem;font-weight:800;color:var(--gray-900);line-height:1.1;margin:1px 0;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${value}
            </div>
            <div style="font-size:0.58rem;color:var(--gray-400);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sub}</div>
          </div>
          <div style="width:22px;height:22px;flex-shrink:0;border-radius:5px;background:var(--${color}-soft,var(--primary-soft));
            display:flex;align-items:center;justify-content:center;color:var(--${color},var(--primary));font-size:0.65rem;">
            <i class="${icon}"></i>
          </div>
        </div>
      </div>`;
  },

  _renderTrendChart: function (months) {
    const max = Math.max(...months.map(m => m.value), 1);
    const fmtK = v => v >= 1000000 ? 'R' + (v/1000000).toFixed(1) + 'M'
                    : v >= 1000    ? 'R' + (v/1000).toFixed(0)    + 'k' : 'R' + v;

    return `
      <div style="display:flex;align-items:flex-end;gap:8px;height:160px;padding-bottom:4px;">
        ${months.map(m => {
          const h = max > 0 ? Math.round((m.value / max) * 140) : 4;
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
              <div style="font-size:0.6rem;color:var(--gray-400);">${m.value ? fmtK(m.value) : ''}</div>
              <div style="width:100%;height:${Math.max(h,4)}px;background:var(--primary);
                          border-radius:4px 4px 0 0;opacity:${m.value ? 1 : 0.15};
                          transition:height 0.5s ease;cursor:pointer;"
                   title="${m.label}: ${window.formatCurrency(m.value)}"></div>
              <div style="font-size:0.7rem;color:var(--gray-500);">${m.label}</div>
            </div>`;
        }).join('')}
      </div>
      ${months.every(m => m.value === 0) ? `
        <div style="text-align:center;color:var(--gray-400);font-size:0.8rem;margin-top:8px;">
          No payroll runs recorded yet
        </div>` : ''}`;
  },

  _getPendingTasks: function () {
    const tasks = [];
    const employees = window.DB.employees || [];
    const leaves    = window.DB.leaveRequests || [];
    const payRuns   = window.DB.payrollRuns || [];
    const contracts = window.DB.contracts || [];

    // Pending leave approvals
    const pendingLeave = leaves.filter(l => l.status === 'Pending');
    if (pendingLeave.length) {
      tasks.push({
        icon: 'fas fa-calendar-times', color: 'warning',
        title: `${pendingLeave.length} Leave Request${pendingLeave.length > 1 ? 's' : ''} Pending`,
        desc: 'Awaiting your approval',
        action: "loadPage('leave')"
      });
    }

    // Pending payroll approvals
    const pendingPayroll = payRuns.filter(r => r.status === 'Pending Approval');
    if (pendingPayroll.length) {
      tasks.push({
        icon: 'fas fa-file-invoice-dollar', color: 'danger',
        title: `${pendingPayroll.length} Payroll Run${pendingPayroll.length > 1 ? 's' : ''} to Approve`,
        desc: pendingPayroll.map(r => r.period).slice(0,2).join(', '),
        action: "loadPage('payroll')"
      });
    }

    // Employees without email
    const noEmail = employees.filter(e => e.status !== 'Terminated' && !e.email);
    if (noEmail.length) {
      tasks.push({
        icon: 'fas fa-envelope-open', color: 'info',
        title: `${noEmail.length} Employee${noEmail.length > 1 ? 's' : ''} Missing Email`,
        desc: 'Required for payslip delivery',
        action: "loadPage('employees')"
      });
    }

    // Contracts expiring this month
    const now = new Date();
    const expiring = contracts.filter(c => {
      if (!c.endDate || c.type === 'Permanent') return false;
      const end = new Date(c.endDate);
      const diffDays = Math.ceil((end - now) / (1000*60*60*24));
      return diffDays >= 0 && diffDays <= 30;
    });
    if (expiring.length) {
      tasks.push({
        icon: 'fas fa-file-signature', color: 'orange',
        title: `${expiring.length} Contract${expiring.length > 1 ? 's' : ''} Expiring Soon`,
        desc: 'Within the next 30 days',
        action: "loadPage('contracts')"
      });
    }

    // Employees without banking details
    const noBanking = employees.filter(e => e.status !== 'Terminated' && !e.bankName && !e.accountNumber);
    if (noBanking.length && noBanking.length <= 10) {
      tasks.push({
        icon: 'fas fa-university', color: 'purple',
        title: `${noBanking.length} Employee${noBanking.length > 1 ? 's' : ''} Without Banking Info`,
        desc: 'Needed for payroll processing',
        action: "loadPage('employees')"
      });
    }

    return tasks;
  },

  _getRecentActivity: function () {
    const items = [];
    const employees = window.DB.employees || [];
    const leaves    = window.DB.leaveRequests || [];
    const payRuns   = window.DB.payrollRuns || [];
    const contracts = window.DB.contracts || [];

    // Recent payroll runs (last 3)
    payRuns.slice(-3).reverse().forEach(r => {
      items.push({
        icon: 'fas fa-money-check-alt', color: 'success',
        text: `Payroll run for ${r.period} — ${r.status}`,
        time: r.runDate ? new Date(r.runDate).toLocaleDateString() : 'Recently',
        _ts: r.runDate || r.id || ''
      });
    });

    // Recent employees (last 3)
    employees.slice(-3).reverse().forEach(e => {
      items.push({
        icon: 'fas fa-user-plus', color: 'primary',
        text: `${e.firstName} ${e.lastName} joined as ${e.position || 'Employee'}`,
        time: e.startDate ? new Date(e.startDate).toLocaleDateString() : 'Recently',
        _ts: e.startDate || e.createdAt || ''
      });
    });

    // Recent leave requests (last 3)
    leaves.slice(-3).reverse().forEach(l => {
      const emp = employees.find(e => e.id == l.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Employee';
      items.push({
        icon: 'fas fa-calendar-alt', color: 'warning',
        text: `${name} requested ${l.leaveType || 'leave'} — ${l.status}`,
        time: l.appliedDate ? new Date(l.appliedDate).toLocaleDateString() : 'Recently',
        _ts: l.appliedDate || l.id || ''
      });
    });

    // Recent contracts
    contracts.slice(-2).reverse().forEach(c => {
      const emp = employees.find(e => e.id == c.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Employee';
      items.push({
        icon: 'fas fa-file-signature', color: 'info',
        text: `Contract generated for ${name}`,
        time: c.generatedAt ? new Date(c.generatedAt).toLocaleDateString() : 'Recently',
        _ts: c.generatedAt || c.id || ''
      });
    });

    // Sort by timestamp desc and take top 8
    return items.sort((a, b) => String(b._ts).localeCompare(String(a._ts))).slice(0, 8);
  },

  // ── Build notifications array from real DB data ─────────────────────────────
  getNotifications: function () {
    const notes = [];
    const employees = window.DB.employees || [];
    const leaves    = window.DB.leaveRequests || [];
    const payRuns   = window.DB.payrollRuns || [];
    const contracts = window.DB.contracts || [];
    const now       = new Date();

    // Pending leave requests
    leaves.filter(l => l.status === 'Pending').slice(0, 5).forEach(l => {
      const emp = employees.find(e => e.id == l.employeeId);
      notes.push({
        id:   `leave_${l.id}`,
        type: 'leave',
        icon: 'fas fa-calendar-times',
        color: 'warning',
        title: 'Leave Request Pending',
        message: `${emp ? emp.firstName + ' ' + emp.lastName : 'An employee'} requested ${l.leaveType || 'leave'} (${l.startDate})`,
        time: l.appliedDate || '',
        unread: true,
        action: "loadPage('leave')"
      });
    });

    // Pending payroll approvals
    payRuns.filter(r => r.status === 'Pending Approval').forEach(r => {
      notes.push({
        id:   `payroll_${r.id}`,
        type: 'payroll',
        icon: 'fas fa-file-invoice-dollar',
        color: 'danger',
        title: 'Payroll Awaiting Approval',
        message: `${r.period} payroll run for ${r.employeeCount || 0} employees`,
        time: r.runDate || '',
        unread: true,
        action: "loadPage('payroll')"
      });
    });

    // New employees this month
    const newEmps = employees.filter(e => {
      if (!e.startDate && !e.createdAt) return false;
      const d = new Date(e.startDate || e.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    if (newEmps.length) {
      notes.push({
        id:   `newemps_${now.getMonth()}`,
        type: 'employee',
        icon: 'fas fa-user-plus',
        color: 'success',
        title: 'New Employees This Month',
        message: `${newEmps.length} new hire${newEmps.length > 1 ? 's' : ''} joined this month`,
        time: '',
        unread: false,
        action: "loadPage('employees')"
      });
    }

    // Expiring contracts
    const expiring = contracts.filter(c => {
      if (!c.endDate || c.type === 'Permanent') return false;
      const end = new Date(c.endDate);
      const diffDays = Math.ceil((end - now) / (1000*60*60*24));
      return diffDays >= 0 && diffDays <= 30;
    });
    expiring.slice(0, 3).forEach(c => {
      const emp = employees.find(e => e.id == c.employeeId);
      notes.push({
        id:   `contract_${c.id}`,
        type: 'contract',
        icon: 'fas fa-file-signature',
        color: 'orange',
        title: 'Contract Expiring Soon',
        message: `${emp ? emp.firstName + ' ' + emp.lastName : 'Employee'}'s contract ends ${c.endDate}`,
        time: c.endDate,
        unread: true,
        action: "loadPage('contracts')"
      });
    });

    // Employees missing email (for payslip delivery)
    const noEmail = employees.filter(e => e.status !== 'Terminated' && !e.email);
    if (noEmail.length) {
      notes.push({
        id:   'missing_email',
        type: 'info',
        icon: 'fas fa-envelope-open-text',
        color: 'info',
        title: 'Missing Employee Emails',
        message: `${noEmail.length} employees have no email — payslips cannot be sent`,
        time: '',
        unread: false,
        action: "loadPage('employees')"
      });
    }

    return notes;
  }
};

// ── Notification Bell Renderer ─────────────────────────────────────────────────
function renderNotificationBell() {
  const bell    = document.getElementById('notificationBell');
  const badge   = document.getElementById('notificationBadge');
  const dropdown= document.getElementById('notificationDropdown');
  if (!bell) return;

  const notes   = Dashboard.getNotifications();
  const unread  = notes.filter(n => n.unread).length;

  if (badge) {
    badge.textContent = unread || '';
    badge.style.display = unread ? 'flex' : 'none';
  }

  if (dropdown) {
    dropdown.innerHTML = `
      <div style="padding:12px 16px;border-bottom:1px solid var(--gray-100);
                  display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;font-size:0.9rem;">Notifications</span>
        ${unread ? `<span class="badge badge-primary" style="font-size:0.65rem;">${unread} new</span>` : ''}
      </div>
      ${notes.length ? notes.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''}"
             style="display:flex;gap:10px;padding:12px 16px;
                    border-bottom:1px solid var(--gray-50);cursor:pointer;
                    background:${n.unread ? 'var(--primary-soft)' : 'white'};
                    transition:background 0.2s;"
             onclick="${n.action};document.getElementById('notificationDropdown').classList.remove('open');">
          <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;
                      background:var(--${n.color}-soft,var(--primary-soft));
                      color:var(--${n.color},var(--primary));
                      display:flex;align-items:center;justify-content:center;font-size:0.8rem;">
            <i class="${n.icon}"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.8rem;font-weight:600;color:var(--gray-800);">${n.title}</div>
            <div style="font-size:0.72rem;color:var(--gray-500);white-space:normal;">${n.message}</div>
            ${n.time ? `<div style="font-size:0.65rem;color:var(--gray-400);margin-top:2px;">${n.time}</div>` : ''}
          </div>
          ${n.unread ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:4px;"></div>` : ''}
        </div>`).join('') : `
      <div style="padding:40px;text-align:center;color:var(--gray-400);">
        <i class="fas fa-bell-slash" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>
        No notifications
      </div>`}
      <div style="padding:10px;text-align:center;border-top:1px solid var(--gray-100);">
        <button class="btn btn-outline btn-xs" style="width:100%;"
          onclick="loadPage('dashboard');document.getElementById('notificationDropdown').classList.remove('open');">
          View Dashboard
        </button>
      </div>`;
  }
}

window.renderDashboard = function (container) {
  Dashboard.render(container);
};

window.Dashboard = Dashboard;
window.renderNotificationBell = renderNotificationBell;