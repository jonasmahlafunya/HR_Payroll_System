// ─────────────────────────────────────────────────────────────────────────────
// Payroll Wizard — 7-Step Guided Payroll Process
// Flow: Company → Inputs → Validate → Calculate → Variances → Approval → Done
// ─────────────────────────────────────────────────────────────────────────────
const PayrollWizard = {
  currentStep: 1,
  maxSteps: 7,
  payrollData: {
    runId: null, companyId: null, companyName: null, period: null,
    type: 'regular', employees: [], errors: [], warnings: [],
    variances: [], calculations: [], approvalToken: null
  },

  steps: [
    { id: 1, name: 'Company & Period', icon: 'building' },
    { id: 2, name: 'Collect Inputs', icon: 'clipboard-list' },
    { id: 3, name: 'Validate Data', icon: 'check-circle' },
    { id: 4, name: 'Calculate', icon: 'calculator' },
    { id: 5, name: 'Variances', icon: 'chart-line' },
    { id: 6, name: 'Send for Approval', icon: 'paper-plane' },
    { id: 7, name: 'Submitted', icon: 'lock' },
  ],

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

  _generateToken: function () {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  },

  start: function () {
    this.currentStep = 1;
    this.payrollData = {
      runId: null, companyId: null, companyName: null,
      period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      type: 'regular', employees: [], errors: [], warnings: [],
      variances: [], calculations: [], approvalToken: null
    };
    this.render(document.getElementById('content'));
  },

  render: function (container) {
    const step = this.steps[this.currentStep - 1];
    const renderMap = {
      1: 'renderStepCompany', 2: 'renderStepInputs',
      3: 'renderStepValidation', 4: 'renderStepCalculation',
      5: 'renderStepVariances', 6: 'renderStepApproval',
      7: 'renderStepSubmitted'
    };
    const bodyFn = renderMap[this.currentStep];

    // Step 7 has its own button layout
    const isSubmittedStep = this.currentStep === 7;

    container.innerHTML = `
      <div class="payroll-wizard">
        ${this.renderProgressBar()}
        <div class="card" style="margin-top:20px;">
          <div class="card-header" style="background:var(--gray-50);">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:8px;background:var(--primary-soft);
                          display:flex;align-items:center;justify-content:center;color:var(--primary);">
                <i class="fas fa-${step.icon}" style="font-size:0.9rem;"></i>
              </div>
              <h3 class="card-title" style="margin:0;">Step ${this.currentStep} of ${this.maxSteps}: ${step.name}</h3>
            </div>
            <div style="font-size:0.78rem;color:var(--gray-400);">${this.currentStep} / ${this.maxSteps}</div>
          </div>

          <div class="card-body" id="wizardStepContent" style="padding:28px;">
            ${this[bodyFn]()}
          </div>

          ${!isSubmittedStep ? `
          <div style="display:flex;justify-content:space-between;align-items:center;
                      padding:16px 24px;border-top:1px solid var(--gray-200);background:var(--gray-50);">
            <button type="button" class="btn btn-outline"
              onclick="PayrollWizard.previousStep()" ${this.currentStep === 1 ? 'disabled' : ''}>
              <i class="fas fa-arrow-left"></i> Previous
            </button>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn btn-outline" onclick="PayrollWizard.cancel()">
                <i class="fas fa-times"></i> Cancel
              </button>
              ${this.currentStep < 6 ? `
              <button type="button" class="btn btn-primary" onclick="PayrollWizard.nextStep()">
                Next <i class="fas fa-arrow-right"></i>
              </button>` : ''}
            </div>
          </div>` : ''}
        </div>
      </div>`;
  },

  renderProgressBar: function () {
    const pct = ((this.currentStep - 1) / (this.maxSteps - 1)) * 100;
    return `
      <div style="background:#fff;border:1px solid var(--gray-200);border-radius:14px;
                  padding:20px 28px;box-shadow:var(--shadow-sm);">
        <div style="display:flex;align-items:flex-start;position:relative;">
          <div style="position:absolute;top:15px;left:15px;right:15px;height:2px;background:var(--gray-200);z-index:0;"></div>
          <div style="position:absolute;top:15px;left:15px;height:2px;
                      width:calc(${pct}% * (100% - 30px) / 100);
                      background:var(--primary);z-index:0;transition:width 0.4s ease;"></div>
          ${this.steps.map((s, idx) => {
      const num = idx + 1;
      const isActive = num === this.currentStep;
      const isDone = num < this.currentStep;
      const bg = isDone ? 'var(--success)' : isActive ? 'var(--primary)' : '#fff';
      const bdr = isDone ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--gray-300)';
      const clr = (isDone || isActive) ? '#fff' : 'var(--gray-400)';
      const lbl = isActive ? 'var(--primary)' : isDone ? 'var(--success)' : 'var(--gray-400)';
      return `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;z-index:1;">
                <div style="width:30px;height:30px;border-radius:50%;background:${bg};border:2px solid ${bdr};
                            color:${clr};display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:700;
                            box-shadow:${isActive ? '0 0 0 4px rgba(79,70,229,0.12)' : 'none'};">
                  ${isDone ? '<i class="fas fa-check" style="font-size:0.65rem;"></i>' : num}
                </div>
                <div style="font-size:0.62rem;color:${lbl};font-weight:${isActive ? '700' : '400'};
                            text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:68px;">
                  ${s.name}
                </div>
              </div>`;
    }).join('')}
        </div>
      </div>`;
  },

  // ── Step 1: Company & Period ───────────────────────────────────────────────
  renderStepCompany: function () {
    const companies = window.DB.companies || [];
    if (!companies.length) {
      return `<div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        No companies found. <a href="#" onclick="loadPage('companies')">Add a company first</a>.
      </div>`;
    }
    return `
      <div style="max-width:560px;">
        <p style="color:var(--gray-600);margin-bottom:20px;">Select the company and payroll period.</p>
        <div class="form-group">
          <label class="form-label">Payroll Type</label>
          <select class="form-control" id="wizard_type" onchange="PayrollWizard.payrollData.type=this.value">
            <option value="regular">Regular Monthly Payroll</option>
            <option value="bonus">13th Cheque / Bonus Run</option>
            <option value="retro">Retroactive Adjustment</option>
            <option value="termination">Termination Payroll</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Company <span style="color:var(--danger)">*</span></label>
          <select class="form-control" id="wizard_company" onchange="PayrollWizard.selectCompany(this.value)">
            <option value="">— Select Company —</option>
            ${companies.map(c => `<option value="${c.id}" ${this.payrollData.companyId == c.id ? 'selected' : ''}>
              ${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Payroll Period <span style="color:var(--danger)">*</span></label>
          <select class="form-control" id="wizard_period"
            onchange="PayrollWizard.payrollData.period=this.value">
            ${this._periodOptions(this.payrollData.period)}
          </select>
        </div>
        <div id="companyInfo" class="alert alert-info"
          style="display:${this.payrollData.companyId ? 'block' : 'none'};">
          <i class="fas fa-users"></i>
          <strong>${this.payrollData.companyName || ''}</strong> —
          ${this.payrollData.companyId ? this.getEmployeeCount() : 0} active employees
        </div>
      </div>`;
  },

  // ── Step 2: Collect Inputs ─────────────────────────────────────────────────
  renderStepInputs: function () {
    const emps = this.getCompanyEmployees();
    const isBonus = this.payrollData.type === 'bonus';
    if (!emps.length) {
      return `<div class="alert alert-warning">No active employees found for this company.</div>`;
    }
    return `
      <p style="color:var(--gray-600);margin-bottom:16px;">
        Review and add any bonuses, additional deductions or garnishee orders.
      </p>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th class="text-right">Basic Salary</th>
              <th class="text-right">${isBonus ? 'Bonus Amount' : 'Add. Bonus'}</th>
              <th class="text-right">Add. Deduction</th>
              <th class="text-right">Garnishee</th>
            </tr>
          </thead>
          <tbody>
            ${emps.map(emp => `
              <tr>
                <td>
                  <div style="font-weight:500;">${emp.firstName} ${emp.lastName}</div>
                  <div style="font-size:0.77rem;color:var(--gray-500);">${emp.position || '—'}</div>
                </td>
                <td class="text-right">${window.formatCurrency(emp.basicSalary || 0)}</td>
                <td class="text-right">
                  <input type="number" class="form-control" style="width:110px;text-align:right;"
                    value="${isBonus ? (emp.basicSalary || 0) : 0}" id="bonus_${emp.id}">
                </td>
                <td class="text-right">
                  <input type="number" class="form-control" style="width:100px;text-align:right;"
                    value="0" id="deduction_${emp.id}">
                </td>
                <td class="text-right">
                  <input type="number" class="form-control" style="width:100px;text-align:right;"
                    value="0" id="garnishee_${emp.id}">
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  // ── Step 3: Validate ───────────────────────────────────────────────────────
  renderStepValidation: function () {
    const validation = PayrollValidation.validatePayrollRun(this.payrollData);
    this.payrollData.errors = validation.errors;
    this.payrollData.warnings = validation.warnings;
    return `
      <p style="color:var(--gray-600);margin-bottom:16px;">Validating employee data…</p>
      ${validation.errors.length
        ? `<div class="alert alert-danger">
            <h4><i class="fas fa-exclamation-circle"></i> Critical Errors (${validation.errors.length})</h4>
            <ul style="margin:8px 0 0 20px;">
              ${validation.errors.map(e => `<li><strong>${e.employee}:</strong> ${e.message}</li>`).join('')}
            </ul>
           </div>`
        : `<div class="alert alert-success"><i class="fas fa-check-circle"></i> No critical errors found.</div>`}
      ${validation.warnings.length
        ? `<div class="alert alert-warning">
            <h4><i class="fas fa-exclamation-triangle"></i> Warnings (${validation.warnings.length})</h4>
            <ul style="margin:8px 0 0 20px;">
              ${validation.warnings.map(w => `<li><strong>${w.employee}:</strong> ${w.message}</li>`).join('')}
            </ul>
           </div>`
        : ''}
      ${!validation.errors.length && !validation.warnings.length
        ? `<div class="alert alert-success"><i class="fas fa-check-circle"></i> All checks passed!</div>`
        : ''}`;
  },

  // ── Step 4: Calculate ──────────────────────────────────────────────────────
  renderStepCalculation: function () {
    const emps = this.getCompanyEmployees();
    const isBonus = this.payrollData.type === 'bonus';

    const calcs = emps.map(emp => {
      const bonus = parseFloat(document.getElementById(`bonus_${emp.id}`)?.value || 0);
      const deduction = parseFloat(document.getElementById(`deduction_${emp.id}`)?.value || 0);
      const garnishee = parseFloat(document.getElementById(`garnishee_${emp.id}`)?.value || 0);
      const basic = emp.basicSalary || 0;

      // Calculate normal allowances
      const regularAllowances = Object.values(emp.allowances || {}).reduce((s, v) => s + v, 0);

      // Calculate custom benefits (Allowances & Deductions)
      const customBenefits = emp.benefits?.custom || [];
      const calcBenValue = (b) => {
        if (b.calc === 'Percentage') return (basic * (parseFloat(b.value) / 100));
        return parseFloat(b.value) || 0;
      };

      const customAllowanceTotal = customBenefits
        .filter(b => b.type === 'Allowance')
        .reduce((s, b) => s + calcBenValue(b), 0);

      const customDeductionTotal = customBenefits
        .filter(b => b.type === 'Deduction' || b.type === 'Reimbursement')
        .reduce((s, b) => s + calcBenValue(b), 0);

      const pensionPct = emp.benefits?.pensionPercent || 0;
      const pension = (basic * pensionPct) / 100;
      const medical = emp.benefits?.medicalContribution || 0;
      const age = window.TaxCalc ? window.TaxCalc.calculateAge(emp.dateOfBirth) : 35;
      const members = emp.benefits?.medicalMembers || 0;

      let gross, paye, uif, sdl, net;
      if (isBonus) {
        gross = bonus;
        paye = window.TaxCalc ? window.TaxCalc.calculateBonusPAYE(basic, bonus, age, members) : gross * 0.25;
        uif = sdl = 0;
        net = gross - paye - deduction - garnishee;
      } else {
        gross = basic + regularAllowances + customAllowanceTotal + bonus;
        paye = window.TaxCalc ? window.TaxCalc.calculatePAYE(gross - pension, age, members) : gross * 0.25;
        uif = window.TaxCalc ? window.TaxCalc.calculateUIF(gross) : Math.min(gross * 0.01, 177.12);
        sdl = window.TaxCalc ? window.TaxCalc.calculateSDL(gross) : gross * 0.01;
        net = gross - paye - uif - pension - medical - deduction - garnishee - customDeductionTotal;
      }

      return {
        id: emp.id, employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        companyName: emp.companyName || this.payrollData.companyName,
        basic, allowances: regularAllowances + customAllowanceTotal, bonus, gross, paye, uif, sdl,
        pension: isBonus ? 0 : pension,
        medical: isBonus ? 0 : medical,
        otherDeductions: deduction + customDeductionTotal, garnishee, net,
        customBenefits // Pass full breakdown for payslip rendering
      };
    });

    this.payrollData.calculations = calcs;

    const tot = calcs.reduce((a, c) => ({
      gross: a.gross + c.gross, paye: a.paye + c.paye,
      uif: a.uif + c.uif, net: a.net + c.net
    }), { gross: 0, paye: 0, uif: 0, net: 0 });

    const kpis = [
      { label: 'Total Gross', value: window.formatCurrency(tot.gross), accent: '#4F46E5' },
      { label: 'Total PAYE', value: window.formatCurrency(tot.paye), accent: '#DC2626' },
      { label: 'Total UIF', value: window.formatCurrency(tot.uif), accent: '#D97706' },
      { label: 'Total Net', value: window.formatCurrency(tot.net), accent: '#059669' },
    ];

    return `
      <div class="grid-4" style="margin-bottom:20px;">
        ${kpis.map(k => `
          <div style="background:#fff;border:1px solid var(--gray-200);border-radius:10px;
                      padding:16px;border-left:4px solid ${k.accent};box-shadow:var(--shadow-sm);">
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;
                        color:var(--gray-500);margin-bottom:6px;">${k.label}</div>
            <div style="font-size:1.25rem;font-weight:800;color:var(--gray-900);">${k.value}</div>
          </div>`).join('')}
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th class="text-right">Gross</th>
              <th class="text-right">PAYE</th>
              <th class="text-right">UIF</th>
              <th class="text-right">Pension</th>
              <th class="text-right">Medical</th>
              <th class="text-right">Net Pay</th>
            </tr>
          </thead>
          <tbody>
            ${calcs.map(c => `
              <tr>
                <td style="font-weight:500;">${c.employeeName}</td>
                <td class="text-right">${window.formatCurrency(c.gross)}</td>
                <td class="text-right text-danger">${window.formatCurrency(c.paye)}</td>
                <td class="text-right text-danger">${window.formatCurrency(c.uif)}</td>
                <td class="text-right">${window.formatCurrency(c.pension)}</td>
                <td class="text-right">${window.formatCurrency(c.medical)}</td>
                <td class="text-right" style="font-weight:700;color:var(--success);">${window.formatCurrency(c.net)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  // ── Step 5: Variances ──────────────────────────────────────────────────────
  renderStepVariances: function () {
    const variances = VarianceAnalysis.analyzeVariances(this.payrollData);
    this.payrollData.variances = variances;
    return `
      <p style="color:var(--gray-600);margin-bottom:16px;">Comparing with previous payroll run.</p>
      ${!variances.length
        ? `<div class="alert alert-info"><i class="fas fa-info-circle"></i> No previous run found for comparison, or no significant variances detected.</div>`
        : `<div class="table-responsive">
            <table>
              <thead><tr><th>Employee</th><th>Field</th><th class="text-right">Previous</th><th class="text-right">Current</th><th class="text-right">Variance</th><th>Severity</th></tr></thead>
              <tbody>
                ${variances.map(v => `
                  <tr>
                    <td>${v.employee}</td>
                    <td>${v.field || v.message || '—'}</td>
                    <td class="text-right">${v.previous ? window.formatCurrency(v.previous) : '—'}</td>
                    <td class="text-right">${v.current ? window.formatCurrency(v.current) : '—'}</td>
                    <td class="text-right" style="color:${(v.variance || '').includes('-') ? 'var(--danger)' : 'var(--success)'};">${v.variance || '—'}</td>
                    <td><span class="badge badge-${v.severity === 'high' ? 'danger' : 'warning'}">${(v.severity || 'info').toUpperCase()}</span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
           </div>`}`;
  },

  // ── Step 6: Send for Approval ──────────────────────────────────────────────
  renderStepApproval: function () {
    const company = window.DB.companies.find(c => c.id == this.payrollData.companyId) || {};
    const hasEmail = !!(company.email?.trim());
    const calcs = this.payrollData.calculations || [];
    const totalNet = calcs.reduce((s, c) => s + c.net, 0);
    const totalGross = calcs.reduce((s, c) => s + c.gross, 0);
    const totalPAYE = calcs.reduce((s, c) => s + c.paye, 0);

    return `
      <div style="max-width:600px;margin:0 auto;">
        <p style="color:var(--gray-600);margin-bottom:20px;">
          Send the payroll to the client for approval. The email will include a full employee
          breakdown and a secure <strong>Approve</strong> button.
        </p>

        ${!hasEmail ? `
          <div class="alert alert-warning" style="margin-bottom:16px;">
            <i class="fas fa-exclamation-triangle"></i>
            <div><strong>No email address on file for ${company.name || 'this company'}.</strong><br>
            Please <a href="#" onclick="loadPage('companies')">edit the company record</a>
            and add an email address, then return to this step.</div>
          </div>` : `
          <div class="alert alert-info" style="margin-bottom:16px;">
            <i class="fas fa-envelope"></i>
            <div><strong>Sending to:</strong> ${company.name} &lt;${company.email}&gt;</div>
          </div>`}

        <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;
                    padding:16px;margin-bottom:16px;">
          <h5 style="margin-bottom:12px;font-size:0.9rem;">Payroll Summary</h5>
          <div class="grid-3">
            <div style="text-align:center;">
              <div style="font-size:0.72rem;color:var(--gray-500);">Employees</div>
              <div style="font-size:1.4rem;font-weight:700;">${calcs.length}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.72rem;color:var(--gray-500);">Total Gross</div>
              <div style="font-size:1rem;font-weight:700;">${window.formatCurrency(totalGross)}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.72rem;color:var(--gray-500);">Total Net Pay</div>
              <div style="font-size:1.2rem;font-weight:800;color:var(--success);">${window.formatCurrency(totalNet)}</div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notes to Client (optional)</label>
          <textarea class="form-control" rows="3" id="approval_notes"
            placeholder="Any comments for the client to review…"></textarea>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px;">
          ${hasEmail ? `
            <button type="button" id="btnSendApproval" class="btn btn-primary" style="width:100%;padding:12px;"
              onclick="PayrollWizard.sendForApproval()">
              <i class="fas fa-paper-plane"></i> &nbsp; Send Approval Email &amp; Lock Payroll
            </button>` : ''}
          <button type="button" class="btn ${hasEmail ? 'btn-outline' : 'btn-primary'}" style="width:100%;"
            onclick="PayrollWizard.skipApproval()">
            <i class="fas fa-lock"></i>
            ${hasEmail ? 'Lock Without Sending Email' : 'Lock Payroll (No Email)'}
          </button>
        </div>

        <div id="approvalStatus" style="margin-top:16px;"></div>
      </div>`;
  },

  // ── Step 7: Submitted / Locked ─────────────────────────────────────────────
  renderStepSubmitted: function () {
    const run = (window.DB.payrollRuns || []).find(r => r.id === this.payrollData.runId);
    const status = run?.status || 'Pending Approval';
    const isApproved = status === 'Approved';

    return `
      <div style="text-align:center;padding:24px;">
        <div style="width:72px;height:72px;border-radius:50%;
                    background:${isApproved ? 'var(--success-soft)' : 'var(--warning-soft)'};
                    display:flex;align-items:center;justify-content:center;
                    font-size:1.8rem;margin:0 auto 20px;">
          <i class="fas fa-${isApproved ? 'check-circle' : 'lock'}"
             style="color:${isApproved ? 'var(--success)' : 'var(--warning)'}"></i>
        </div>

        <h3 style="margin-bottom:8px;color:var(--gray-900);">
          ${isApproved ? 'Payroll Approved!' : 'Payroll Locked — Awaiting Approval'}
        </h3>

        <p style="color:var(--gray-500);margin-bottom:24px;max-width:440px;margin-left:auto;margin-right:auto;">
          ${isApproved
        ? 'The client has approved this payroll. You can now generate the bank payment file.'
        : 'The approval email has been sent. The payroll is locked and awaiting client approval. You will be able to generate the bank file once approved.'}
        </p>

        <div style="background:var(--gray-50);border:1px solid var(--gray-200);
                    border-radius:8px;padding:12px 20px;display:inline-block;margin-bottom:24px;">
          <span style="font-size:0.85rem;color:var(--gray-600);">
            <strong>Run ID:</strong> ${this.payrollData.runId || '—'} &nbsp;&bull;&nbsp;
            <strong>Status:</strong>
            <span class="badge badge-${isApproved ? 'success' : 'warning'}" style="margin-left:4px;">${status}</span>
          </span>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-outline" onclick="loadPage('payroll')">
            <i class="fas fa-arrow-left"></i> Go to Payroll Dashboard
          </button>
          ${isApproved ? `
          <button class="btn btn-primary" onclick="Payroll.generateBankFileForRun('${this.payrollData.runId}')">
            <i class="fas fa-file-download"></i> Generate Bank File
          </button>` : `
          <button class="btn btn-outline" onclick="PayrollWizard.checkApprovalStatus()">
            <i class="fas fa-sync"></i> Check Approval Status
          </button>`}
        </div>
      </div>`;
  },

  // ── Send Approval Email (saves run, sends email with employee table) ────────
  sendForApproval: async function () {
    const company = window.DB.companies.find(c => c.id == this.payrollData.companyId);
    if (!company?.email?.trim()) {
      window.Toast.show('No company email address found.', 'warning'); return;
    }

    const btn = document.getElementById('btnSendApproval');
    const status = document.getElementById('approvalStatus');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…'; }
    if (status) status.innerHTML = '';

    // 1. Generate token and save run as "Pending Approval" BEFORE sending email
    //    so we have a run_id for the approve link.
    const token = this._generateToken();
    const runId = 'RUN_' + Date.now();
    const calcs = this.payrollData.calculations || [];
    const totals = calcs.reduce((a, c) => ({
      gross: a.gross + c.gross, paye: a.paye + c.paye,
      uif: a.uif + c.uif, sdl: a.sdl + (c.sdl || 0),
      pension: a.pension + (c.pension || 0),
      net: a.net + c.net
    }), { gross: 0, paye: 0, uif: 0, sdl: 0, pension: 0, net: 0 });

    const notes = document.getElementById('approval_notes')?.value || '';

    const newRun = {
      id: runId,
      companyId: this.payrollData.companyId,
      company: this.payrollData.companyName,
      period: this.payrollData.period,
      type: this.payrollData.type,
      status: 'Pending Approval',
      locked: true,
      approvalToken: token,
      approvalSentAt: new Date().toISOString(),
      createdBy: window.currentUser?.name || 'System',
      createdDate: new Date().toISOString(),
      totalGross: totals.gross,
      totalNet: totals.net,
      totalPAYE: totals.paye,
      totalUIF: totals.uif,
      totalSDL: totals.sdl,
      totalPension: totals.pension,
      gross: totals.gross,
      net: totals.net,
      employeeCount: calcs.length,
      lines: calcs
    };

    window.DB.payrollRuns = window.DB.payrollRuns || [];
    window.DB.payrollRuns.push(newRun);

    // Save payslips
    window.DB.payslips = window.DB.payslips || [];
    calcs.forEach(calc => {
      window.DB.payslips.push({
        runId, employeeId: calc.employeeId || calc.id,
        period: this.payrollData.period,
        companyName: this.payrollData.companyName,
        ...calc
      });
    });

    this.payrollData.runId = runId;
    this.payrollData.approvalToken = token;

    window.DB.save(); // Save to localStorage + server

    const approvalUrl = `${window.location.protocol}//${window.location.host}/api/approve.php?token=${token}&run_id=${encodeURIComponent(runId)}`;

    // 3. Generate PDF Breakdown if jsPDF is available
    let pdfBase64 = null;
    try {
      if (window.jspdf) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(79, 70, 229); // Primary color
        doc.text('Payroll Breakdown Report', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Company: ${company.name}`, 14, 30);
        doc.text(`Period: ${this.payrollData.period}`, 14, 35);
        doc.text(`Run ID: ${runId}`, 14, 40);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 45);

        // Summary Table
        const summaryData = [
          ['Total Employees', calcs.length.toString()],
          ['Total Gross', window.formatCurrency(totals.gross)],
          ['Total PAYE', window.formatCurrency(totals.paye)],
          ['Total UIF', window.formatCurrency(totals.uif)],
          ['Total Pension', window.formatCurrency(totals.pension)],
          ['Total SDL', window.formatCurrency(totals.sdl)],
          ['Total Net Pay', window.formatCurrency(totals.net)]
        ];

        doc.autoTable({
          startY: 55,
          head: [['Metric', 'Value']],
          body: summaryData,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] }
        });

        // Employee Breakdown Table
        const tableData = calcs.map(c => {
          // Helper for benefit value
          const getBenVal = (b) => {
            if (b.calc === 'Percentage') return (Number(c.basic) * parseFloat(b.value)) / 100;
            return parseFloat(b.value) || 0;
          };

          // Earnings Detailed Description
          const earns = [];
          earns.push(`Basic: ${window.formatCurrency(c.basic)}`);
          (c.customBenefits || []).filter(b => b.type === 'Allowance').forEach(b => {
            earns.push(`${b.name}: ${window.formatCurrency(getBenVal(b))}`);
          });
          if (Number(c.bonus) > 0) earns.push(`Bonus: ${window.formatCurrency(c.bonus)}`);
          const earnDetails = earns.join('\n');

          // Deductions Detailed Description
          const deds = [];
          if (Number(c.paye) > 0) deds.push(`PAYE: ${window.formatCurrency(c.paye)}`);
          if (Number(c.uif) > 0) deds.push(`UIF: ${window.formatCurrency(c.uif)}`);
          if (Number(c.pension) > 0) deds.push(`Pension: ${window.formatCurrency(c.pension)}`);
          if (Number(c.medical) > 0) deds.push(`Med Aid: ${window.formatCurrency(c.medical)}`);
          (c.customBenefits || []).filter(b => b.type === 'Deduction').forEach(b => {
            deds.push(`${b.name}: ${window.formatCurrency(getBenVal(b))}`);
          });
          if (Number(c.garnishee) > 0) deds.push(`Garnishee: ${window.formatCurrency(c.garnishee)}`);
          if (Number(c.otherDeductions) > 0) deds.push(`Other: ${window.formatCurrency(c.otherDeductions)}`);
          const dedDetails = deds.join('\n');

          return [
            c.employeeName,
            earnDetails,
            window.formatCurrency(c.gross),
            dedDetails,
            window.formatCurrency(c.net)
          ];
        });

        doc.autoTable({
          startY: doc.lastAutoTable.finalY + 15,
          head: [['Employee', 'Earnings Details', 'Total Gross', 'Deductions Details', 'Net Pay']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
          columnStyles: {
            1: { cellWidth: 50 },
            3: { cellWidth: 50 }
          }
        });

        pdfBase64 = doc.output('datauristring').split(',')[1];
      }
    } catch (pdfErr) {
      console.error('PDF Generation failed:', pdfErr);
    }

    // 4. Send email
    try {
      const response = await fetch('api/mail.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyEmail: company.email.trim(),
          companyName: company.name,
          period: this.payrollData.period,
          totalNet: window.formatCurrency(totals.net),
          totalGross: window.formatCurrency(totals.gross),
          totalPAYE: window.formatCurrency(totals.paye),
          totalUIF: window.formatCurrency(totals.uif),
          totalPension: window.formatCurrency(totals.pension),
          totalSDL: window.formatCurrency(totals.sdl),
          notes,
          employees: calcs,
          runId,
          approvalToken: token,
          approvalUrl,
          pdfBase64      // Added PDF attachment
        })
      });

      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('Server returned non-JSON response (HTTP ' + response.status + ')');
      }

      const result = await response.json().catch(() => ({}));

      if (result.status === 'success') {
        if (status) {
          status.innerHTML = `<div class="alert alert-success">
            <i class="fas fa-check-circle"></i>
            Approval email sent to <strong>${company.email}</strong>.
            Payroll is now locked.
          </div>`;
        }
        window.Toast.show(`Approval email sent to ${company.email}`, 'success');

        // Advance to step 7 after short pause
        setTimeout(() => {
          this.currentStep = 7;
          this.render(document.getElementById('content'));
        }, 1500);
      } else {
        throw new Error(result.error || 'Unknown error from mail server');
      }
    } catch (err) {
      // Email failed — run is already saved as Pending Approval
      if (status) {
        status.innerHTML = `<div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Email failed:</strong> ${err.message}<br>
          <small>The payroll has been saved as <em>Pending Approval</em>.
          You can retry the email from the Payroll Dashboard.</small>
        </div>`;
      }
      window.Toast.show('Email failed — payroll saved as Pending Approval', 'warning');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Retry Send Email'; }
    }
  },

  // Skip email — lock payroll as Pending Approval without emailing
  skipApproval: function () {
    const calcs = this.payrollData.calculations || [];
    const runId = 'RUN_' + Date.now();
    const token = this._generateToken();
    const totals = calcs.reduce((a, c) => ({
      gross: a.gross + c.gross, paye: a.paye + c.paye,
      uif: a.uif + c.uif, sdl: a.sdl + (c.sdl || 0), net: a.net + c.net
    }), { gross: 0, paye: 0, uif: 0, sdl: 0, net: 0 });

    const newRun = {
      id: runId, companyId: this.payrollData.companyId,
      company: this.payrollData.companyName, period: this.payrollData.period,
      type: this.payrollData.type, status: 'Pending Approval',
      locked: true, approvalToken: token,
      createdBy: window.currentUser?.name || 'System',
      createdDate: new Date().toISOString(),
      totalGross: totals.gross, totalNet: totals.net, totalPAYE: totals.paye,
      totalUIF: totals.uif, totalSDL: totals.sdl,
      gross: totals.gross, net: totals.net,
      employeeCount: calcs.length, lines: calcs
    };

    window.DB.payrollRuns = window.DB.payrollRuns || [];
    window.DB.payrollRuns.push(newRun);

    window.DB.payslips = window.DB.payslips || [];
    calcs.forEach(calc => {
      window.DB.payslips.push({
        runId, employeeId: calc.employeeId || calc.id,
        period: this.payrollData.period,
        companyName: this.payrollData.companyName, ...calc
      });
    });

    this.payrollData.runId = runId;
    this.payrollData.approvalToken = token;
    window.DB.save();

    window.Toast.show('Payroll locked as Pending Approval', 'info');
    this.currentStep = 7;
    this.render(document.getElementById('content'));
  },

  // Re-sync from server and check if status changed to Approved
  checkApprovalStatus: async function () {
    window.Toast.show('Checking approval status…', 'info');
    const serverData = await StorageManager.serverLoad();
    if (serverData) {
      Object.keys(serverData).forEach(k => { if (serverData[k] !== undefined) window.DB[k] = serverData[k]; });
    }
    // Re-render step 7
    this.render(document.getElementById('content'));
    const run = (window.DB.payrollRuns || []).find(r => r.id === this.payrollData.runId);
    if (run?.status === 'Approved') {
      window.Toast.show('Payroll approved! You can now generate the bank file.', 'success');
    } else {
      window.Toast.show('Still awaiting approval.', 'info');
    }
  },

  // ── Navigation ─────────────────────────────────────────────────────────────
  nextStep: function () {
    if (this.currentStep === 1) {
      const periodEl = document.getElementById('wizard_period');
      if (periodEl) this.payrollData.period = periodEl.value;
      if (!this.payrollData.companyId) { window.Toast.show('Select a company first', 'warning'); return; }
      if (!this.payrollData.period) { window.Toast.show('Select a payroll period', 'warning'); return; }
    }
    if (this.currentStep === 3 && this.payrollData.errors?.length) {
      window.Toast.show('Fix critical errors before proceeding', 'warning'); return;
    }
    if (this.currentStep < this.maxSteps) {
      this.currentStep++;
      this.render(document.getElementById('content'));
    }
  },

  previousStep: function () {
    if (this.currentStep > 1) { this.currentStep--; this.render(document.getElementById('content')); }
  },

  cancel: function () {
    window.showConfirmation('Cancel Wizard?', 'All unsaved progress will be lost.', () => {
      loadPage('payroll');
    });
  },

  // ── Helpers ────────────────────────────────────────────────────────────────
  selectCompany: function (companyId) {
    const co = window.DB.companies.find(c => c.id == companyId);
    if (co) {
      this.payrollData.companyId = co.id;
      this.payrollData.companyName = co.name;
      const info = document.getElementById('companyInfo');
      if (info) {
        info.innerHTML = `<i class="fas fa-users"></i> <strong>${co.name}</strong> — ${this.getEmployeeCount()} active employees`;
        info.style.display = 'block';
      }
    }
  },

  getEmployeeCount: function () { return this.getCompanyEmployees().length; },

  getCompanyEmployees: function () {
    const cid = this.payrollData.companyId;
    const cname = this.payrollData.companyName;
    return (window.DB.employees || []).filter(e => {
      if (e.status !== 'Active') return false;
      if (e.companyId && e.companyId == cid) return true;
      if (e.companyName && e.companyName === cname) return true;
      if (!e.companyName && !e.companyId && cid == (window.DB.companies[0]?.id)) return true;
      return false;
    });
  }
};

window.PayrollWizard = PayrollWizard;