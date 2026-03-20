const Payroll = {
  state: {
    mode: 'view',
    currentPeriod: null,
    selectedCompany: null,
    activeRun: null,
    draftData: []
  },

  // ─── Generate period dropdown options (18 months back, 3 forward) ──────────
  generatePeriodOptions: function (selected) {
    const options = [];
    const now = new Date();
    for (let i = 17; i >= -3; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push(`<option value="${label}" ${label === selected ? 'selected' : ''}>${label}</option>`);
    }
    return options.join('');
  },

  init: function () {
    if (!this.state.currentPeriod) {
      // Default to current month
      this.state.currentPeriod = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    this.state.mode = 'view';
    this.state.activeRun = null;
    this.state.draftData = [];
  },

  changePeriod: function (period) {
    this.state.currentPeriod = period;
    this.state.mode = 'view';
    this.state.activeRun = null;
    this.state.draftData = [];

    // Auto-detect if a finalized run exists for this period + company
    if (this.state.selectedCompany) {
      const existingRun = (window.DB.payrollRuns || []).find(r =>
        r.period === period &&
        r.companyId == this.state.selectedCompany &&
        r.status === 'Finalized'
      );
      if (existingRun) {
        this.state.mode = 'finalized';
        this.state.activeRun = existingRun;
        this.state.draftData = (window.DB.payslips || []).filter(p => p.runId === existingRun.id);
      }
    }
    this.render(document.getElementById('content'));
  },

  render: function (container) {
    try {
      if (!this.state.currentPeriod) this.init();
      if (!window.DB) {
        container.innerHTML = '<div class="alert alert-danger">Database not loaded. Refresh page.</div>';
        return;
      }

      const companies = window.DB.companies || [];
      const companyOptions = `<option value="">-- Select Company --</option>` +
        companies.map(c => `<option value="${c.id}" ${this.state.selectedCompany == c.id ? 'selected' : ''}>${c.name}</option>`).join('');

      let actionsHtml = '';
      if (this.state.mode === 'view') {
        actionsHtml = `
          <button class="btn btn-primary" onclick="PayrollWizard.start()" ${!this.state.selectedCompany ? 'disabled' : ''}>
            <i class="fas fa-magic"></i> Run Payroll Wizard
          </button>
          <button class="btn btn-outline" onclick="Payroll.startDraft()" ${!this.state.selectedCompany ? 'disabled' : ''}>
            <i class="fas fa-play"></i> Quick Draft
          </button>`;
      } else if (this.state.mode === 'draft') {
        actionsHtml = `
          <button class="btn btn-outline" onclick="Payroll.discardDraft()">Discard</button>
          <button class="btn btn-primary" onclick="Payroll.finalizeRun()">
            <i class="fas fa-check-double"></i> Finalize Payroll
          </button>`;
      } else if (this.state.mode === 'finalized') {
        actionsHtml = `
          <button class="btn btn-danger btn-sm" onclick="Payroll.rollbackRun()" style="border-radius:var(--radius-full);">
            <i class="fas fa-undo"></i> Rollback
          </button>
          <button class="btn btn-outline" onclick="Payroll.exportEFT()"><i class="fas fa-file-export"></i> EFT</button>
          <button class="btn btn-primary" onclick="Payroll.nextPeriod()">Next Month <i class="fas fa-arrow-right"></i></button>`;
      }

      const html = `
        <div class="page-title-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <div>
            <h2>Payroll Processing</h2>
            <div style="color:var(--gray-500);">
              <span class="badge ${this.getStatusBadgeClass()}">${this.state.mode.toUpperCase()}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">

            <!-- ── Period Dropdown ── -->
            <div class="form-group" style="margin-bottom:0;">
              <select class="form-control" style="padding:6px 10px;font-size:0.8rem;width:190px;"
                onchange="Payroll.changePeriod(this.value)" ${this.state.mode !== 'view' ? 'disabled' : ''}>
                ${this.generatePeriodOptions(this.state.currentPeriod)}
              </select>
            </div>

            <!-- ── Company Dropdown ── -->
            <div class="form-group" style="margin-bottom:0;">
              <select class="form-control" style="padding:6px 10px;font-size:0.8rem;width:200px;"
                onchange="Payroll.selectCompany(this.value)" ${this.state.mode !== 'view' ? 'disabled' : ''}>
                ${companyOptions}
              </select>
            </div>

            ${actionsHtml}
          </div>
        </div>

        ${this.renderTotalsCards()}

        <div class="card">
          <div class="card-header">
            <h4 class="card-title">Employee Pay Lines</h4>
            <div class="search-box">
              <input type="text" class="search-input" placeholder="Search..." onkeyup="Payroll.filterRows(this.value)">
            </div>
          </div>
          <div class="table-responsive">
            <table id="payrollTable">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Company</th>
                  <th class="text-right">Basic</th>
                  <th class="text-right">Allowances</th>
                  <th class="text-right">Gross</th>
                  <th class="text-right">PAYE</th>
                  <th class="text-right">UIF</th>
                  <th class="text-right">Deductions</th>
                  <th class="text-right">Net Pay</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${this.renderRows()}
              </tbody>
            </table>
          </div>
        </div>

        ${this.renderRunHistory()}
      `;
      container.innerHTML = html;
    } catch (e) {
      console.error('Payroll Render Error:', e);
      container.innerHTML = `<div class="alert alert-danger">Error rendering payroll: ${e.message}</div>`;
    }
  },

  // ─── Run History — allows rollback of any finalized run ───────────────────
  renderRunHistory: function () {
    if (!this.state.selectedCompany) return '';
    const runs = (window.DB.payrollRuns || []).filter(r => r.companyId == this.state.selectedCompany);
    if (!runs.length) return '';

    return `
      <div class="card" style="margin-top:24px;">
        <div class="card-header">
          <h4 class="card-title">Payroll Run History</h4>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Date Finalized</th>
                <th class="text-right">Total Gross</th>
                <th class="text-right">Total Net</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${runs.map(r => `
                <tr>
                  <td style="font-weight:600">${r.period}</td>
                  <td style="font-size:0.82rem;color:var(--gray-500)">${r.date ? new Date(r.date).toLocaleDateString('en-ZA') : '—'}</td>
                  <td class="text-right">${window.formatCurrency(r.totalGross || 0)}</td>
                  <td class="text-right" style="font-weight:700;color:var(--success)">${window.formatCurrency(r.totalNet || 0)}</td>
                  <td><span class="badge badge-${r.status === 'Finalized' ? 'success' : 'warning'}">${r.status}</span></td>
                  <td>
                    <div style="display:flex;gap:4px;">
                      <button class="btn-icon" title="View Period" onclick="Payroll.changePeriod('${r.period}')">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button class="btn btn-sm btn-danger" style="padding:3px 10px;font-size:0.75rem;"
                        title="Rollback this run — available anytime"
                        onclick="Payroll.rollbackSpecificRun('${r.id}')">
                        <i class="fas fa-undo"></i> Rollback
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  selectCompany: function (val) {
    this.state.selectedCompany = val;
    const existingRun = (window.DB.payrollRuns || []).find(r =>
      r.period === this.state.currentPeriod &&
      r.companyId == val &&
      r.status === 'Finalized'
    );
    if (existingRun) {
      this.state.mode = 'finalized';
      this.state.activeRun = existingRun;
      this.state.draftData = (window.DB.payslips || []).filter(p => p.runId === existingRun.id);
    } else {
      this.state.mode = 'view';
      this.state.activeRun = null;
      this.state.draftData = [];
    }
    this.render(document.getElementById('content'));
  },

  getStatusBadgeClass: function () {
    switch (this.state.mode) {
      case 'view': return 'badge-gray';
      case 'draft': return 'badge-warning';
      case 'finalized': return 'badge-success';
      default: return 'badge-gray';
    }
  },

  // ─── KPI Cards — clean white, no purple backgrounds ────────────────────────
  renderTotalsCards: function () {
    if (this.state.mode === 'view') return '';
    const totals = this.calculateTotals();

    const cards = [
      { label: 'Total Gross', value: window.formatCurrency(totals.gross), icon: 'fa-coins', accent: '#4F46E5' },
      { label: 'Total PAYE', value: window.formatCurrency(totals.paye), icon: 'fa-hand-holding-usd', accent: '#DC2626' },
      { label: 'Total Net Pay', value: window.formatCurrency(totals.net), icon: 'fa-wallet', accent: '#059669' },
      { label: 'Employees', value: this.state.draftData.length, icon: 'fa-users', accent: '#0284C7' },
    ];

    return `
      <div class="grid-4" style="margin-bottom:24px;">
        ${cards.map(c => `
          <div style="background:#fff;border:1px solid var(--gray-200);border-radius:12px;
                      padding:20px 20px 16px;border-left:4px solid ${c.accent};
                      box-shadow:var(--shadow-sm);transition:var(--transition);"
            onmouseenter="this.style.boxShadow='var(--shadow-md)'"
            onmouseleave="this.style.boxShadow='var(--shadow-sm)'">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--gray-500);margin-bottom:8px;">
                  ${c.label}
                </div>
                <div style="font-size:1.55rem;font-weight:800;color:var(--gray-900);letter-spacing:-0.5px;line-height:1;">
                  ${c.value}
                </div>
              </div>
              <div style="width:38px;height:38px;border-radius:10px;background:${c.accent}18;
                          display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fas ${c.icon}" style="color:${c.accent};font-size:1rem;"></i>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
  },

  startDraft: function () {
    if (!this.state.selectedCompany) {
      window.Toast.show("Please select a company first", "warning");
      return;
    }
    this.state.mode = 'draft';
    this.calculateDraft();
    this.render(document.getElementById('content'));
    const compName = window.DB.companies.find(c => c.id == this.state.selectedCompany)?.name;
    window.Toast.show(`Draft Payroll for ${compName} — ${this.state.currentPeriod}`, "info");
  },

  discardDraft: function () {
    window.showConfirmation("Discard Draft?", "Discard this payroll draft? All calculations will be lost.", () => {
      this.state.mode = 'view';
      this.state.activeRun = null;
      this.state.draftData = [];
      this.render(document.getElementById('content'));
      window.Toast.show("Draft discarded", "info");
    });
  },

  calculateDraft: function () {
    const selectedCompObj = window.DB.companies.find(c => c.id == this.state.selectedCompany);
    const employees = window.DB.employees.filter(e => {
      if (e.status !== 'Active') return false;
      if (e.companyId && e.companyId == this.state.selectedCompany) return true;
      if (e.companyName && selectedCompObj && e.companyName === selectedCompObj.name) return true;
      if (!e.companyName && this.state.selectedCompany == 1) return true;
      return false;
    });

    this.state.draftData = employees.map(emp => {
      const age = (emp.dateOfBirth && window.TaxCalc) ? window.TaxCalc.calculateAge(emp.dateOfBirth) : 30;
      const basic = emp.basicSalary || 0;
      let totalBenefits = 0, totalDeductions = 0, companyContrib = 0;

      if (emp.benefits?.custom) {
        emp.benefits.custom.forEach(ben => {
          let val = 0;
          if (ben.calc === 'Fixed') val = parseFloat(ben.value);
          else if (ben.calc === 'Percentage') val = basic * (parseFloat(ben.value) / 100);
          if (ben.type === 'Allowance') totalBenefits += val;
          else if (ben.type === 'Deduction') totalDeductions += val;
          else if (ben.type === 'CompanyContribution') companyContrib += val;
        });
      }

      const gross = basic + totalBenefits;
      const medContrib = emp.benefits?.medicalContribution || 0;
      const pensionContrib = (basic * (emp.benefits?.pensionPercent || 0)) / 100;
      const rfi = basic + (totalBenefits * 0.5);
      const allowablePension = window.TaxCalc.calculateRetirementTaxDeduction(rfi, pensionContrib);
      const taxableIncome = gross - allowablePension;
      const medicalMembers = emp.benefits?.medicalMembers || 0;
      const paye = window.TaxCalc.calculatePAYE(taxableIncome, age, medicalMembers);
      const uif  = window.TaxCalc.calculateUIF(gross);
      const sdl  = window.TaxCalc.calculateSDL(gross);
      const totalEmployeeDeductions = paye + uif + pensionContrib + medContrib + totalDeductions;
      const net = gross - totalEmployeeDeductions;

      return {
        id: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        companyName: emp.companyName,
        basic, allowances: totalBenefits, gross, paye, uif,
        pension: pensionContrib, medical: medContrib,
        otherDeductions: totalDeductions, net, sdl, companyContrib,
        customBenefits: emp.benefits?.custom || []
      };
    });
  },

  calculateTotals: function () {
    return this.state.draftData.reduce((acc, row) => ({
      gross: acc.gross + (row.gross || 0),
      paye:  acc.paye  + (row.paye  || 0),
      net:   acc.net   + (row.net   || 0),
      sdl:   acc.sdl   + (row.sdl   || 0)
    }), { gross: 0, paye: 0, net: 0, sdl: 0 });
  },

  renderRows: function () {
    if (this.state.mode === 'view') {
      return '<tr><td colspan="10" class="text-center" style="padding:24px;color:var(--gray-500)">Select a company and period, then start a draft.</td></tr>';
    }
    return this.state.draftData.map(row => `
      <tr>
        <td><div style="font-weight:500">${row.employeeName}</div></td>
        <td><span class="badge badge-info" style="font-size:0.7rem;">${row.companyName || '—'}</span></td>
        <td class="text-right">${window.formatCurrency(row.basic)}</td>
        <td class="text-right">${window.formatCurrency(row.allowances)}</td>
        <td class="text-right" style="font-weight:600">${window.formatCurrency(row.gross)}</td>
        <td class="text-right text-danger">${window.formatCurrency(row.paye)}</td>
        <td class="text-right text-danger">${window.formatCurrency(row.uif)}</td>
        <td class="text-right text-danger">${window.formatCurrency(row.pension + row.medical + row.otherDeductions)}</td>
        <td class="text-right text-success" style="font-weight:700">${window.formatCurrency(row.net)}</td>
        <td>
          <button class="btn-icon-sm" onclick="Payroll.viewPayslip(${row.id})"><i class="fas fa-eye"></i></button>
        </td>
      </tr>
    `).join('');
  },

  finalizeRun: function () {
    const totals = this.calculateTotals();
    const count  = this.state.draftData.length;
    const prevPeriodDate = new Date(Date.parse("01 " + this.state.currentPeriod));
    prevPeriodDate.setMonth(prevPeriodDate.getMonth() - 1);
    const prevPeriod = prevPeriodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const prevRun = (window.DB.payrollRuns || []).find(r =>
      r.period === prevPeriod && r.companyId == this.state.selectedCompany && r.status === 'Finalized'
    );
    const varNet = prevRun ? totals.net - prevRun.net : 0;
    const varPct = prevRun ? ((varNet / prevRun.net) * 100).toFixed(1) : 0;

    const html = `
      <div class="card" style="width:100%;max-width:600px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-clipboard-check"></i> Reconciliation — ${this.state.currentPeriod}</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('reconModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="alert alert-info">
            <strong>${count} employees</strong> | Period: ${this.state.currentPeriod}
          </div>
          <table style="width:100%;margin-bottom:20px;font-size:0.85rem;">
            <tr style="background:var(--gray-50);"><th style="padding:8px">Metric</th><th class="text-right" style="padding:8px">Current</th><th class="text-right" style="padding:8px">Previous</th><th class="text-right" style="padding:8px">Variance</th></tr>
            <tr><td style="padding:8px">Gross Pay</td><td class="text-right" style="padding:8px">${window.formatCurrency(totals.gross)}</td><td class="text-right" style="padding:8px">${prevRun ? window.formatCurrency(prevRun.gross) : '—'}</td><td class="text-right" style="padding:8px">—</td></tr>
            <tr style="font-weight:700;border-top:2px solid var(--gray-200);">
              <td style="padding:8px">Net Pay (EFT)</td>
              <td class="text-right text-success" style="padding:8px">${window.formatCurrency(totals.net)}</td>
              <td class="text-right" style="padding:8px">${prevRun ? window.formatCurrency(prevRun.net) : '—'}</td>
              <td class="text-right ${Math.abs(varPct) > 10 ? 'text-danger' : ''}" style="padding:8px">
                ${prevRun ? `${window.formatCurrency(varNet)} (${varPct}%)` : '—'}
              </td>
            </tr>
          </table>
          ${Math.abs(varPct) > 10 ? `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Net Pay variance exceeds 10%. Please review before finalizing.</div>` : ''}
          <div style="display:flex;gap:10px;margin-top:16px;">
            <button class="btn btn-outline" style="flex:1" onclick="closeModal('reconModal')">Review</button>
            <button class="btn btn-primary" style="flex:1" onclick="Payroll.processFinalization()">Confirm & Process</button>
          </div>
        </div>
      </div>`;
    window.showModal('reconModal', html);
  },

  processFinalization: function () {
    window.closeModal('reconModal');
    const totals = this.calculateTotals();
    const newRun = {
      id: `RUN_${Date.now()}`,
      companyId: this.state.selectedCompany,
      company: window.DB.companies.find(c => c.id == this.state.selectedCompany)?.name || '',
      period: this.state.currentPeriod,
      status: 'Finalized',
      date: new Date().toISOString(),
      totalGross: totals.gross, totalNet: totals.net,
      totalPAYE: totals.paye, totalSDL: totals.sdl,
      count: this.state.draftData.length,
      gross: totals.gross, net: totals.net
    };
    window.DB.payrollRuns = window.DB.payrollRuns || [];
    window.DB.payrollRuns.push(newRun);
    window.DB.payslips = window.DB.payslips || [];
    this.state.draftData.forEach(line => {
      window.DB.payslips.push({ runId: newRun.id, ...line });
    });
    window.DB.save();
    this.state.mode = 'finalized';
    this.state.activeRun = newRun;
    this.render(document.getElementById('content'));
    window.Toast.show("Payroll Finalized. Sending payslips...", "success");
    setTimeout(() => {
      window.Toast.show(`${this.state.draftData.length} payslips dispatched!`, "success");
    }, 1500);
  },

  // ─── Rollback current active run ─────────────────────────────────────────
  rollbackRun: function () {
    if (!this.state.activeRun) return;
    this._doRollback(this.state.activeRun.id, () => {
      this.state.mode = 'view';
      this.state.activeRun = null;
      this.state.draftData = [];
      this.render(document.getElementById('content'));
    });
  },

  // ─── Rollback any specific run from history ────────────────────────────────
  rollbackSpecificRun: function (runId) {
    this._doRollback(runId, () => {
      // If this was the active run, reset
      if (this.state.activeRun?.id === runId) {
        this.state.mode = 'view';
        this.state.activeRun = null;
        this.state.draftData = [];
      }
      this.render(document.getElementById('content'));
    });
  },

  _doRollback: function (runId, callback) {
    const run = (window.DB.payrollRuns || []).find(r => r.id === runId);
    const label = run ? `${run.period} — ${run.company || ''}` : runId;
    window.showConfirmation(
      'Rollback Payroll?',
      `This will permanently delete the payroll run for <strong>${label}</strong> and all its payslips. Rollback is available at any time. This cannot be undone.`,
      () => {
        window.DB.payrollRuns = (window.DB.payrollRuns || []).filter(r => r.id !== runId);
        window.DB.payslips    = (window.DB.payslips    || []).filter(p => p.runId !== runId);
        window.DB.save();
        window.Toast.show("Payroll rolled back successfully", "warning");
        if (callback) callback();
      }
    );
  },

  nextPeriod: function () {
    const current = new Date(Date.parse("01 " + this.state.currentPeriod));
    current.setMonth(current.getMonth() + 1);
    const nextMonthName = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    window.showConfirmation("Start New Period?", `Proceed to ${nextMonthName}?`, () => {
      window.DB.settings = window.DB.settings || {};
      window.DB.settings.currentPeriod = nextMonthName;
      window.DB.save();
      this.state.currentPeriod = nextMonthName;
      this.state.mode = 'view';
      this.state.activeRun = null;
      this.state.draftData = [];
      window.Toast.show("Rolled over to " + nextMonthName, "success");
      this.render(document.getElementById('content'));
    });
  },

  exportEFT: function () {
    if (this.state.mode === 'finalized') this.generateBankFile();
    else window.Toast.show("No finalized run to export.", "warning");
  },

  generateBankFile: function () {
    const rows = ["Account Name,Account Number,Branch Code,Reference,Amount"];
    this.state.draftData.forEach(d => {
      const emp = window.DB.employees.find(e => e.id === d.id) || {};
      const acc    = emp.accountNumber || "123456789";
      const branch = emp.branchCode    || "250655";
      rows.push(`${d.employeeName},${acc},${branch},SALARY ${this.state.currentPeriod},${d.net.toFixed(2)}`);
    });
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `bank_export_${this.state.currentPeriod.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.Toast.show("Bank Payment File Downloaded", "success");
  },

  viewPayslip: function (employeeId) {
    if (this.state.mode === 'finalized') {
      Payslips.renderPayslipModal(this.state.activeRun.id, employeeId);
    } else if (this.state.mode === 'draft') {
      const draftLine = this.state.draftData.find(d => d.id === employeeId);
      if (draftLine) Payslips.renderPayslipModal(draftLine, employeeId);
      else window.Toast.show("Draft data for employee not found", "warning");
    }
  },

  filterRows: function (searchTerm) {
    const rows = document.querySelectorAll('#payrollTable tbody tr');
    const term = searchTerm.toLowerCase().trim();
    rows.forEach(row => { row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none'; });
  }
};

window.renderPayroll = function (container) {
  Payroll.render(container);
};