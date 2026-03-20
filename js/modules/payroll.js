const Payroll = {
  state: {
    mode: 'view', currentPeriod: null, selectedCompany: null,
    activeRun: null, draftData: []
  },

  _periodOptions: function (selected) {
    const opts = [];
    const now = new Date();
    for (let i = 17; i >= -3; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      opts.push(`<option value="${label}" ${label === selected ? 'selected' : ''}>${label}</option>`);
    }
    return opts.join('');
  },

  init: function () {
    if (!this.state.currentPeriod) {
      this.state.currentPeriod = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    this.state.mode = 'view';
    this.state.activeRun = null;
    this.state.draftData = [];
  },

  render: function (container) {
    try {
      if (!this.state.currentPeriod) this.init();
      const companies = window.DB.companies || [];

      const companyOptions = `<option value="">— Select Company —</option>`
        + companies.map(c => `<option value="${c.id}" ${this.state.selectedCompany == c.id ? 'selected' : ''}>${c.name}</option>`).join('');

      container.innerHTML = `
        <!-- ── Pending Approvals Section ── -->
        ${this.renderPendingSection()}

        <!-- ── Page Header ── -->
        <div class="page-title-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <div>
            <h2>Payroll Processing</h2>
            <div style="color:var(--gray-500);">
              <span class="badge ${this._statusBadgeClass()}">${this.state.mode.replace('_', ' ').toUpperCase()}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            ${this.state.mode === 'view' ? `
              <button class="btn btn-primary" onclick="PayrollWizard.start()">
                <i class="fas fa-magic"></i> Run Payroll Wizard
              </button>` : `
              <button class="btn btn-outline" onclick="Payroll.discardDraft()">Discard</button>
              <button class="btn btn-primary" onclick="Payroll.sendForApproval()">
                <i class="fas fa-paper-plane"></i> Send for Approval
              </button>`}
          </div>
        </div>

        <!-- ── KPI Cards ── -->
        ${this.renderTotalsCards()}

        <!-- ── Pay Lines Table ── -->
        <div class="card">
          <div class="card-header">
            <h4 class="card-title">Employee Pay Lines</h4>
            <div class="search-box">
              <input type="text" class="search-input" placeholder="Search…" onkeyup="Payroll.filterRows(this.value)">
            </div>
          </div>
          <div class="table-responsive">
            <table id="payrollTable">
              <thead>
                <tr>
                  <th>Employee</th><th>Company</th>
                  <th class="text-right">Basic</th>
                  <th class="text-right">Gross</th>
                  <th class="text-right">PAYE</th>
                  <th class="text-right">UIF</th>
                  <th class="text-right">Deductions</th>
                  <th class="text-right">Net Pay</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>${this.renderRows()}</tbody>
            </table>
          </div>
        </div>

        <!-- ── Run History ── -->
        ${this.renderRunHistory()}
      `;
    } catch (e) {
      console.error('Payroll render error:', e);
      container.innerHTML = `<div class="alert alert-danger">Error loading payroll: ${e.message}</div>`;
    }
  },

  // ── Pending Approvals Section ─────────────────────────────────────────────
  renderPendingSection: function () {
    const pending = (window.DB.payrollRuns || []).filter(r =>
      r.status === 'Pending Approval' || r.status === 'Approved'
    );
    if (!pending.length) return '';

    const rows = pending.map(r => {
      const isApproved = r.status === 'Approved';
      const date = r.approvalSentAt
        ? new Date(r.approvalSentAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
      const approvedDate = r.approvedAt
        ? new Date(r.approvedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${r.period}</div>
            <div style="font-size:0.77rem;color:var(--gray-500);">${r.company || '—'}</div>
          </td>
          <td>
            <span class="badge badge-${isApproved ? 'success' : 'warning'}" style="font-size:0.78rem;">
              <i class="fas fa-${isApproved ? 'check-circle' : 'clock'}"></i>
              &nbsp;${r.status}
            </span>
            ${approvedDate ? `<div style="font-size:0.72rem;color:var(--success);margin-top:3px;">Approved: ${approvedDate}</div>` : ''}
          </td>
          <td>${r.employeeCount || 0} employees</td>
          <td class="text-right">${window.formatCurrency(r.totalGross || 0)}</td>
          <td class="text-right" style="font-weight:700;color:var(--success);">${window.formatCurrency(r.totalNet || 0)}</td>
          <td>
            <div style="display:flex;gap:6px;align-items:center;">
              ${isApproved
          ? `<button class="btn btn-sm btn-primary" onclick="Payroll.generateBankFileForRun('${r.id}')">
                     <i class="fas fa-file-download"></i> Generate Bank File
                   </button>
                   <button class="btn btn-sm btn-outline" onclick="Payroll.markAsPaid('${r.id}')">
                     <i class="fas fa-check"></i> Mark Paid
                   </button>`
          : `<button class="btn btn-sm btn-outline" onclick="Payroll.syncAndCheckApproval('${r.id}')">
                     <i class="fas fa-sync"></i> Check Status
                   </button>
                   <button class="btn btn-sm btn-outline" onclick="Payroll.resendApprovalEmail('${r.id}')">
                     <i class="fas fa-envelope"></i> Resend Email
                   </button>`}
              <button class="btn-icon text-danger" title="Rollback" onclick="Payroll.rollbackSpecificRun('${r.id}')">
                <i class="fas fa-undo"></i>
              </button>
            </div>
          </td>
        </tr>`;
    });

    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--warning);">
        <div class="card-header">
          <h4 class="card-title">
            <i class="fas fa-hourglass-half" style="color:var(--warning);margin-right:6px;"></i>
            Payrolls Awaiting Action
            <span class="badge badge-warning" style="margin-left:8px;">${pending.length}</span>
          </h4>
          <button class="btn btn-outline btn-sm" onclick="Payroll.syncAndRefresh()">
            <i class="fas fa-sync"></i> Refresh Status
          </button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Period / Company</th>
                <th>Status</th>
                <th>Employees</th>
                <th class="text-right">Total Gross</th>
                <th class="text-right">Total Net</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows.join('')}</tbody>
          </table>
        </div>
      </div>`;
  },

  // ── Sync from server and refresh ─────────────────────────────────────────
  syncAndRefresh: async function () {
    window.Toast.show('Syncing from server…', 'info');
    try {
      const serverData = await StorageManager.serverLoad();
      if (serverData) {
        Object.keys(serverData).forEach(k => { if (serverData[k] !== undefined) window.DB[k] = serverData[k]; });
        window.Toast.show('Status updated', 'success');
      }
    } catch (_) { }
    this.render(document.getElementById('content'));
  },

  // Check approval for a specific run
  syncAndCheckApproval: async function (runId) {
    await this.syncAndRefresh();
    const run = (window.DB.payrollRuns || []).find(r => r.id === runId);
    if (run?.status === 'Approved') {
      window.Toast.show(`Payroll approved! Generate the bank file now.`, 'success');
    } else {
      window.Toast.show('Still awaiting client approval.', 'info');
    }
  },

  // Generate bank file for a specific run
  generateBankFileForRun: function (runId) {
    const run = (window.DB.payrollRuns || []).find(r => r.id === runId);
    if (!run) { window.Toast.show('Run not found', 'warning'); return; }
    if (!['Approved', 'Finalized'].includes(run.status)) {
      window.Toast.show('Payroll must be Approved before generating the bank file.', 'warning'); return;
    }

    const slips = (window.DB.payslips || []).filter(p => p.runId === runId);
    const rows = ['Account Name,Account Number,Branch Code,Reference,Amount'];
    slips.forEach(s => {
      const emp = window.DB.employees.find(e => e.id === (s.employeeId || s.id)) || {};
      rows.push([
        `"${s.employeeName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()}"`,
        emp.accountNumber || s.accountNumber || '',
        emp.branchCode || s.branchCode || '',
        `"SALARY ${run.period}"`,
        (s.net || 0).toFixed(2)
      ].join(','));
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BankFile_${(run.company || '').replace(/\s+/g, '_')}_${(run.period || '').replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    window.Toast.show('Bank payment file downloaded', 'success');

    // Audit log
    window.DB.auditLogs = window.DB.auditLogs || [];
    window.DB.auditLogs.unshift({
      id: Date.now(), timestamp: new Date().toLocaleString(),
      user: window.currentUser?.name || 'System',
      action: 'Bank File Generated', module: 'Payroll',
      details: { runId, company: run.company, period: run.period }
    });
    window.DB.save();
  },

  // Mark run as Paid
  markAsPaid: function (runId) {
    window.showConfirmation('Mark as Paid?', 'Confirm that the bank payment file has been submitted and payments are being processed.', () => {
      const run = (window.DB.payrollRuns || []).find(r => r.id === runId);
      if (run) {
        run.status = 'Paid';
        run.paidAt = new Date().toISOString();
        run.paidBy = window.currentUser?.name || 'System';
        window.DB.save();
        window.Toast.show('Payroll marked as Paid', 'success');
        this.render(document.getElementById('content'));
      }
    });
  },

  // Resend approval email for a pending run
  resendApprovalEmail: async function (runId) {
    const run = (window.DB.payrollRuns || []).find(r => r.id === runId);
    const company = run ? window.DB.companies.find(c => c.id == run.companyId) : null;
    if (!run || !company?.email) {
      window.Toast.show('Cannot resend — company email not found', 'warning'); return;
    }

    const slips = (window.DB.payslips || []).filter(p => p.runId === runId);
    const approvalUrl = `${window.location.protocol}//${window.location.host}/api/approve.php?token=${run.approvalToken}&run_id=${encodeURIComponent(runId)}`;

    window.Toast.show('Resending approval email…', 'info');
    try {
      const res = await fetch('api/mail.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyEmail: company.email,
          companyName: company.name,
          period: run.period,
          totalNet: window.formatCurrency(run.totalNet || 0),
          totalGross: window.formatCurrency(run.totalGross || 0),
          totalPAYE: window.formatCurrency(run.totalPAYE || 0),
          employees: slips,
          runId,
          approvalToken: run.approvalToken,
          approvalUrl
        })
      });
      const result = await res.json().catch(() => ({}));
      if (result.status === 'success') window.Toast.show('Approval email resent', 'success');
      else throw new Error(result.error || 'Send failed');
    } catch (err) {
      window.Toast.show('Resend failed: ' + err.message, 'warning');
    }
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  changePeriod: function (period) {
    this.state.currentPeriod = period;
    this.state.mode = 'view';
    this.state.activeRun = null;
    this.state.draftData = [];
    if (this.state.selectedCompany) {
      const run = (window.DB.payrollRuns || []).find(r =>
        r.period === period && r.companyId == this.state.selectedCompany &&
        ['Finalized', 'Paid'].includes(r.status)
      );
      if (run) { this.state.mode = 'finalized'; this.state.activeRun = run; }
    }
    this.render(document.getElementById('content'));
  },

  selectCompany: function (val) {
    this.state.selectedCompany = val;
    const run = (window.DB.payrollRuns || []).find(r =>
      r.period === this.state.currentPeriod &&
      r.companyId == val &&
      ['Finalized', 'Paid'].includes(r.status)
    );
    if (run) { this.state.mode = 'finalized'; this.state.activeRun = run; this.state.draftData = (window.DB.payslips || []).filter(p => p.runId === run.id); }
    else { this.state.mode = 'view'; this.state.activeRun = null; this.state.draftData = []; }
    this.render(document.getElementById('content'));
  },

  _statusBadgeClass: function () {
    return { view: 'badge-gray', draft: 'badge-warning', finalized: 'badge-success' }[this.state.mode] || 'badge-gray';
  },

  renderTotalsCards: function () {
    if (this.state.mode === 'view') return '';
    const data = this.state.draftData;
    if (!data.length) return '';
    const tot = data.reduce((a, r) => ({
      gross: a.gross + (r.gross || 0), paye: a.paye + (r.paye || 0), net: a.net + (r.net || 0)
    }), { gross: 0, paye: 0, net: 0 });

    return `<div class="grid-4" style="margin-bottom:24px;">
      ${[
        { label: 'Total Gross', value: window.formatCurrency(tot.gross), accent: '#4F46E5' },
        { label: 'Total PAYE', value: window.formatCurrency(tot.paye), accent: '#DC2626' },
        { label: 'Total Net Pay', value: window.formatCurrency(tot.net), accent: '#059669' },
        { label: 'Employees', value: data.length, accent: '#0284C7' },
      ].map(c => `
        <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;
                    padding:20px;border-left:4px solid ${c.accent};box-shadow:var(--shadow-sm);">
          <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;
                      color:var(--gray-500);margin-bottom:8px;">${c.label}</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--gray-900);">${c.value}</div>
        </div>`).join('')}
    </div>`;
  },

  renderRows: function () {
    if (this.state.mode === 'view') {
      return `<tr><td colspan="9" class="text-center" style="padding:32px;color:var(--gray-500);">
        Select a company and use the Payroll Wizard to process a payroll run.
      </td></tr>`;
    }
    return this.state.draftData.map(row => `
      <tr>
        <td><div style="font-weight:500;">${row.employeeName}</div></td>
        <td><span class="badge badge-info" style="font-size:0.7rem;">${row.companyName || '—'}</span></td>
        <td class="text-right">${window.formatCurrency(row.basic || 0)}</td>
        <td class="text-right" style="font-weight:600;">${window.formatCurrency(row.gross || 0)}</td>
        <td class="text-right text-danger">${window.formatCurrency(row.paye || 0)}</td>
        <td class="text-right text-danger">${window.formatCurrency(row.uif || 0)}</td>
        <td class="text-right text-danger">${window.formatCurrency((row.pension || 0) + (row.medical || 0) + (row.otherDeductions || 0))}</td>
        <td class="text-right text-success" style="font-weight:700;">${window.formatCurrency(row.net || 0)}</td>
        <td>
          <button class="btn-icon-sm" onclick="Payslips.renderPayslipModal('${this.state.activeRun?.id}', ${row.employeeId || row.id})">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>`).join('');
  },

  renderRunHistory: function () {
    const compId = this.state.selectedCompany;
    const runs = (window.DB.payrollRuns || []).filter(r =>
      !compId || r.companyId == compId
    );
    if (!runs.length) return '';

    const statusConfig = {
      'Pending Approval': { cls: 'warning', icon: 'clock' },
      'Approved': { cls: 'success', icon: 'check-circle' },
      'Finalized': { cls: 'success', icon: 'check-double' },
      'Paid': { cls: 'teal', icon: 'money-bill-wave' },
      'Draft': { cls: 'gray', icon: 'edit' },
    };

    return `
      <div class="card" style="margin-top:24px;">
        <div class="card-header">
          <h4 class="card-title">All Payroll Runs</h4>
          <button class="btn btn-outline btn-sm" onclick="Payroll.syncAndRefresh()">
            <i class="fas fa-sync"></i> Refresh
          </button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Period</th><th>Company</th><th>Employees</th>
                <th class="text-right">Gross</th>
                <th class="text-right">Net</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${runs.map(r => {
      const cfg = statusConfig[r.status] || { cls: 'gray', icon: 'circle' };
      const canBankFile = ['Approved', 'Finalized'].includes(r.status);
      return `
                  <tr>
                    <td style="font-weight:600;">${r.period}</td>
                    <td>${r.company || '—'}</td>
                    <td>${r.employeeCount || r.count || 0}</td>
                    <td class="text-right">${window.formatCurrency(r.totalGross || 0)}</td>
                    <td class="text-right" style="font-weight:700;color:var(--success);">${window.formatCurrency(r.totalNet || r.net || 0)}</td>
                    <td>
                      <span class="badge badge-${cfg.cls}">
                        <i class="fas fa-${cfg.icon}"></i> &nbsp;${r.status}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex;gap:4px;">
                        ${canBankFile
          ? `<button class="btn btn-sm btn-primary" style="padding:3px 10px;font-size:0.75rem;"
                               onclick="Payroll.generateBankFileForRun('${r.id}')">
                               <i class="fas fa-file-download"></i> Bank File
                             </button>`
          : r.status === 'Pending Approval'
            ? `<button class="btn btn-sm btn-outline" style="padding:3px 10px;font-size:0.75rem;"
                               onclick="Payroll.syncAndCheckApproval('${r.id}')">
                               <i class="fas fa-sync"></i> Check
                             </button>`
            : ''}
                        <button class="btn btn-sm btn-outline" style="padding:3px 10px;font-size:0.75rem;color:var(--danger);border-color:rgba(220,38,38,0.3);"
                          onclick="Payroll.rollbackSpecificRun('${r.id}')">
                          <i class="fas fa-undo"></i>
                        </button>
                      </div>
                    </td>
                  </tr>`;
    }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  rollbackSpecificRun: function (runId) {
    const run = (window.DB.payrollRuns || []).find(r => r.id === runId);
    const label = run ? `${run.period} — ${run.company || ''}` : runId;
    window.showConfirmation('Rollback Payroll?',
      `Permanently delete payroll run for <strong>${label}</strong> and all its payslips?`,
      () => {
        window.DB.payrollRuns = (window.DB.payrollRuns || []).filter(r => r.id !== runId);
        window.DB.payslips = (window.DB.payslips || []).filter(p => p.runId !== runId);
        window.DB.save();
        window.Toast.show('Payroll rolled back', 'warning');
        this.render(document.getElementById('content'));
      });
  },

  filterRows: function (term) {
    document.querySelectorAll('#payrollTable tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  },

  discardDraft: function () {
    window.showConfirmation('Discard Draft?', 'All unsaved calculations will be lost.', () => {
      this.state.mode = 'view';
      this.state.activeRun = null;
      this.state.draftData = [];
      this.render(document.getElementById('content'));
    });
  }
};

window.renderPayroll = function (container) {
  Payroll.render(container);
};