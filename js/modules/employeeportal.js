// ─── Employee Self-Service Portal ─────────────────────────────────────────────
const EmployeePortal = {
  activeTab: 'overview',

  render: function (container) {
    const user = window.currentUser;
    if (!user) {
      container.innerHTML = '<div class="alert alert-warning"><i class="fas fa-lock"></i> Please log in to view the portal.</div>';
      return;
    }

    const emp = (window.DB.employees || []).find(e => e.id === user.employeeId || e.id == user.employee_id) || {};
    const payslips = (window.DB.payslips || []).filter(p => p.employeeId === emp.id || p.employeeId == emp.id).sort((a, b) => (b.runId || '').localeCompare(a.runId || ''));
    const leaveRequests = (window.DB.leaveRequests || []).filter(r => r.employeeId === emp.id || r.employeeId == emp.id);
    const myDocs = (window.DB.documents || []).filter(d => d.employeeId === emp.id || d.employeeId == emp.id);
    const bal = emp.leaveBalances || { annual: 15, sick: 30, family: 3 };

    const tabs = [
      { id: 'overview', icon: 'fas fa-home', label: 'Overview' },
      { id: 'payslips', icon: 'fas fa-file-invoice-dollar', label: 'Payslips' },
      { id: 'leave', icon: 'fas fa-umbrella-beach', label: 'Leave' },
      { id: 'profile', icon: 'fas fa-user-edit', label: 'My Details' },
      { id: 'documents', icon: 'fas fa-folder-open', label: 'Documents' }
    ];

    container.innerHTML = `
      <div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:48px;height:48px;border-radius:50%;background:var(--primary);
                      display:flex;align-items:center;justify-content:center;color:white;
                      font-size:1.2rem;font-weight:700;">
            ${(emp.firstName || user.name || 'U')[0]}
          </div>
          <div>
            <h2 style="font-size:1.2rem;margin:0;">Welcome, ${emp.firstName || user.name || 'Employee'}</h2>
            <div style="color:var(--gray-500);font-size:0.82rem;">
              ${emp.position || 'Employee'} ${emp.department ? '• ' + emp.department : ''} ${emp.companyName ? '• ' + emp.companyName : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div style="display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid var(--gray-200);padding-bottom:0;">
        ${tabs.map(t => `
          <button class="btn ${this.activeTab === t.id ? '' : 'btn-outline'}" onclick="EmployeePortal.switchTab('${t.id}')"
            style="border-radius:8px 8px 0 0;border-bottom:none;font-size:0.8rem;padding:8px 16px;
                   ${this.activeTab === t.id ? 'background:var(--primary);color:white;' : 'background:transparent;'}">
            <i class="${t.icon}" style="margin-right:4px;"></i> ${t.label}
          </button>
        `).join('')}
      </div>

      <div id="portalTabContent">
        ${this.renderTab(emp, payslips, leaveRequests, myDocs, bal)}
      </div>
    `;
  },

  switchTab: function (tab) {
    this.activeTab = tab;
    this.render(document.getElementById('content'));
  },

  renderTab: function (emp, payslips, leaveRequests, myDocs, bal) {
    switch (this.activeTab) {
      case 'overview': return this.renderOverview(emp, payslips, leaveRequests, bal);
      case 'payslips': return this.renderPayslips(payslips, emp);
      case 'leave': return this.renderLeave(leaveRequests, bal, emp);
      case 'profile': return this.renderProfile(emp);
      case 'documents': return this.renderDocuments(myDocs, emp);
      default: return this.renderOverview(emp, payslips, leaveRequests, bal);
    }
  },

  // ── Overview Tab ─────────────────────────────────────────
  renderOverview: function (emp, payslips, leaveRequests, bal) {
    const latestSlip = payslips[0];
    const pendingLeave = leaveRequests.filter(r => r.status === 'Pending').length;

    return `
      <!-- KPI Cards -->
      <div class="grid-4" style="gap:12px;margin-bottom:16px;">
        <div class="card" style="padding:16px;border-left:3px solid var(--primary);cursor:pointer;"
             onclick="EmployeePortal.switchTab('payslips')">
          <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);margin-bottom:4px;">Latest Payslip</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--primary);">${latestSlip ? window.formatCurrency(latestSlip.net || 0) : '—'}</div>
          <div style="font-size:0.68rem;color:var(--gray-400);">${latestSlip ? latestSlip.period : 'No payslips'}</div>
        </div>
        <div class="card" style="padding:16px;border-left:3px solid var(--success);cursor:pointer;"
             onclick="EmployeePortal.switchTab('leave')">
          <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);margin-bottom:4px;">Annual Leave</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--success);">${(bal.annual || 0).toFixed(1)}</div>
          <div style="font-size:0.68rem;color:var(--gray-400);">days remaining</div>
        </div>
        <div class="card" style="padding:16px;border-left:3px solid var(--info);">
          <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);margin-bottom:4px;">Sick Leave</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--info);">${(bal.sick || 0).toFixed(1)}</div>
          <div style="font-size:0.68rem;color:var(--gray-400);">days remaining</div>
        </div>
        <div class="card" style="padding:16px;border-left:3px solid var(--warning);">
          <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);margin-bottom:4px;">Pending Leave</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--warning);">${pendingLeave}</div>
          <div style="font-size:0.68rem;color:var(--gray-400);">awaiting approval</div>
        </div>
      </div>

      <div class="grid-2" style="gap:16px;">
        <!-- My Details Quick View -->
        <div class="card">
          <div class="card-header">
            <h4 class="card-title"><i class="fas fa-id-badge text-primary"></i> Quick Info</h4>
            <button class="btn btn-xs btn-outline" onclick="EmployeePortal.switchTab('profile')">Edit</button>
          </div>
          <div class="card-body" style="padding:0;">
            ${[
        ['Employee ID', emp.employeeNumber || emp.id || '—'],
        ['Position', emp.position || '—'],
        ['Department', emp.department || '—'],
        ['Start Date', emp.startDate || '—'],
        ['Email', emp.email || emp.personalEmail || '—'],
        ['Phone', emp.phone || emp.mobile || '—']
      ].map(([l, v]) => `
              <div style="display:flex;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--gray-100);font-size:0.82rem;">
                <span style="color:var(--gray-500);">${l}</span>
                <span style="font-weight:500;color:var(--gray-800);">${v}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Recent Leave Requests -->
        <div class="card">
          <div class="card-header">
            <h4 class="card-title"><i class="fas fa-calendar-check text-success"></i> Recent Leave</h4>
            <button class="btn btn-xs btn-primary" onclick="EmployeePortal.applyLeave()">
              <i class="fas fa-plus"></i> Apply
            </button>
          </div>
          <div class="card-body" style="padding:0;">
            ${leaveRequests.slice(0, 5).map(r => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--gray-100);">
                <div>
                  <div style="font-size:0.82rem;font-weight:600;">${r.type || r.leaveType || 'Leave'}</div>
                  <div style="font-size:0.7rem;color:var(--gray-500);">${r.startDate} → ${r.endDate}</div>
                </div>
                <span class="badge badge-${r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'danger' : 'warning'}">${r.status}</span>
              </div>
            `).join('') || '<div style="padding:24px;text-align:center;color:var(--gray-400);font-size:0.85rem;">No leave requests yet</div>'}
          </div>
        </div>
      </div>
    `;
  },

  // ── Payslips Tab ─────────────────────────────────────────
  renderPayslips: function (payslips, emp) {
    return `
      <div class="card">
        <div class="card-header">
          <h4 class="card-title"><i class="fas fa-file-invoice-dollar text-primary"></i> My Payslips</h4>
          <div style="font-size:0.78rem;color:var(--gray-500);">${payslips.length} total</div>
        </div>
        <div class="card-body" style="padding:0;">
          ${payslips.length ? `
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th class="text-right">Gross</th>
                  <th class="text-right">PAYE</th>
                  <th class="text-right">UIF</th>
                  <th class="text-right">Net Pay</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${payslips.map(p => `
                  <tr>
                    <td>
                      <div style="font-weight:500;">${p.period || '—'}</div>
                      <div style="font-size:0.7rem;color:var(--gray-500);">${p.companyName || ''}</div>
                    </td>
                    <td class="text-right">${window.formatCurrency(p.gross || 0)}</td>
                    <td class="text-right text-danger">${window.formatCurrency(p.paye || 0)}</td>
                    <td class="text-right">${window.formatCurrency(p.uif || 0)}</td>
                    <td class="text-right" style="font-weight:700;color:var(--success);">${window.formatCurrency(p.net || 0)}</td>
                    <td>
                      <button class="btn btn-xs btn-outline" onclick="EmployeePortal.viewPayslip('${p.runId}', ${emp.id})" title="View">
                        <i class="fas fa-eye"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : `
          <div style="padding:40px;text-align:center;color:var(--gray-400);">
            <i class="fas fa-file-invoice" style="font-size:2rem;margin-bottom:12px;display:block;"></i>
            No payslips available yet
          </div>`}
        </div>
      </div>
    `;
  },

  viewPayslip: function (runId, empId) {
    if (typeof Payslips !== 'undefined' && Payslips.renderPayslipModal) {
      Payslips.renderPayslipModal(runId, empId);
    } else {
      window.Toast.show('Payslip viewer not available', 'warning');
    }
  },

  // ── Leave Tab ────────────────────────────────────────────
  renderLeave: function (leaveRequests, bal, emp) {
    return `
      <!-- Leave Balances -->
      <div class="grid-3" style="gap:12px;margin-bottom:16px;">
        ${[
        ['Annual Leave', bal.annual || 0, 15, 'success', 'Days per year (SA BCEA)'],
        ['Sick Leave', bal.sick || 0, 30, 'info', 'Per 3-year cycle'],
        ['Family Responsibility', bal.family || 0, 3, 'warning', 'Days per year']
      ].map(([label, val, max, color, desc]) => `
          <div class="card" style="padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-size:0.78rem;font-weight:700;color:var(--gray-700);">${label}</div>
              <span class="badge badge-${color}">${val.toFixed(1)} / ${max}</span>
            </div>
            <div style="height:6px;background:var(--gray-100);border-radius:99px;overflow:hidden;margin-bottom:6px;">
              <div style="height:100%;width:${Math.min(100, (val / max) * 100)}%;background:var(--${color});border-radius:99px;transition:width 0.5s;"></div>
            </div>
            <div style="font-size:0.68rem;color:var(--gray-400);">${desc}</div>
          </div>
        `).join('')}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h4 style="margin:0;font-size:0.95rem;">Leave History</h4>
        <button class="btn btn-primary btn-sm" onclick="EmployeePortal.applyLeave()">
          <i class="fas fa-plus"></i> Apply for Leave
        </button>
      </div>

      <div class="card">
        <div class="card-body" style="padding:0;">
          ${leaveRequests.length ? `
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Date Applied</th>
                </tr>
              </thead>
              <tbody>
                ${leaveRequests.map(r => {
        const days = r.days || (r.startDate && r.endDate ? Math.ceil((new Date(r.endDate) - new Date(r.startDate)) / 86400000) + 1 : '—');
        return `
                    <tr>
                      <td style="font-weight:500;">${r.type || r.leaveType || 'Leave'}</td>
                      <td>${r.startDate || '—'}</td>
                      <td>${r.endDate || '—'}</td>
                      <td>${days}</td>
                      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.reason || '—'}</td>
                      <td><span class="badge badge-${r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'danger' : 'warning'}">${r.status}</span></td>
                      <td style="font-size:0.78rem;color:var(--gray-500);">${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>`;
      }).join('')}
              </tbody>
            </table>
          </div>` : `
          <div style="padding:40px;text-align:center;color:var(--gray-400);">
            <i class="fas fa-umbrella-beach" style="font-size:2rem;margin-bottom:12px;display:block;"></i>
            No leave requests yet. Click "Apply for Leave" to get started.
          </div>`}
        </div>
      </div>
    `;
  },

  // ── Profile / My Details Tab ─────────────────────────────
  renderProfile: function (emp) {
    return `
      <div class="grid-2" style="gap:16px;">
        <div class="card">
          <div class="card-header"><h4 class="card-title"><i class="fas fa-user text-primary"></i> Personal Information</h4></div>
          <div class="card-body">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">First Name</label>
                <input class="form-control" id="portal_firstName" value="${emp.firstName || ''}" readonly style="background:var(--gray-50);">
              </div>
              <div class="form-group">
                <label class="form-label">Last Name</label>
                <input class="form-control" id="portal_lastName" value="${emp.lastName || ''}" readonly style="background:var(--gray-50);">
              </div>
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">ID Number</label>
                <input class="form-control" value="${emp.idNumber || '—'}" readonly style="background:var(--gray-50);">
              </div>
              <div class="form-group">
                <label class="form-label">Date of Birth</label>
                <input class="form-control" value="${emp.dateOfBirth || '—'}" readonly style="background:var(--gray-50);">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Position</label>
              <input class="form-control" value="${emp.position || '—'}" readonly style="background:var(--gray-50);">
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h4 class="card-title"><i class="fas fa-address-book text-success"></i> Contact Details</h4></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Personal Email</label>
              <input class="form-control" id="portal_email" value="${emp.personalEmail || emp.email || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input class="form-control" id="portal_phone" value="${emp.phone || emp.mobile || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Address</label>
              <textarea class="form-control" id="portal_address" rows="2">${emp.address || emp.physicalAddress || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Emergency Contact</label>
              <input class="form-control" id="portal_emergency" value="${emp.emergencyContact || ''}" placeholder="Name — Phone">
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="EmployeePortal.saveContactDetails(${emp.id})">
              <i class="fas fa-save"></i> Save Contact Details
            </button>
          </div>
        </div>
      </div>
    `;
  },

  saveContactDetails: function (empId) {
    const emp = (window.DB.employees || []).find(e => e.id === empId || e.id == empId);
    if (!emp) { window.Toast.show('Employee not found', 'danger'); return; }

    emp.personalEmail = document.getElementById('portal_email')?.value?.trim() || emp.personalEmail;
    emp.phone = document.getElementById('portal_phone')?.value?.trim() || emp.phone;
    emp.address = document.getElementById('portal_address')?.value?.trim() || emp.address;
    emp.physicalAddress = emp.address;
    emp.emergencyContact = document.getElementById('portal_emergency')?.value?.trim() || emp.emergencyContact;

    window.DB.save();
    window.Toast.show('Contact details updated successfully!', 'success');
  },

  // ── Documents Tab ────────────────────────────────────────
  renderDocuments: function (myDocs, emp) {
    return `
      <div class="card">
        <div class="card-header">
          <h4 class="card-title"><i class="fas fa-folder-open text-primary"></i> My Documents</h4>
          <div style="font-size:0.78rem;color:var(--gray-500);">${myDocs.length} documents</div>
        </div>
        <div class="card-body" style="padding:0;">
          ${myDocs.length ? `
          <div class="table-responsive">
            <table>
              <thead>
                <tr><th>Document</th><th>Category</th><th>Uploaded</th><th></th></tr>
              </thead>
              <tbody>
                ${myDocs.map(d => `
                  <tr>
                    <td>
                      <div style="font-weight:500;">${d.name}</div>
                      ${d.description ? '<div style="font-size:0.7rem;color:var(--gray-500);">' + d.description + '</div>' : ''}
                    </td>
                    <td><span class="badge badge-info">${d.category || 'Other'}</span></td>
                    <td style="font-size:0.78rem;color:var(--gray-500);">${d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '—'}</td>
                    <td>
                      ${d.dataUrl ? '<button class="btn btn-xs btn-outline" onclick="Documents.downloadDocument(\'' + d.id + '\')"><i class="fas fa-download"></i></button>' : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : `
          <div style="padding:40px;text-align:center;color:var(--gray-400);">
            <i class="fas fa-folder-open" style="font-size:2rem;margin-bottom:12px;display:block;"></i>
            No documents linked to your profile yet.
          </div>`}
        </div>
      </div>
    `;
  },

  // ── Leave Application Modal ──────────────────────────────
  applyLeave: function () {
    const user = window.currentUser;
    const emp = (window.DB.employees || []).find(e => e.id === user?.employeeId || e.id == user?.employee_id) || {};
    const bal = emp.leaveBalances || { annual: 15, sick: 30, family: 3 };

    const html = `
      <div class="card" style="width:100%;max-width:520px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-umbrella-beach"></i> Apply for Leave</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('leaveApplyModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            ${[
        ['Annual', bal.annual, 'success'],
        ['Sick', bal.sick, 'info'],
        ['Family', bal.family, 'warning']
      ].map(([l, v, c]) => `
              <div style="flex:1;text-align:center;padding:8px;background:var(--${c}-soft);border-radius:6px;">
                <div style="font-size:1rem;font-weight:800;color:var(--${c});">${(v || 0).toFixed(1)}</div>
                <div style="font-size:0.6rem;color:var(--${c});">${l}</div>
              </div>
            `).join('')}
          </div>
          <div class="form-group">
            <label class="form-label">Leave Type <span style="color:var(--danger);">*</span></label>
            <select class="form-control" id="leave_type">
              <option value="Annual Leave">Annual Leave (${bal.annual?.toFixed(1) || 0} days)</option>
              <option value="Sick Leave">Sick Leave (${bal.sick?.toFixed(1) || 0} days)</option>
              <option value="Family Responsibility">Family Responsibility (${bal.family?.toFixed(1) || 0} days)</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Paternity Leave">Paternity Leave</option>
              <option value="Study Leave">Study Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Start Date <span style="color:var(--danger);">*</span></label>
              <input type="date" class="form-control" id="leave_start">
            </div>
            <div class="form-group">
              <label class="form-label">End Date <span style="color:var(--danger);">*</span></label>
              <input type="date" class="form-control" id="leave_end">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Reason</label>
            <textarea class="form-control" id="leave_reason" rows="2" placeholder="Optional reason..."></textarea>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="EmployeePortal.submitLeave(${emp.id})">
            <i class="fas fa-paper-plane"></i> Submit Leave Request
          </button>
        </div>
      </div>
    `;
    window.showModal('leaveApplyModal', html);
  },

  submitLeave: function (empId) {
    const type = document.getElementById('leave_type')?.value;
    const start = document.getElementById('leave_start')?.value;
    const end = document.getElementById('leave_end')?.value;
    const reason = document.getElementById('leave_reason')?.value?.trim();

    if (!start || !end) { window.Toast.show('Please select start and end dates', 'warning'); return; }
    if (new Date(end) < new Date(start)) { window.Toast.show('End date must be after start date', 'warning'); return; }

    const days = Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
    const request = {
      id: Date.now(),
      employeeId: empId,
      type: type,
      leaveType: type,
      startDate: start,
      endDate: end,
      days: days,
      reason: reason,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    window.DB.leaveRequests = window.DB.leaveRequests || [];
    window.DB.leaveRequests.push(request);
    window.DB.save();
    window.Toast.show('Leave request submitted!', 'success');
    window.closeModal('leaveApplyModal');
    this.render(document.getElementById('content'));
  },

  // Keep backward compat
  viewLatestPayslip: function (runId, empId) {
    this.viewPayslip(runId, empId);
  }
};

window.renderEmployeePortal = function (container) {
  EmployeePortal.render(container);
};
window.EmployeePortal = EmployeePortal;
