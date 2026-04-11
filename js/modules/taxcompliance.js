
const TaxCompliance = {
  // SARS Tax Tables 2026/2027 (1 March 2026 – 28 February 2027)
  // Source: National Budget Speech 25 February 2026
  taxTables: [
    { limit: 245100, rate: 0.18, deduction: 0 },
    { limit: 383100, rate: 0.26, deduction: 44118 },
    { limit: 530200, rate: 0.31, deduction: 79998 },
    { limit: 695800, rate: 0.36, deduction: 125599 },
    { limit: 887000, rate: 0.39, deduction: 185215 },
    { limit: 1878600, rate: 0.41, deduction: 259783 },
    { limit: Infinity, rate: 0.45, deduction: 666339 }
  ],

  rebates: { primary: 17820, secondary: 9765, tertiary: 3249 },
  thresholds: { under65: 99000, age65to74: 153250, age75plus: 171300 },
  medicalCredits: { mainMember: 376, firstDependent: 376, additionalDependent: 254 },
  limits: {
    uifCeiling: 17712,
    uifMaxDeduction: 177.12,
    retirementFundCapPercent: 27.5,
    retirementFundCapAnnual: 350000
  },

  calculateAge: function (dobString) {
    if (!dobString) return 30;
    const dob = new Date(dobString);
    const ageDifMs = Date.now() - dob.getTime();
    return Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970);
  },

  // ─── Main Render ─────────────────────────────────────────────────────────
  render: function (container) {
    const html = `
      <div class="page-title-box">
        <h2>Tax & Statutory Compliance</h2>
        <div style="color: var(--gray-500);">SARS 2025/2026 — SA Legislative Parameters</div>
      </div>

      <div class="tabs" style="margin-bottom: 24px; border-bottom: 1px solid var(--gray-200);">
        <button class="tab-btn active" onclick="TaxCompliance.switchTab('tables', event)"><i class="fas fa-table"></i> Tax Tables</button>
        <button class="tab-btn" onclick="TaxCompliance.switchTab('irp5', event)"><i class="fas fa-file-alt"></i> IRP5 / IT3(a)</button>
        <button class="tab-btn" onclick="TaxCompliance.switchTab('emp201', event)"><i class="fas fa-receipt"></i> EMP201</button>
        <button class="tab-btn" onclick="TaxCompliance.switchTab('emp501', event)"><i class="fas fa-layer-group"></i> EMP501</button>
        <button class="tab-btn" onclick="TaxCompliance.switchTab('ui19', event)"><i class="fas fa-user-shield"></i> UI-19 (UIF)</button>
        <button class="tab-btn" onclick="TaxCompliance.switchTab('sdl', event)"><i class="fas fa-graduation-cap"></i> SDL</button>
      </div>

      <div id="taxComplianceContent">
        ${this.renderTablesTab()}
      </div>
    `;
    container.innerHTML = html;
  },

  switchTab: function (tab, event) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    const map = {
      tables: () => this.renderTablesTab(),
      irp5: () => this.renderIRP5Tab(),
      emp201: () => this.renderEMP201Tab(),
      emp501: () => this.renderEMP501Tab(),
      ui19: () => this.renderUI19Tab(),
      sdl: () => this.renderSDLTab()
    };
    document.getElementById('taxComplianceContent').innerHTML = (map[tab] || map.tables)();
  },

  // ─── Tab: Tax Tables ─────────────────────────────────────────────────────
  renderTablesTab: function () {
    return `
      <div class="grid-2" style="margin-bottom: 20px;">
        <div class="card">
          <div class="card-header"><h4>SARS Income Tax Brackets (2025)</h4></div>
          <div class="table-responsive">
            <table>
              <thead><tr><th>Taxable Income</th><th>Rate</th><th>Base Tax</th></tr></thead>
              <tbody>
                ${this.taxTables.map((t, i) => {
      const prev = i === 0 ? 0 : this.taxTables[i - 1].limit;
      const max = t.limit === Infinity ? '∞' : `R ${t.limit.toLocaleString('en-ZA')}`;
      return `<tr>
                    <td>R ${prev.toLocaleString('en-ZA')} – ${max}</td>
                    <td><strong>${(t.rate * 100).toFixed(0)}%</strong></td>
                    <td>${window.formatCurrency(t.deduction)}</td>
                  </tr>`;
    }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h4>Rebates, Thresholds & Credits</h4></div>
          <div class="card-body">
            <table style="width:100%; font-size: 0.85rem;">
              <tr style="background:var(--gray-50)"><th colspan="2" style="padding:8px">Tax Rebates</th></tr>
              <tr><td style="padding:6px 8px">Primary (all)</td><td style="padding:6px 8px; font-weight:600">${window.formatCurrency(this.rebates.primary)}</td></tr>
              <tr><td style="padding:6px 8px">Secondary (65–74)</td><td style="padding:6px 8px; font-weight:600">${window.formatCurrency(this.rebates.secondary)}</td></tr>
              <tr><td style="padding:6px 8px">Tertiary (75+)</td><td style="padding:6px 8px; font-weight:600">${window.formatCurrency(this.rebates.tertiary)}</td></tr>
              <tr style="background:var(--gray-50)"><th colspan="2" style="padding:8px">Monthly Medical Tax Credits</th></tr>
              <tr><td style="padding:6px 8px">Main member</td><td style="padding:6px 8px; font-weight:600">${window.formatCurrency(this.medicalCredits.mainMember)}</td></tr>
              <tr><td style="padding:6px 8px">1st dependent</td><td style="padding:6px 8px; font-weight:600">${window.formatCurrency(this.medicalCredits.firstDependent)}</td></tr>
              <tr><td style="padding:6px 8px">Each additional</td><td style="padding:6px 8px; font-weight:600">${window.formatCurrency(this.medicalCredits.additionalDependent)}</td></tr>
              <tr style="background:var(--gray-50)"><th colspan="2" style="padding:8px">Statutory Rates</th></tr>
              <tr><td style="padding:6px 8px">UIF (employee)</td><td style="padding:6px 8px; font-weight:600">1% (max R${this.limits.uifMaxDeduction}/mo)</td></tr>
              <tr><td style="padding:6px 8px">SDL</td><td style="padding:6px 8px; font-weight:600">1% of gross payroll</td></tr>
              <tr><td style="padding:6px 8px">Retirement fund cap</td><td style="padding:6px 8px; font-weight:600">27.5% / R350k p.a.</td></tr>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // ─── Tab: IRP5 / IT3(a) ──────────────────────────────────────────────────
  renderIRP5Tab: function () {
    const taxYear = "2025/2026";
    const companies = window.DB.companies || [];
    const compOptions = companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    return `
      <div class="card">
        <div class="card-header">
          <h4><i class="fas fa-file-alt"></i> IRP5 / IT3(a) — Annual Tax Certificates (${taxYear})</h4>
          <div style="display:flex; gap:8px; align-items:center;">
            <select class="form-control" id="irp5Company" style="width:200px; padding:6px 10px; font-size:0.82rem;" onchange="TaxCompliance.renderIRP5Table(this.value)">
              <option value="">All Companies</option>
              ${compOptions}
            </select>
            <button class="btn btn-primary btn-sm" onclick="TaxCompliance.exportIRP5()">
              <i class="fas fa-download"></i> Export CSV
            </button>
          </div>
        </div>
        <div class="card-body" style="padding:12px 0;">
          <div class="alert alert-info" style="margin:12px 16px;">
            <i class="fas fa-info-circle"></i>
            <div>IRP5 is issued to employees who had tax deducted. IT3(a) is issued when no tax was deducted. Generated from all <strong>finalized payroll runs</strong> in the ${taxYear} tax year (1 Mar 2025 – 28 Feb 2026).</div>
          </div>
          <div id="irp5TableContainer">
            ${this.renderIRP5Table()}
          </div>
        </div>
      </div>
    `;
  },

  renderIRP5Table: function (companyId = null) {
    const taxYear = "2025/2026";
    const html = `
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>ID Number</th><th>Certificate No</th>
                  <th class="text-right">Total Gross</th><th class="text-right">Total PAYE</th>
                  <th class="text-right">Total UIF</th><th class="text-right">Net Income</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                ${this.getIRP5Data(companyId).map(r => `
                  <tr>
                    <td><div style="font-weight:500">${r.name}</div><div style="font-size:0.77rem; color:var(--gray-500)">${r.company}</div></td>
                    <td style="font-family:monospace">${r.idNumber || '—'}</td>
                    <td style="font-family:monospace; font-size:0.8rem">IRP5-${taxYear}-${String(r.empId).padStart(4, '0')}</td>
                    <td class="text-right">${window.formatCurrency(r.totalGross)}</td>
                    <td class="text-right text-danger">${window.formatCurrency(r.totalPAYE)}</td>
                    <td class="text-right text-danger">${window.formatCurrency(r.totalUIF)}</td>
                    <td class="text-right text-success" style="font-weight:600">${window.formatCurrency(r.totalNet)}</td>
                    <td><span class="badge ${r.totalPAYE > 0 ? 'badge-primary' : 'badge-info'}">${r.totalPAYE > 0 ? 'IRP5' : 'IT3(a)'}</span></td>
                  </tr>
                `).join('') || '<tr><td colspan="8" class="text-center" style="padding:24px">No finalized payroll runs found for this tax year.</td></tr>'}
              </tbody>
            </table>
          </div>`;

    if (document.getElementById('irp5TableContainer')) {
      document.getElementById('irp5TableContainer').innerHTML = html;
    }
    return html;
  },

  getIRP5Data: function (companyId = null) {
    const runs = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized');
    const empMap = {};

    runs.forEach(run => {
      if (companyId && run.companyId != companyId) return;
      const slips = (window.DB.payslips || []).filter(p => p.runId === run.id);
      slips.forEach(p => {
        const emp = window.DB.employees.find(e => e.id === p.employeeId);
        if (!emp) return;
        if (!empMap[emp.id]) {
          empMap[emp.id] = {
            empId: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            idNumber: emp.idNumber,
            company: run.company || emp.companyName || '',
            totalGross: 0, totalPAYE: 0, totalUIF: 0, totalNet: 0
          };
        }
        empMap[emp.id].totalGross += (p.gross || 0);
        empMap[emp.id].totalPAYE += (p.paye || 0);
        empMap[emp.id].totalUIF += (p.uif || 0);
        empMap[emp.id].totalNet += (p.net || 0);
      });
    });

    return Object.values(empMap);
  },

  exportIRP5: function () {
    const companyId = document.getElementById('irp5Company')?.value || null;
    const data = this.getIRP5Data(companyId);
    const taxYear = 2025;

    const header = ['Certificate No', 'Employee Name', 'ID Number', 'Company', 'Total Gross', 'Total PAYE', 'Total UIF', 'Total Net', 'Type'];
    const rows = data.map(r => [
      `IRP5-${taxYear}-${String(r.empId).padStart(4, '0')}`,
      r.name, r.idNumber, r.company,
      r.totalGross.toFixed(2), r.totalPAYE.toFixed(2),
      r.totalUIF.toFixed(2), r.totalNet.toFixed(2),
      r.totalPAYE > 0 ? 'IRP5' : 'IT3(a)'
    ]);
    this._downloadCSV(`IRP5_${taxYear}.csv`, [header, ...rows]);
    window.Toast.show('IRP5/IT3(a) export downloaded', 'success');
  },

  // ─── Tab: EMP201 ─────────────────────────────────────────────────────────
  renderEMP201Tab: function () {
    const runs = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized');
    const periods = [...new Set(runs.map(r => r.period))].sort();
    const periodOptions = periods.map(p => `<option value="${p}">${p}</option>`).join('');

    return `
      <div class="card">
        <div class="card-header">
          <h4><i class="fas fa-receipt"></i> EMP201 — Monthly PAYE Declaration</h4>
          <div style="display:flex; gap:8px; align-items:center;">
            <select class="form-control" id="emp201Period" style="width:180px; padding:6px 10px; font-size:0.82rem;" onchange="TaxCompliance.renderEMP201Preview(this.value)">
              <option value="">Select Period</option>${periodOptions}
            </select>
            <button class="btn btn-primary btn-sm" onclick="TaxCompliance.exportEMP201()">
              <i class="fas fa-download"></i> CSV
            </button>
            <button class="btn btn-sm" style="background:#DC2626;color:white;" onclick="TaxCompliance.generateEMP201PDF()">
              <i class="fas fa-file-pdf"></i> Generate PDF
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            <div>Select a payroll period to generate the EMP201 monthly PAYE declaration. This file is submitted to SARS via eFiling by the 7th of the following month.</div>
          </div>
          <div id="emp201Preview"></div>
        </div>
      </div>
    `;
  },

  renderEMP201Preview: function (period) {
    if (!period) return;
    const runs = (window.DB.payrollRuns || []).filter(r => r.period === period && r.status === 'Finalized');
    const container = document.getElementById('emp201Preview');
    if (!container) return;

    if (!runs.length) {
      container.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> No finalized payroll runs for this period.</div>';
      return;
    }

    let totalPAYE = 0, totalUIF = 0, totalSDL = 0, totalEmpCount = 0;
    runs.forEach(r => {
      totalPAYE += r.totalPAYE || 0;
      totalUIF += (r.totalUIF || 0) * 2; // employee + employer UIF = 2%
      totalSDL += r.totalGross * 0.01;
      totalEmpCount += r.employeeCount || 0;
    });
    const totalPayable = totalPAYE + totalUIF + totalSDL;

    container.innerHTML = `
      <div style="background:var(--gray-50); border:1px solid var(--gray-200); border-radius:8px; padding:20px; margin-top:16px;">
        <h5 style="margin-bottom:16px;">EMP201 Summary — ${period}</h5>
        <div class="grid-4" style="margin-bottom:16px;">
          <div style="text-align:center; padding:12px; background:white; border-radius:8px; border:1px solid var(--gray-200);">
            <div style="font-size:0.75rem; color:var(--gray-500); margin-bottom:4px;">PAYE (Income Tax)</div>
            <div style="font-size:1.2rem; font-weight:700; color:var(--danger)">${window.formatCurrency(totalPAYE)}</div>
          </div>
          <div style="text-align:center; padding:12px; background:white; border-radius:8px; border:1px solid var(--gray-200);">
            <div style="font-size:0.75rem; color:var(--gray-500); margin-bottom:4px;">UIF (Employee + Employer)</div>
            <div style="font-size:1.2rem; font-weight:700; color:var(--warning)">${window.formatCurrency(totalUIF)}</div>
          </div>
          <div style="text-align:center; padding:12px; background:white; border-radius:8px; border:1px solid var(--gray-200);">
            <div style="font-size:0.75rem; color:var(--gray-500); margin-bottom:4px;">SDL Levy</div>
            <div style="font-size:1.2rem; font-weight:700; color:var(--info)">${window.formatCurrency(totalSDL)}</div>
          </div>
          <div style="text-align:center; padding:12px; background:var(--primary); border-radius:8px;">
            <div style="font-size:0.75rem; color:rgba(255,255,255,0.8); margin-bottom:4px;">TOTAL PAYABLE</div>
            <div style="font-size:1.2rem; font-weight:700; color:white">${window.formatCurrency(totalPayable)}</div>
          </div>
        </div>
        <div style="font-size:0.82rem; color:var(--gray-600);">
          Employees: ${totalEmpCount} &bull; Due: 7th of following month &bull; Reference: EMP201/${period.replace(' ', '')}
        </div>
      </div>
    `;
  },

  exportEMP201: function () {
    const period = document.getElementById('emp201Period')?.value;
    if (!period) { window.Toast.show('Select a period first', 'warning'); return; }

    const runs = (window.DB.payrollRuns || []).filter(r => r.period === period && r.status === 'Finalized');
    const header = ['Employer Ref', 'Period', 'Company', 'Employees', 'PAYE', 'UIF (Total)', 'SDL', 'Total Payable'];
    const rows = runs.map(r => {
      const uif = (r.totalUIF || 0) * 2;
      const sdl = (r.totalGross || 0) * 0.01;
      return [
        window.DB.settings?.taxRefNumber || 'UNKNOWN', period,
        r.company, r.employeeCount,
        (r.totalPAYE || 0).toFixed(2), uif.toFixed(2),
        sdl.toFixed(2), ((r.totalPAYE || 0) + uif + sdl).toFixed(2)
      ];
    });
    this._downloadCSV(`EMP201_${period.replace(' ', '_')}.csv`, [header, ...rows]);
    window.Toast.show('EMP201 export downloaded', 'success');
  },

  // ─── Tab: EMP501 ─────────────────────────────────────────────────────────
  renderEMP501Tab: function () {
    const companies = window.DB.companies || [];
    const compOptions = companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    return `
      <div class="card">
        <div class="card-header">
          <h4><i class="fas fa-layer-group"></i> EMP501 — Bi-Annual Reconciliation</h4>
          <div style="display:flex; gap:8px;">
            <select class="form-control" id="emp501Company" style="width:200px; padding:6px 10px; font-size:0.82rem;">
              <option value="">All Companies</option>
              ${compOptions}
            </select>
            <button class="btn btn-primary btn-sm" onclick="TaxCompliance.exportEMP501()">
              <i class="fas fa-download"></i> Export CSV
            </button>
          </div>
        </div>
        <div class="card-body" style="padding:12px 0;">
          <div class="alert alert-info" style="margin:12px 16px;">
            <i class="fas fa-info-circle"></i>
            <div>EMP501 is the Employer Reconciliation Declaration. It reconciles the total PAYE, SDL, and UIF paid over to SARS with the total amounts on IRP5/IT3(a) certificates. Due Bi-Annually (Aug and Feb).</div>
          </div>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Company</th>
                  <th class="text-right">Total PAYE Declared</th>
                  <th class="text-right">Total UIF Declared</th>
                  <th class="text-right">Total SDL Declared</th>
                  <th class="text-right">Total Payable</th>
                </tr>
              </thead>
              <tbody>
                ${(window.DB.payrollRuns || []).filter(r => r.status === 'Finalized').map(r => {
      const uif = (r.totalUIF || 0) * 2;
      const total = (r.totalPAYE || 0) + uif + (r.totalSDL || 0);
      return `<tr>
                    <td>${r.period}</td>
                    <td>${r.company}</td>
                    <td class="text-right text-danger">${window.formatCurrency(r.totalPAYE)}</td>
                    <td class="text-right text-warning">${window.formatCurrency(uif)}</td>
                    <td class="text-right text-info">${window.formatCurrency(r.totalSDL)}</td>
                    <td class="text-right" style="font-weight:700">${window.formatCurrency(total)}</td>
                  </tr>`;
    }).join('') || '<tr><td colspan="6" class="text-center" style="padding:24px;color:var(--gray-500)">No finalized payroll runs found for reconciliation.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  exportEMP501: function () {
    const runs = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized');
    const header = ['Period', 'Company', 'Total PAYE Declarable', 'Total UIF Declarable', 'Total SDL Declarable', 'Total Tax Liability'];
    const rows = runs.map(r => {
      const uif = (r.totalUIF || 0) * 2;
      const total = (r.totalPAYE || 0) + uif + (r.totalSDL || 0);
      return [r.period, r.company, (r.totalPAYE || 0).toFixed(2), uif.toFixed(2), (r.totalSDL || 0).toFixed(2), total.toFixed(2)];
    });
    this._downloadCSV('EMP501_Reconciliation.csv', [header, ...rows]);
    window.Toast.show('EMP501 exported', 'success');
  },

  // ─── Tab: UI-19 (UIF) ────────────────────────────────────────────────────
  renderUI19Tab: function () {
    const runs = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized');
    const periods = [...new Set(runs.map(r => r.period))].sort();
    const periodOptions = periods.map(p => `<option value="${p}">${p}</option>`).join('');

    return `
      <div class="card">
        <div class="card-header">
          <h4><i class="fas fa-umbrella"></i> UI-19 — Declarations for UIF</h4>
          <div style="display:flex; gap:8px; align-items:center;">
            <select class="form-control" id="ui19Period" style="width:180px; padding:6px 10px; font-size:0.82rem;" onchange="TaxCompliance.renderUI19Table(this.value)">
              <option value="">All Periods</option>${periodOptions}
            </select>
            <button class="btn btn-primary btn-sm" onclick="TaxCompliance.exportUI19()">
              <i class="fas fa-download"></i> Export CSV
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            <div>The UI-19 is submitted to the Department of Employment and Labour monthly. It lists each employee's UIF-able remuneration and contributions.</div>
          </div>
          ${this.getUI19TableHTML()}
        </div>
      </div>
    `;
  },

  getUI19TableHTML: function (period = null) {
    const slips = period
      ? (window.DB.payslips || []).filter(p => p.period === period)
      : (window.DB.payslips || []);

    if (!slips.length) return '<div class="text-center" style="padding:24px; color:var(--gray-500)">No payslip data. Finalize a payroll run first.</div>';

    return `
      <div class="table-responsive">
        <table>
          <thead><tr><th>Employee</th><th>ID Number</th><th>UIF Reg No</th><th class="text-right">Gross Remuneration</th><th class="text-right">UIF-able Amount</th><th class="text-right">Employee UIF (1%)</th><th class="text-right">Employer UIF (1%)</th></tr></thead>
          <tbody>
            ${slips.map(p => {
      const emp = window.DB.employees.find(e => e.id === p.employeeId);
      if (!emp) return '';
      const uifable = Math.min(p.gross || 0, this.limits.uifCeiling);
      const uif = uifable * 0.01;
      return `<tr>
                <td>${emp.firstName} ${emp.lastName}</td>
                <td style="font-family:monospace">${emp.idNumber || '—'}</td>
                <td style="font-family:monospace">${emp.uifNumber || 'UIF' + String(emp.id).padStart(8, '0')}</td>
                <td class="text-right">${window.formatCurrency(p.gross || 0)}</td>
                <td class="text-right">${window.formatCurrency(uifable)}</td>
                <td class="text-right text-danger">${window.formatCurrency(uif)}</td>
                <td class="text-right text-warning">${window.formatCurrency(uif)}</td>
              </tr>`;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  exportUI19: function () {
    const period = document.getElementById('ui19Period')?.value;
    const slips = period
      ? (window.DB.payslips || []).filter(p => p.period === period)
      : window.DB.payslips || [];

    if (!slips.length) { window.Toast.show('No payslip data for selected period', 'warning'); return; }

    const header = ['Employer UIF Ref', 'Period', 'Employee Name', 'ID Number', 'UIF Reg No', 'Gross Remuneration', 'UIF-able Amount', 'Employee UIF', 'Employer UIF', 'Total UIF'];
    const rows = slips.map(p => {
      const emp = window.DB.employees.find(e => e.id === p.employeeId);
      if (!emp) return null;
      const uifable = Math.min(p.gross || 0, this.limits.uifCeiling);
      const uif = uifable * 0.01;
      return [
        window.DB.settings?.uifRefNumber || 'U123456789',
        p.period || period,
        `${emp.firstName} ${emp.lastName}`,
        emp.idNumber || '', emp.uifNumber || '',
        (p.gross || 0).toFixed(2), uifable.toFixed(2),
        uif.toFixed(2), uif.toFixed(2), (uif * 2).toFixed(2)
      ];
    }).filter(Boolean);

    this._downloadCSV(`UI19_${(period || 'all').replace(' ', '_')}.csv`, [header, ...rows]);
    window.Toast.show('UI-19 export downloaded', 'success');
  },

  // ─── Tab: SDL ────────────────────────────────────────────────────────────
  renderSDLTab: function () {
    const runs = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized');
    const periods = [...new Set(runs.map(r => r.period))].sort();

    let totalSDL = 0, totalGross = 0, totalEmp = 0;
    runs.forEach(r => { totalSDL += (r.totalGross || 0) * 0.01; totalGross += r.totalGross || 0; totalEmp += r.employeeCount || 0; });

    return `
      <div class="card">
        <div class="card-header">
          <h4><i class="fas fa-graduation-cap"></i> SDL — Skills Development Levy Report</h4>
          <button class="btn btn-primary btn-sm" onclick="TaxCompliance.exportSDL()">
            <i class="fas fa-download"></i> Export CSV
          </button>
        </div>
        <div class="card-body">
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            <div>SDL is 1% of the total gross remuneration paid to employees. Paid together with PAYE/UIF via EMP201. Employers with annual payroll &lt; R500k are exempt.</div>
          </div>

          <div class="grid-3" style="margin-bottom:20px;">
            <div class="card" style="text-align:center; padding:16px;">
              <div style="font-size:0.75rem; color:var(--gray-500)">Total Gross (All Runs)</div>
              <div style="font-size:1.3rem; font-weight:700">${window.formatCurrency(totalGross)}</div>
            </div>
            <div class="card" style="text-align:center; padding:16px;">
              <div style="font-size:0.75rem; color:var(--gray-500)">SDL Payable (1%)</div>
              <div style="font-size:1.3rem; font-weight:700; color:var(--primary)">${window.formatCurrency(totalSDL)}</div>
            </div>
            <div class="card" style="text-align:center; padding:16px;">
              <div style="font-size:0.75rem; color:var(--gray-500)">Employees Covered</div>
              <div style="font-size:1.3rem; font-weight:700">${totalEmp}</div>
            </div>
          </div>

          <div class="table-responsive">
            <table>
              <thead><tr><th>Period</th><th>Company</th><th>Employees</th><th class="text-right">Gross Payroll</th><th class="text-right">SDL (1%)</th><th>SETA</th></tr></thead>
              <tbody>
                ${runs.length ? runs.map(r => `
                  <tr>
                    <td>${r.period}</td>
                    <td>${r.company}</td>
                    <td>${r.employeeCount}</td>
                    <td class="text-right">${window.formatCurrency(r.totalGross || 0)}</td>
                    <td class="text-right" style="font-weight:600; color:var(--primary)">${window.formatCurrency((r.totalGross || 0) * 0.01)}</td>
                    <td><span class="badge badge-info">Services SETA</span></td>
                  </tr>
                `).join('') : '<tr><td colspan="6" class="text-center" style="padding:24px">No finalized payroll runs.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  exportSDL: function () {
    const runs = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized');
    const header = ['Period', 'Company', 'Employees', 'Gross Payroll', 'SDL (1%)', 'SETA', 'Employer SDL Ref'];
    const rows = runs.map(r => [
      r.period, r.company, r.employeeCount,
      (r.totalGross || 0).toFixed(2),
      ((r.totalGross || 0) * 0.01).toFixed(2),
      'Services SETA',
      window.DB.settings?.sdlRefNumber || 'SDL123456'
    ]);
    this._downloadCSV('SDL_Report.csv', [header, ...rows]);
    window.Toast.show('SDL report downloaded', 'success');
  },

  // ─── EMP201 PDF Generation ───────────────────────────────────────────────
  generateEMP201PDF: function () {
    const period = document.getElementById('emp201Period')?.value;
    if (!period) { window.Toast.show('Select a period first', 'warning'); return; }
    if (!window.jspdf) { window.Toast.show('jsPDF library not loaded', 'danger'); return; }

    const runs = (window.DB.payrollRuns || []).filter(r => r.period === period && r.status === 'Finalized');
    if (!runs.length) { window.Toast.show('No finalized runs for this period', 'warning'); return; }

    let totalPAYE = 0, totalUIF = 0, totalSDL = 0, totalEmpCount = 0, totalGross = 0;
    runs.forEach(r => {
      totalPAYE += r.totalPAYE || 0;
      totalUIF += (r.totalUIF || 0) * 2;
      totalSDL += (r.totalGross || 0) * 0.01;
      totalEmpCount += r.employeeCount || 0;
      totalGross += r.totalGross || 0;
    });
    const totalPayable = totalPAYE + totalUIF + totalSDL;

    const settings = window.DB.settings || {};
    const companies = window.DB.companies || [];
    const company = companies[0] || {};

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(11, 29, 58);
    doc.rect(0, 0, w, 35, 'F');
    doc.setFontSize(16);
    doc.setTextColor(245, 158, 11);
    doc.text('SARS EMP201', 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text('Monthly Employer Declaration — Generated by Nexa HR & Payroll', 14, 24);
    doc.text('www.nexasystems.co.za', 14, 30);

    let y = 45;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);

    // Employer Info
    doc.setFontSize(11);
    doc.setTextColor(11, 29, 58);
    doc.text('EMPLOYER INFORMATION', 14, y);
    y += 2;
    doc.setDrawColor(11, 29, 58);
    doc.line(14, y, w - 14, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const empInfo = [
      ['Trading Name', company.name || settings.companyName || 'N/A'],
      ['PAYE Reference No.', settings.taxRefNumber || company.payeRef || 'Not Set'],
      ['UIF Reference No.', settings.uifRefNumber || company.uifRef || 'Not Set'],
      ['SDL Reference No.', settings.sdlRefNumber || company.sdlRef || 'Not Set'],
      ['Declaration Period', period],
      ['Due Date', '7th of following month'],
      ['No. of Employees', String(totalEmpCount)]
    ];
    empInfo.forEach(([label, val]) => {
      doc.setTextColor(100);
      doc.text(label + ':', 14, y);
      doc.setTextColor(30, 30, 30);
      doc.setFont(undefined, 'bold');
      doc.text(val, 80, y);
      doc.setFont(undefined, 'normal');
      y += 6;
    });

    y += 8;

    // Tax Breakdown
    doc.setFontSize(11);
    doc.setTextColor(11, 29, 58);
    doc.text('TAX LIABILITY BREAKDOWN', 14, y);
    y += 2;
    doc.line(14, y, w - 14, y);
    y += 4;

    const fmtR = v => 'R ' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    doc.autoTable({
      startY: y,
      head: [['Tax Component', 'Rate / Basis', 'Amount (ZAR)']],
      body: [
        ['PAYE (Employees\' Tax)', 'Per tax tables', fmtR(totalPAYE)],
        ['UIF — Employee Contribution', '1% of remuneration', fmtR(totalUIF / 2)],
        ['UIF — Employer Contribution', '1% of remuneration', fmtR(totalUIF / 2)],
        ['UIF — Total', '2% combined', fmtR(totalUIF)],
        ['SDL (Skills Development Levy)', '1% of gross payroll', fmtR(totalSDL)],
        ['', '', ''],
        ['TOTAL PAYABLE TO SARS', '', fmtR(totalPayable)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [11, 29, 58], textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 75 },
        2: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        if (data.row.index === 6) {
          data.cell.styles.fillColor = [245, 158, 11];
          data.cell.styles.textColor = [11, 29, 58];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
        }
      }
    });

    y = doc.lastAutoTable.finalY + 12;

    // Per-company breakdown if multiple
    if (runs.length > 1) {
      doc.setFontSize(11);
      doc.setTextColor(11, 29, 58);
      doc.text('PER-COMPANY BREAKDOWN', 14, y);
      y += 2;
      doc.line(14, y, w - 14, y);
      y += 4;

      doc.autoTable({
        startY: y,
        head: [['Company', 'Employees', 'Gross', 'PAYE', 'UIF (Total)', 'SDL']],
        body: runs.map(r => [
          r.company || 'Unknown',
          String(r.employeeCount || 0),
          fmtR(r.totalGross || 0),
          fmtR(r.totalPAYE || 0),
          fmtR((r.totalUIF || 0) * 2),
          fmtR((r.totalGross || 0) * 0.01)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 }
      });
      y = doc.lastAutoTable.finalY + 12;
    }

    // Signature Block
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Prepared by: ' + (window.currentUser?.name || 'System'), 14, y);
    doc.text('Date: ' + new Date().toLocaleDateString('en-ZA'), 14, y + 6);
    doc.text('Signature: ________________________', 14, y + 18);

    // Footer
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(248, 250, 252);
    doc.rect(0, ph - 18, w, 18, 'F');
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('Generated by Nexa HR & Payroll — This is a system-generated document for EMP201 submission via SARS eFiling.', w / 2, ph - 10, { align: 'center' });
    doc.text('© ' + new Date().getFullYear() + ' Nexa Systems (Pty) Ltd', w / 2, ph - 5, { align: 'center' });

    doc.save('EMP201_' + period.replace(/\s/g, '_') + '.pdf');
    window.Toast.show('EMP201 PDF generated and downloaded', 'success');
  },

  // ─── CSV Utility ─────────────────────────────────────────────────────────
  _downloadCSV: function (filename, rows) {
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // ─── Tax Calculation Functions ────────────────────────────────────────────
  calculatePAYE: function (monthlyRemuneration, age = 35, medicalMembers = 0) {
    return this.calculateAnnualPAYE(monthlyRemuneration * 12, age, medicalMembers) / 12;
  },

  calculateAnnualPAYE: function (annualEquivalent, age = 35, medicalMembers = 0) {
    if (!annualEquivalent || annualEquivalent <= 0) return 0;

    let grossTax = 0;
    for (let i = 0; i < this.taxTables.length; i++) {
      const bracket = this.taxTables[i];
      const prevLimit = i === 0 ? 0 : this.taxTables[i - 1].limit;
      if (annualEquivalent <= bracket.limit) {
        grossTax = bracket.deduction + ((annualEquivalent - prevLimit) * bracket.rate);
        break;
      } else if (i === this.taxTables.length - 1) {
        grossTax = bracket.deduction + ((annualEquivalent - prevLimit) * bracket.rate);
      }
    }

    let rebate = this.rebates.primary;
    if (age >= 65) rebate += this.rebates.secondary;
    if (age >= 75) rebate += this.rebates.tertiary;

    let netTax = Math.max(0, grossTax - rebate);

    let annualMTC = 0;
    if (medicalMembers >= 1) {
      annualMTC += this.medicalCredits.mainMember;
      if (medicalMembers > 1) annualMTC += this.medicalCredits.firstDependent;
      if (medicalMembers > 2) annualMTC += (medicalMembers - 2) * this.medicalCredits.additionalDependent;
    }

    netTax = Math.max(0, netTax - (annualMTC * 12));
    return netTax;
  },

  // PAYE on bonus using the directive (annual equivalent) method
  calculateBonusPAYE: function (basicSalary, bonusAmount, age = 35, medicalMembers = 0) {
    const regularAnnualPAYE = this.calculateAnnualPAYE(basicSalary * 12, age, medicalMembers);
    const annualWithBonus = (basicSalary * 12) + bonusAmount;
    const netTaxWithBonus = this.calculateAnnualPAYE(annualWithBonus, age, medicalMembers);
    return Math.max(0, netTaxWithBonus - regularAnnualPAYE);
  },

  calculateUIF: function (grossRemuneration) {
    return Math.min(grossRemuneration, this.limits.uifCeiling) * 0.01;
  },

  calculateSDL: function (sdlRemuneration) {
    return sdlRemuneration * 0.01;
  },

  calculateRetirementTaxDeduction: function (rfi, actualContribution) {
    const capPercentage = rfi * (this.limits.retirementFundCapPercent / 100);
    const capAnnual = this.limits.retirementFundCapAnnual / 12;
    return Math.min(actualContribution, capPercentage, capAnnual);
  }
};

window.renderTaxCompliance = function (container) {
  TaxCompliance.render(container);
};

window.TaxCalc = TaxCompliance;
