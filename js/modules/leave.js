
// ─── South African Public Holidays 2025 ─────────────────────────────────────
const SA_PUBLIC_HOLIDAYS = [
  '2025-01-01', // New Year's Day
  '2025-03-21', // Human Rights Day
  '2025-04-18', // Good Friday
  '2025-04-21', // Family Day
  '2025-04-28', // Freedom Day
  '2025-05-01', // Workers' Day
  '2025-06-16', // Youth Day
  '2025-08-09', // National Women's Day
  '2025-09-24', // Heritage Day
  '2025-12-16', // Day of Reconciliation
  '2025-12-25', // Christmas Day
  '2025-12-26', // Day of Goodwill
];

const Leave = {

  // ─── Accrual Engine ────────────────────────────────────────────────────────
  runAccrual: function () {
    const now = new Date();
    const key = `accrual_${now.getFullYear()}_${now.getMonth() + 1}`;
    if (localStorage.getItem(key)) return; // Already ran this month

    const ANNUAL_ENTITLEMENT = 15;
    const SICK_ENTITLEMENT = 30;
    const monthlyAnnual = ANNUAL_ENTITLEMENT / 12;

    window.DB.employees.forEach(emp => {
      if (emp.status !== 'Active') return;
      emp.leaveBalances = emp.leaveBalances || { annual: 15, sick: 30, family: 3 };
      emp.leaveBalances.annual = Math.min(
        (emp.leaveBalances.annual || 0) + monthlyAnnual,
        ANNUAL_ENTITLEMENT
      );
    });

    window.DB.save();
    localStorage.setItem(key, '1');
    console.log('Leave accrual processed for', key);
  },

  // ─── Working Days Calculator (excludes weekends + SA public holidays) ──────
  calculateWorkingDays: function (startDate, endDate) {
    let count = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split('T')[0];
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !SA_PUBLIC_HOLIDAYS.includes(dateStr)) {
        count++;
      }
    }
    return count;
  },

  // ─── Main Render ────────────────────────────────────────────────────────────
  render: function (container) {
    this.runAccrual();

    const emp = window.currentEmployee;
    const balances = emp?.leaveBalances || { annual: 15, sick: 30, family: 3 };
    const isManager = window.currentUser?.role === 'Super Admin' || window.currentUser?.role === 'HR Manager';

    // My pending / history
    const myRequests = (window.DB.leaveRequests || []).filter(r =>
      emp ? r.employeeId === emp.id : true
    );

    // Manager: all pending requests
    const pendingAll = isManager
      ? (window.DB.leaveRequests || []).filter(r => r.status === 'Pending')
      : [];

    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Leave Management</h2>
          <div style="color: var(--gray-500);">Apply for leave and view balances — SA LRA Compliant</div>
        </div>
        <div style="display:flex;gap:8px;">
          ${isManager ? `<button class="btn btn-outline" onclick="Leave.showOvertimeRequests()"><i class="fas fa-clock"></i> Overtime</button>
          <button class="btn btn-outline" onclick="Leave.showTimesheets()"><i class="fas fa-calendar-check"></i> Timesheets</button>` : ''}
          <button class="btn btn-primary" onclick="Leave.showApplyModal()">
            <i class="fas fa-paper-plane"></i> Apply for Leave
          </button>
        </div>
      </div>

      <div class="grid-4" style="margin-bottom: 24px;">
        ${this.balanceCard('Annual', 15, balances.annual || 0, 'primary')}
        ${this.balanceCard('Sick', 30, balances.sick || 0, 'success')}
        ${this.balanceCard('Study', 10, balances.study || 0, 'info')}
        ${this.balanceCard('Family', 3, balances.family || 0, 'warning')}
      </div>

      ${isManager && pendingAll.length ? `
        <div class="card" style="margin-bottom: 24px; border-left: 4px solid var(--warning);">
          <div class="card-header">
            <h4><i class="fas fa-bell"></i> Pending Approval Requests <span class="badge badge-warning">${pendingAll.length}</span></h4>
          </div>
          <div class="table-responsive">
            <table>
              <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Actions</th></tr></thead>
              <tbody>
                ${pendingAll.map(r => {
                  const reqEmp = window.DB.employees.find(e => e.id === r.employeeId);
                  return `<tr>
                    <td style="font-weight:500">${reqEmp ? `${reqEmp.firstName} ${reqEmp.lastName}` : 'Unknown'}</td>
                    <td><span class="badge badge-info">${r.type}</span></td>
                    <td>${r.startDate} → ${r.endDate}</td>
                    <td><strong>${r.days}</strong></td>
                    <td>${r.reason}</td>
                    <td>
                      <div style="display:flex;gap:4px;">
                        <button class="btn btn-sm" style="background:var(--success);color:white;padding:4px 10px;border-radius:6px;" onclick="Leave.approveRequest(${r.id})">
                          <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm" style="background:var(--danger);color:white;padding:4px 10px;border-radius:6px;" onclick="Leave.rejectRequest(${r.id})">
                          <i class="fas fa-times"></i> Reject
                        </button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header"><h4 class="card-title">Leave History</h4></div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Dates</th>
                <th>Working Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Approved By</th>
              </tr>
            </thead>
            <tbody>
              ${myRequests.length ? myRequests.map(req => `
                <tr>
                  <td><span class="badge badge-info">${req.type}</span></td>
                  <td>${req.startDate} to ${req.endDate}</td>
                  <td>${req.days}</td>
                  <td>${req.reason}</td>
                  <td><span class="badge badge-${req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'danger' : 'warning'}">${req.status}</span></td>
                  <td>${req.approvedBy || '—'}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="text-center" style="padding:20px;color:var(--gray-500)">No leave requests found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top: 24px;">
        <div class="card-header"><h4 class="card-title"><i class="fas fa-calendar-star"></i> SA Public Holidays 2025</h4></div>
        <div class="card-body">
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${SA_PUBLIC_HOLIDAYS.map(d => {
              const date = new Date(d);
              const labels = {
                '01-01': "New Year's Day", '03-21': 'Human Rights Day',
                '04-18': 'Good Friday', '04-21': 'Family Day',
                '04-28': 'Freedom Day', '05-01': "Workers' Day",
                '06-16': 'Youth Day', '08-09': "Women's Day",
                '09-24': 'Heritage Day', '12-16': 'Reconciliation Day',
                '12-25': 'Christmas Day', '12-26': 'Day of Goodwill'
              };
              const key = d.substring(5);
              return `<div style="background:var(--primary-soft,#ede9fe);padding:6px 12px;border-radius:20px;font-size:0.78rem;">
                <strong>${date.toLocaleDateString('en-ZA',{month:'short',day:'numeric'})}</strong> — ${labels[key] || d}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    container.innerHTML = html;
  },

  balanceCard: function (type, total, remaining, color) {
    const rem = Math.max(0, Math.round(remaining * 10) / 10);
    const percent = Math.min(100, (rem / total) * 100);
    return `
      <div class="card">
         <div class="card-body">
            <h4 style="color: var(--gray-500); font-size: 0.9rem; margin-bottom: 8px;">${type} Leave</h4>
            <div style="font-size: 2rem; font-weight: 700; margin-bottom: 8px;">${rem} <span style="font-size: 1rem; font-weight: 400; color: var(--gray-400);">/ ${total}</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%; background: var(--${color});"></div></div>
         </div>
      </div>
    `;
  },

  // ─── Apply Modal ────────────────────────────────────────────────────────────
  showApplyModal: function () {
    const html = `
      <div class="card" style="width: 100%; max-width: 500px; margin: auto;">
        <div class="card-header">
          <h3>Apply for Leave</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('leaveModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Leave Type</label>
            <select class="form-control" id="leave_type">
              <option value="Annual">Annual Leave</option>
              <option value="Sick">Sick Leave</option>
              <option value="Study">Study Leave</option>
              <option value="Family">Family Responsibility</option>
            </select>
          </div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Start Date</label><input type="date" class="form-control" id="leave_start"></div>
            <div class="form-group"><label class="form-label">End Date</label><input type="date" class="form-control" id="leave_end"></div>
          </div>
          <div id="leave_days_preview" style="background:var(--gray-50);padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:0.85rem;"></div>
          <div class="form-group">
            <label class="form-label">Reason</label>
            <textarea class="form-control" id="leave_reason" rows="3" placeholder="Brief description..."></textarea>
          </div>
          <div class="alert alert-info" style="font-size:0.82rem;">
            <i class="fas fa-info-circle"></i> Public holidays and weekends are <strong>not</strong> counted as leave days.
          </div>
          <button class="btn btn-primary" style="width: 100%;" onclick="Leave.submitRequest()">Submit Request</button>
        </div>
      </div>
    `;
    showModal('leaveModal', html);
    // Live preview
    setTimeout(() => {
      ['leave_start', 'leave_end'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', Leave.updateDaysPreview.bind(Leave));
      });
    }, 100);
  },

  updateDaysPreview: function () {
    const start = document.getElementById('leave_start')?.value;
    const end = document.getElementById('leave_end')?.value;
    const preview = document.getElementById('leave_days_preview');
    if (!preview) return;
    if (start && end) {
      const days = Leave.calculateWorkingDays(start, end);
      preview.innerHTML = `<i class="fas fa-calendar-check"></i> <strong>${days}</strong> working day${days !== 1 ? 's' : ''} (exc. weekends & public holidays)`;
    } else {
      preview.innerHTML = 'Select start and end dates to calculate working days.';
    }
  },

  submitRequest: function () {
    const type = document.getElementById('leave_type')?.value;
    const start = document.getElementById('leave_start')?.value;
    const end = document.getElementById('leave_end')?.value;
    const reason = document.getElementById('leave_reason')?.value || '';

    if (!start || !end) { window.Toast.show('Please select start and end dates', 'warning'); return; }
    if (new Date(end) < new Date(start)) { window.Toast.show('End date must be after start date', 'warning'); return; }

    const days = this.calculateWorkingDays(start, end);
    const emp = window.currentEmployee;
    const isManager = window.currentUser?.role === 'Super Admin' || window.currentUser?.role === 'HR Manager';

    window.DB.leaveRequests = window.DB.leaveRequests || [];
    const req = {
      id: Date.now(),
      employeeId: emp?.id,
      type,
      startDate: start,
      endDate: end,
      days,
      reason,
      status: isManager ? 'Approved' : 'Pending',
      submittedAt: new Date().toISOString(),
      approvedBy: isManager ? window.currentUser.name : null
    };
    window.DB.leaveRequests.unshift(req);

    // Debit balance immediately if manager-approved
    if (isManager && emp) {
      emp.leaveBalances = emp.leaveBalances || {};
      const key = type.toLowerCase();
      emp.leaveBalances[key] = Math.max(0, (emp.leaveBalances[key] || 0) - days);
    }

    window.DB.save();
    closeModal('leaveModal');
    window.Toast.show(isManager ? 'Leave approved and recorded' : 'Leave request submitted — pending manager approval', 'success');
    this.render(document.getElementById('content'));
  },

  // ─── Approve / Reject ───────────────────────────────────────────────────────
  approveRequest: function (id) {
    const req = (window.DB.leaveRequests || []).find(r => r.id === id);
    if (!req) return;
    req.status = 'Approved';
    req.approvedBy = window.currentUser?.name || 'Manager';
    req.approvedAt = new Date().toISOString();

    // Debit employee balance
    const emp = window.DB.employees.find(e => e.id === req.employeeId);
    if (emp) {
      emp.leaveBalances = emp.leaveBalances || {};
      const key = req.type.toLowerCase();
      emp.leaveBalances[key] = Math.max(0, (emp.leaveBalances[key] || 0) - req.days);
    }

    window.DB.save();
    window.Toast.show(`Leave approved for ${emp ? emp.firstName + ' ' + emp.lastName : 'employee'}`, 'success');
    this.render(document.getElementById('content'));
  },

  rejectRequest: function (id) {
    const req = (window.DB.leaveRequests || []).find(r => r.id === id);
    if (!req) return;
    const reason = prompt('Reason for rejection (optional):') || '';
    req.status = 'Rejected';
    req.approvedBy = window.currentUser?.name || 'Manager';
    req.rejectionReason = reason;
    window.DB.save();
    window.Toast.show('Leave request rejected', 'info');
    this.render(document.getElementById('content'));
  },

  // ─── Overtime Requests ──────────────────────────────────────────────────────
  showOvertimeRequests: function () {
    window.DB.overtimeRequests = window.DB.overtimeRequests || [];
    const pending = window.DB.overtimeRequests.filter(r => r.status === 'Pending');

    const html = `
      <div class="card" style="width:100%;max-width:780px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h4><i class="fas fa-clock"></i> Overtime Requests</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('otModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <button class="btn btn-primary btn-sm" style="margin-bottom:16px" onclick="Leave.submitOvertimeRequest()">
            <i class="fas fa-plus"></i> Submit Overtime
          </button>
          ${window.DB.overtimeRequests.length === 0 ? '<div class="text-center" style="padding:24px;color:var(--gray-500)">No overtime requests.</div>' : `
            <div class="table-responsive">
              <table>
                <thead><tr><th>Employee</th><th>Date</th><th>Hours</th><th>Rate</th><th>Est. Pay</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${window.DB.overtimeRequests.map(r => {
                    const e = window.DB.employees.find(em => em.id === r.employeeId);
                    const dailyRate = (e?.basicSalary || 0) / 22;
                    const hourlyRate = dailyRate / 8;
                    const pay = hourlyRate * r.hours * (r.rate || 1.5);
                    return `<tr>
                      <td>${e ? e.firstName + ' ' + e.lastName : '—'}</td>
                      <td>${r.date}</td>
                      <td>${r.hours}h</td>
                      <td>${r.rate || 1.5}x</td>
                      <td style="font-weight:600">${window.formatCurrency(pay)}</td>
                      <td><span class="badge badge-${r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'danger' : 'warning'}">${r.status}</span></td>
                      <td>${r.status === 'Pending' ? `
                        <button class="btn btn-sm" style="background:var(--success);color:white;padding:3px 8px;border-radius:4px;" onclick="Leave.approveOT(${r.id})">✓</button>
                        <button class="btn btn-sm" style="background:var(--danger);color:white;padding:3px 8px;border-radius:4px;" onclick="Leave.rejectOT(${r.id})">✗</button>
                      ` : '—'}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>`;
    window.showModal('otModal', html);
  },

  submitOvertimeRequest: function () {
    const empOptions = window.DB.employees.filter(e => e.status === 'Active').map(e => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('');
    const subHtml = `
      <div class="card" style="width:100%;max-width:480px;margin:auto;">
        <div class="card-header"><h4>Submit Overtime</h4><button class="btn btn-outline btn-sm" onclick="closeModal('otSubModal')"><i class="fas fa-times"></i></button></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Employee</label><select id="ot_emp" class="form-control">${empOptions}</select></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Date</label><input type="date" id="ot_date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label class="form-label">Hours</label><input type="number" id="ot_hours" class="form-control" min="0.5" step="0.5" value="2"></div>
          </div>
          <div class="form-group"><label class="form-label">Rate</label>
            <select id="ot_rate" class="form-control"><option value="1.5">1.5x (Ordinary OT)</option><option value="2">2x (Sunday/Public Holiday)</option></select>
          </div>
          <div class="form-group"><label class="form-label">Reason</label><input type="text" id="ot_reason" class="form-control" placeholder="Project deadline, emergency, etc."></div>
          <button class="btn btn-primary" style="width:100%" onclick="Leave.saveOvertimeRequest()">Submit</button>
        </div>
      </div>`;
    window.showModal('otSubModal', subHtml);
  },

  saveOvertimeRequest: function () {
    window.DB.overtimeRequests = window.DB.overtimeRequests || [];
    window.DB.overtimeRequests.unshift({
      id: Date.now(),
      employeeId: parseInt(document.getElementById('ot_emp').value),
      date: document.getElementById('ot_date').value,
      hours: parseFloat(document.getElementById('ot_hours').value),
      rate: parseFloat(document.getElementById('ot_rate').value),
      reason: document.getElementById('ot_reason').value,
      status: 'Pending',
      submittedBy: window.currentUser?.name || 'Manager'
    });
    window.DB.save();
    window.Toast.show('Overtime request submitted', 'success');
    closeModal('otSubModal');
    this.showOvertimeRequests();
  },

  approveOT: function (id) {
    const req = (window.DB.overtimeRequests || []).find(r => r.id === id);
    if (req) { req.status = 'Approved'; req.approvedBy = window.currentUser?.name || 'Manager'; }
    window.DB.save();
    window.Toast.show('Overtime approved', 'success');
    closeModal('otModal');
    this.showOvertimeRequests();
  },

  rejectOT: function (id) {
    const req = (window.DB.overtimeRequests || []).find(r => r.id === id);
    if (req) { req.status = 'Rejected'; }
    window.DB.save();
    closeModal('otModal');
    this.showOvertimeRequests();
  },

  // ─── Timesheets ─────────────────────────────────────────────────────────────
  showTimesheets: function () {
    window.DB.timesheets = window.DB.timesheets || [];
    const emps = window.DB.employees.filter(e => e.status === 'Active');
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const html = `
      <div class="card" style="width:100%;max-width:900px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h4><i class="fas fa-calendar-check"></i> Weekly Timesheets</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('tsModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="alert alert-info"><i class="fas fa-info-circle"></i> Week of ${weekStart.toLocaleDateString('en-ZA')}. Enter hours per day. Manager sign-off approves the timesheet.</div>
          <div class="table-responsive">
            <table>
              <thead><tr><th>Employee</th>${days.map(d => `<th style="text-align:center">${d}</th>`).join('')}<th style="text-align:center">Total</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${emps.slice(0, 10).map(emp => {
                  const ts = window.DB.timesheets.find(t => t.employeeId === emp.id && t.weekStart === weekStart.toISOString().split('T')[0]);
                  const hours = ts?.hours || [8, 8, 8, 8, 8];
                  const total = hours.reduce((s, h) => s + h, 0);
                  return `<tr>
                    <td style="font-weight:500">${emp.firstName} ${emp.lastName}</td>
                    ${hours.map((h, i) => `<td style="text-align:center"><input type="number" style="width:50px;text-align:center;border:1px solid var(--gray-200);border-radius:4px;padding:2px;" value="${h}" min="0" max="24" id="ts_${emp.id}_${i}"></td>`).join('')}
                    <td style="text-align:center;font-weight:700">${total}h</td>
                    <td><span class="badge badge-${ts?.status === 'Approved' ? 'success' : ts?.status === 'Submitted' ? 'warning' : 'gray'}">${ts?.status || 'Draft'}</span></td>
                    <td>
                      <button class="btn btn-sm" style="background:var(--success);color:white;padding:3px 8px;border-radius:4px;" onclick="Leave.approveTimesheet(${emp.id}, '${weekStart.toISOString().split('T')[0]}')">Approve</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <button class="btn btn-primary" style="margin-top:16px" onclick="Leave.saveTimesheets('${weekStart.toISOString().split('T')[0]}')">Save All Timesheets</button>
        </div>
      </div>`;
    window.showModal('tsModal', html);
  },

  saveTimesheets: function (weekStart) {
    window.DB.timesheets = window.DB.timesheets || [];
    const emps = window.DB.employees.filter(e => e.status === 'Active').slice(0, 10);
    emps.forEach(emp => {
      const hours = [0, 1, 2, 3, 4].map(i => parseFloat(document.getElementById(`ts_${emp.id}_${i}`)?.value || 8));
      const existing = window.DB.timesheets.find(t => t.employeeId === emp.id && t.weekStart === weekStart);
      if (existing) {
        existing.hours = hours;
        existing.status = 'Submitted';
      } else {
        window.DB.timesheets.push({ id: Date.now() + emp.id, employeeId: emp.id, weekStart, hours, status: 'Submitted', submittedAt: new Date().toISOString() });
      }
    });
    window.DB.save();
    window.Toast.show('Timesheets saved', 'success');
    closeModal('tsModal');
    this.showTimesheets();
  },

  approveTimesheet: function (empId, weekStart) {
    window.DB.timesheets = window.DB.timesheets || [];
    const ts = window.DB.timesheets.find(t => t.employeeId === empId && t.weekStart === weekStart);
    if (ts) {
      ts.status = 'Approved';
      ts.approvedBy = window.currentUser?.name || 'Manager';
    }
    window.DB.save();
    window.Toast.show('Timesheet approved', 'success');
    closeModal('tsModal');
    this.showTimesheets();
  }
};

window.renderLeave = function (container) {
  Leave.render(container);
};