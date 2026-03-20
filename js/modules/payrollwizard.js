// Payroll Wizard Module - 8-Step Guided Payroll Process
const PayrollWizard = {
    currentStep: 1,
    maxSteps: 8,
    payrollData: {
        runId: null,
        companyId: null,
        companyName: null,
        period: null,
        type: 'regular',
        employees: [],
        errors: [],
        warnings: [],
        variances: []
    },

    steps: [
        { id: 1, name: 'Company & Period', icon: 'building', component: 'renderStepCompanySelection' },
        { id: 2, name: 'Collect Inputs', icon: 'clipboard-list', component: 'renderStepCollectInputs' },
        { id: 3, name: 'Validate Data', icon: 'check-circle', component: 'renderStepValidation' },
        { id: 4, name: 'Run Calculation', icon: 'calculator', component: 'renderStepCalculation' },
        { id: 5, name: 'Review Variances', icon: 'chart-line', component: 'renderStepVariances' },
        { id: 6, name: 'Client Approval', icon: 'user-check', component: 'renderStepApproval' },
        { id: 7, name: 'Finalize & Lock', icon: 'lock', component: 'renderStepFinalize' },
        { id: 8, name: 'Bank File', icon: 'file-download', component: 'renderStepBankFile' }
    ],

    // ── Generate period dropdown options (18 months back → 3 months forward) ──
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

    start: function () {
        this.currentStep = 1;
        // Set default period to current month
        const defaultPeriod = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        this.payrollData = {
            runId: null, companyId: null, companyName: null,
            period: defaultPeriod, type: 'regular',
            employees: [], errors: [], warnings: [], variances: []
        };
        this.render(document.getElementById('content'));
    },

    render: function (container) {
        const step = this.steps[this.currentStep - 1];
        const html = `
            <div class="payroll-wizard">
                ${this.renderProgressBar()}

                <div class="card" style="margin-top:20px;">
                    <div class="card-header" style="background:var(--gray-50);">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="width:34px;height:34px;border-radius:8px;background:var(--primary-soft);
                                        display:flex;align-items:center;justify-content:center;color:var(--primary);">
                                <i class="fas fa-${step.icon}" style="font-size:0.9rem;"></i>
                            </div>
                            <h3 class="card-title" style="margin:0;">
                                Step ${this.currentStep} of ${this.maxSteps}: ${step.name}
                            </h3>
                        </div>
                        <div style="font-size:0.78rem;color:var(--gray-400);">
                            ${this.currentStep} / ${this.maxSteps} steps completed
                        </div>
                    </div>

                    <div class="card-body" id="wizardStepContent" style="padding:28px;">
                        ${this[step.component]()}
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;
                                padding:16px 24px;border-top:1px solid var(--gray-200);background:var(--gray-50);">
                        <button type="button" class="btn btn-outline"
                            onclick="PayrollWizard.previousStep()"
                            ${this.currentStep === 1 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-left"></i> Previous
                        </button>
                        <div style="display:flex;gap:8px;">
                            <button type="button" class="btn btn-outline" onclick="PayrollWizard.cancel()">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button type="button" class="btn btn-primary" onclick="PayrollWizard.nextStep()">
                                ${this.currentStep === this.maxSteps ? '<i class="fas fa-check"></i> Complete' : 'Next <i class="fas fa-arrow-right"></i>'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        container.innerHTML = html;
    },

    // ── Clean white progress bar — no purple pill background ──────────────────
    renderProgressBar: function () {
        const pct = ((this.currentStep - 1) / (this.maxSteps - 1)) * 100;

        return `
            <div style="background:#fff;border:1px solid var(--gray-200);border-radius:14px;
                        padding:20px 28px;box-shadow:var(--shadow-sm);">

                <!-- Step bubbles -->
                <div style="display:flex;align-items:flex-start;position:relative;gap:0;">

                    <!-- Track line behind bubbles -->
                    <div style="position:absolute;top:15px;left:15px;right:15px;height:2px;background:var(--gray-200);z-index:0;"></div>
                    <!-- Filled portion of track -->
                    <div style="position:absolute;top:15px;left:15px;height:2px;
                                width:calc(${pct}% * (100% - 30px) / 100);
                                background:var(--primary);z-index:0;transition:width 0.4s ease;"></div>

                    ${this.steps.map((s, idx) => {
            const num = idx + 1;
            const isActive = num === this.currentStep;
            const isDone = num < this.currentStep;
            const isPending = num > this.currentStep;

            const bubbleBg = isDone ? 'var(--success)' : isActive ? 'var(--primary)' : '#fff';
            const bubbleBorder = isDone ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--gray-300)';
            const bubbleColor = (isDone || isActive) ? '#fff' : 'var(--gray-400)';
            const labelColor = isActive ? 'var(--primary)' : isDone ? 'var(--success)' : 'var(--gray-400)';
            const labelWeight = isActive ? '700' : isDone ? '600' : '400';

            return `
                            <div style="flex:1;display:flex;flex-direction:column;align-items:center;
                                        gap:6px;position:relative;z-index:1;">
                                <div style="width:30px;height:30px;border-radius:50%;
                                            background:${bubbleBg};border:2px solid ${bubbleBorder};
                                            color:${bubbleColor};display:flex;align-items:center;
                                            justify-content:center;font-size:0.78rem;font-weight:700;
                                            transition:all 0.25s ease;
                                            box-shadow:${isActive ? '0 0 0 4px rgba(79,70,229,0.12)' : 'none'};">
                                    ${isDone ? '<i class="fas fa-check" style="font-size:0.65rem;"></i>' : num}
                                </div>
                                <div style="font-size:0.65rem;color:${labelColor};font-weight:${labelWeight};
                                            text-align:center;line-height:1.2;white-space:nowrap;
                                            overflow:hidden;text-overflow:ellipsis;max-width:70px;">
                                    ${s.name}
                                </div>
                            </div>`;
        }).join('')}
                </div>
            </div>`;
    },

    // ── STEP 1: Select Company & Period ───────────────────────────────────────
    renderStepCompanySelection: function () {
        const companies = window.DB.companies || [];
        const defaultPeriod = this.payrollData.period
            || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return `
            <div style="max-width:600px;margin:0 auto;">
                <p style="color:var(--gray-600);margin-bottom:24px;">
                    Select the company and payroll period to begin processing.
                </p>

                <div class="form-group">
                    <label class="form-label">Payroll Type</label>
                    <select class="form-control" id="wizard_payroll_type"
                        onchange="PayrollWizard.payrollData.type = this.value; PayrollWizard.updateTypeNotice(this.value)">
                        <option value="regular">Regular Monthly Payroll</option>
                        <option value="bonus">13th Cheque / Annual Bonus Run</option>
                        <option value="retro">Retroactive Pay Adjustment</option>
                        <option value="correction">Correction Payroll</option>
                        <option value="termination">Termination Payroll</option>
                        <option value="adhoc">Ad-Hoc Payment</option>
                    </select>
                </div>

                <div id="payrollTypeNotice"></div>

                <div class="form-group">
                    <label class="form-label">Company <span style="color:var(--danger)">*</span></label>
                    <select class="form-control" id="wizard_company"
                        onchange="PayrollWizard.selectCompany(this.value)">
                        <option value="">— Select Company —</option>
                        ${companies.map(c => `<option value="${c.id}"
                            ${this.payrollData.companyId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Payroll Period <span style="color:var(--danger)">*</span></label>
                    <select class="form-control" id="wizard_period"
                        onchange="PayrollWizard.payrollData.period = this.value">
                        ${this._periodOptions(defaultPeriod)}
                    </select>
                </div>

                <div id="companyEmployeeNotice" class="alert alert-info"
                    style="margin-top:16px;display:${this.payrollData.companyId ? 'block' : 'none'};">
                    <i class="fas fa-info-circle"></i>
                    <strong>${this.payrollData.companyName || ''}</strong>
                    has ${this.payrollData.companyId ? this.getEmployeeCount() : 0} active employees.
                </div>
            </div>`;
    },

    updateTypeNotice: function (type) {
        const notices = {
            bonus: `<div class="alert alert-warning" style="margin-bottom:12px;"><i class="fas fa-info-circle"></i> <strong>13th Cheque / Bonus:</strong> PAYE will be calculated using the directive (annual equivalent) method. UIF and SDL do not apply to pure bonus payments.</div>`,
            retro: `<div class="alert alert-info" style="margin-bottom:12px;"><i class="fas fa-history"></i> <strong>Retro Pay:</strong> Enter the back-pay amount per employee. PAYE will be calculated on the difference only.</div>`,
            termination: `<div class="alert alert-danger" style="margin-bottom:12px;"><i class="fas fa-sign-out-alt"></i> <strong>Termination Payroll:</strong> Includes pro-rata salary, outstanding leave payout, and notice pay.</div>`,
        };
        const el = document.getElementById('payrollTypeNotice');
        if (el) el.innerHTML = notices[type] || '';
    },

    // ── STEP 2: Collect Inputs ────────────────────────────────────────────────
    renderStepCollectInputs: function () {
        const employees = this.getCompanyEmployees();
        const isBonus = this.payrollData.type === 'bonus';
        const isRetro = this.payrollData.type === 'retro';

        return `
            <p style="color:var(--gray-600);margin-bottom:16px;">
                Review employee data and add any bonuses, deductions, or adjustments.
            </p>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Position</th>
                            <th class="text-right">Basic Salary</th>
                            <th class="text-right">${isBonus ? '13th Cheque / Bonus' : isRetro ? 'Retro Pay' : 'Bonus'}</th>
                            <th class="text-right">Add. Deduction</th>
                            <th class="text-right">Garnishee</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(emp => {
            const garnishees = (emp.deductions || []).filter(d => d.type === 'Garnishee');
            const totalGarnishee = garnishees.reduce((s, g) => s + (g.amount || 0), 0);
            const defaultBonus = isBonus ? (emp.basicSalary || 0) : 0;
            return `
                                <tr>
                                    <td style="font-weight:500;">${emp.firstName} ${emp.lastName}</td>
                                    <td style="font-size:0.82rem;color:var(--gray-500);">${emp.position || '—'}</td>
                                    <td class="text-right">${window.formatCurrency(emp.basicSalary || 0)}</td>
                                    <td class="text-right">
                                        <input type="number" class="form-control"
                                            style="width:120px;text-align:right;"
                                            value="${defaultBonus}" id="bonus_${emp.id}">
                                    </td>
                                    <td class="text-right">
                                        <input type="number" class="form-control"
                                            style="width:110px;text-align:right;"
                                            value="0" id="deduction_${emp.id}">
                                    </td>
                                    <td class="text-right">
                                        <input type="number" class="form-control"
                                            style="width:100px;text-align:right;"
                                            value="${totalGarnishee}" id="garnishee_${emp.id}">
                                    </td>
                                    <td><span class="badge badge-success">Active</span></td>
                                </tr>`;
        }).join('')}
                    </tbody>
                </table>
            </div>
            ${isBonus ? '<div class="alert alert-warning" style="margin-top:12px;"><i class="fas fa-info-circle"></i> Bonus amounts default to 1× basic salary. Adjust as needed.</div>' : ''}
            ${isRetro ? '<div class="alert alert-info" style="margin-top:12px;"><i class="fas fa-history"></i> Enter the back-pay amount per employee.</div>' : ''}`;
    },

    // ── STEP 3: Validate ──────────────────────────────────────────────────────
    renderStepValidation: function () {
        const validation = PayrollValidation.validatePayrollRun(this.payrollData);
        this.payrollData.errors = validation.errors;
        this.payrollData.warnings = validation.warnings;
        const hasErrors = validation.errors.length > 0;
        const hasWarnings = validation.warnings.length > 0;

        return `
            <p style="color:var(--gray-600);margin-bottom:16px;">Validating employee data…</p>
            ${hasErrors ? `
                <div class="alert alert-danger" style="margin-bottom:16px;">
                    <h4><i class="fas fa-exclamation-circle"></i> Critical Errors (${validation.errors.length})</h4>
                    <ul style="margin:8px 0 0 20px;">
                        ${validation.errors.map(e => `<li><strong>${e.employee}:</strong> ${e.message}</li>`).join('')}
                    </ul>
                </div>` : `<div class="alert alert-success"><i class="fas fa-check-circle"></i> No critical errors found.</div>`}
            ${hasWarnings ? `
                <div class="alert alert-warning">
                    <h4><i class="fas fa-exclamation-triangle"></i> Warnings (${validation.warnings.length})</h4>
                    <ul style="margin:8px 0 0 20px;">
                        ${validation.warnings.map(w => `<li><strong>${w.employee}:</strong> ${w.message}</li>`).join('')}
                    </ul>
                </div>` : ''}
            ${!hasErrors && !hasWarnings ? `<div class="alert alert-success"><i class="fas fa-check-circle"></i> All validation checks passed!</div>` : ''}`;
    },

    // ── STEP 4: Calculation ───────────────────────────────────────────────────
    renderStepCalculation: function () {
        const employees = this.getCompanyEmployees();
        const isBonus = this.payrollData.type === 'bonus';
        const isRetro = this.payrollData.type === 'retro';

        const calculations = employees.map(emp => {
            const bonus = parseFloat(document.getElementById(`bonus_${emp.id}`)?.value || 0);
            const deduction = parseFloat(document.getElementById(`deduction_${emp.id}`)?.value || 0);
            const garnishee = parseFloat(document.getElementById(`garnishee_${emp.id}`)?.value || 0);
            const basic = emp.basicSalary || 0;
            const allowances = Object.values(emp.allowances || {}).reduce((s, v) => s + v, 0);
            const pensionContrib = (basic * ((emp.benefits?.pensionPercent) || 5)) / 100;
            const age = (emp.dateOfBirth && window.TaxCalc) ? window.TaxCalc.calculateAge(emp.dateOfBirth) : 30;
            const medMembers = emp.benefits?.medicalMembers || 0;
            let paye, uif, sdl, gross, totalDeductions, net;

            if (isBonus) {
                gross = bonus; paye = window.TaxCalc ? window.TaxCalc.calculateBonusPAYE(basic, bonus, age, medMembers) : gross * 0.25;
                uif = 0; sdl = 0; totalDeductions = paye + deduction + garnishee; net = gross - totalDeductions;
            } else if (isRetro) {
                gross = basic + allowances + bonus;
                const regPAYE = window.TaxCalc ? window.TaxCalc.calculatePAYE(basic + allowances - pensionContrib, age, medMembers) : (basic + allowances) * 0.25;
                const retroPAYE = window.TaxCalc ? window.TaxCalc.calculateBonusPAYE(basic + allowances, bonus, age, medMembers) / 12 : bonus * 0.25;
                paye = regPAYE + retroPAYE;
                uif = Math.min(gross * 0.01, 177.12); sdl = gross * 0.01;
                totalDeductions = paye + uif + deduction + garnishee + pensionContrib; net = gross - totalDeductions;
            } else {
                gross = basic + allowances + bonus;
                paye = window.TaxCalc ? window.TaxCalc.calculatePAYE(gross - pensionContrib, age, medMembers) : gross * 0.25;
                uif = Math.min(gross * 0.01, 177.12); sdl = gross * 0.01;
                totalDeductions = paye + uif + deduction + garnishee + pensionContrib; net = gross - totalDeductions;
            }

            return { employeeId: emp.id, employeeName: `${emp.firstName} ${emp.lastName}`, basic, allowances, bonus, gross, paye, uif, sdl, pension: isBonus ? 0 : pensionContrib, medical: emp.benefits?.medicalContribution || 0, garnishee, deduction, totalDeductions, net, companyName: emp.companyName || this.payrollData.companyName };
        });

        this.payrollData.calculations = calculations;
        const totals = calculations.reduce((a, c) => ({ gross: a.gross + c.gross, paye: a.paye + c.paye, uif: a.uif + c.uif, net: a.net + c.net }), { gross: 0, paye: 0, uif: 0, net: 0 });

        const kpiCards = [
            { label: 'Total Gross', value: window.formatCurrency(totals.gross), accent: '#4F46E5' },
            { label: 'Total PAYE', value: window.formatCurrency(totals.paye), accent: '#DC2626' },
            { label: 'Total UIF', value: window.formatCurrency(totals.uif), accent: '#D97706' },
            { label: 'Total Net', value: window.formatCurrency(totals.net), accent: '#059669' },
        ];

        return `
            <p style="color:var(--gray-600);margin-bottom:16px;">
                Payroll calculated for <strong>${calculations.length}</strong> employees.
            </p>
            <div class="grid-4" style="margin-bottom:24px;">
                ${kpiCards.map(c => `
                    <div style="background:#fff;border:1px solid var(--gray-200);border-radius:10px;
                                padding:16px;border-left:4px solid ${c.accent};box-shadow:var(--shadow-sm);">
                        <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--gray-500);margin-bottom:6px;">${c.label}</div>
                        <div style="font-size:1.3rem;font-weight:800;color:var(--gray-900);">${c.value}</div>
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
                            <th class="text-right">Deductions</th>
                            <th class="text-right">Net Pay</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${calculations.map(c => `
                            <tr>
                                <td>${c.employeeName}</td>
                                <td class="text-right">${window.formatCurrency(c.gross)}</td>
                                <td class="text-right text-danger">${window.formatCurrency(c.paye)}</td>
                                <td class="text-right text-warning">${window.formatCurrency(c.uif)}</td>
                                <td class="text-right text-danger">${window.formatCurrency(c.totalDeductions)}</td>
                                <td class="text-right" style="font-weight:600;color:var(--success);">${window.formatCurrency(c.net)}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    // ── STEP 5: Variances ─────────────────────────────────────────────────────
    renderStepVariances: function () {
        const variances = VarianceAnalysis.analyzeVariances(this.payrollData);
        this.payrollData.variances = variances;

        return `
            <p style="color:var(--gray-600);margin-bottom:16px;">
                Comparing current payroll with the previous month.
            </p>
            ${variances.length === 0 ? `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No previous payroll found for comparison, or no significant variances detected.
                </div>` : `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th><th>Field</th>
                                <th class="text-right">Previous</th><th class="text-right">Current</th>
                                <th class="text-right">Variance</th><th>Severity</th>
                            </tr>
                        </thead>
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

    // ── STEP 6: Approval ──────────────────────────────────────────────────────
    renderStepApproval: function () {
        const total = (this.payrollData.calculations || []).reduce((s, c) => s + c.net, 0);
        return `
            <div style="max-width:600px;margin:0 auto;">
                <p style="color:var(--gray-600);margin-bottom:24px;">
                    Send payroll to client for approval before finalizing.
                </p>
                <div class="alert alert-info">
                    <h4><i class="fas fa-info-circle"></i> Approval Required</h4>
                    <p>This payroll will be sent to <strong>${this.payrollData.companyName}</strong> for approval.</p>
                </div>
                <div class="form-group">
                    <label class="form-label">Approval Notes (Optional)</label>
                    <textarea class="form-control" rows="4" id="approval_notes"
                        placeholder="Add notes for the client…"></textarea>
                </div>
                <div style="background:var(--gray-50);padding:16px;border-radius:8px;margin-top:16px;">
                    <h5 style="margin-bottom:12px;">Payroll Summary</h5>
                    <div class="grid-2">
                        <div>
                            <div style="color:var(--gray-500);font-size:0.85rem;">Employees</div>
                            <div style="font-weight:600;">${(this.payrollData.calculations || []).length}</div>
                        </div>
                        <div>
                            <div style="color:var(--gray-500);font-size:0.85rem;">Total Net Pay</div>
                            <div style="font-weight:600;color:var(--success);">${window.formatCurrency(total)}</div>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-primary" style="width:100%;margin-top:16px;"
                    onclick="PayrollWizard.sendForApproval()">
                    <i class="fas fa-paper-plane"></i> Send for Approval
                </button>
            </div>`;
    },

    // ── STEP 7: Finalize ──────────────────────────────────────────────────────
    renderStepFinalize: function () {
        return `
            <div style="max-width:600px;margin:0 auto;">
                <div class="alert alert-warning">
                    <h4><i class="fas fa-exclamation-triangle"></i> Warning: Finalization</h4>
                    <p>Finalizing this payroll will:</p>
                    <ul style="margin:8px 0 0 20px;">
                        <li><strong>Lock the payroll</strong> — No further edits</li>
                        <li><strong>Generate payslips</strong> — All employees</li>
                        <li><strong>Create audit log</strong> — All actions recorded</li>
                    </ul>
                    <p style="margin-top:12px;margin-bottom:0;"><strong>This action cannot be undone without creating a correction payroll.</strong></p>
                </div>
                <div class="form-group" style="margin-top:16px;">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="confirm_finalize"
                            onchange="document.getElementById('finalizeBtn').disabled = !this.checked;">
                        I confirm I want to finalize and lock this payroll
                    </label>
                </div>
                <button type="button" class="btn btn-primary" style="width:100%;margin-top:8px;"
                    onclick="PayrollWizard.finalizePayroll()" id="finalizeBtn" disabled>
                    <i class="fas fa-lock"></i> Finalize &amp; Lock Payroll
                </button>
            </div>`;
    },

    // ── STEP 8: Bank File ─────────────────────────────────────────────────────
    renderStepBankFile: function () {
        return `
            <div style="max-width:600px;margin:0 auto;">
                <div class="alert alert-success">
                    <h4><i class="fas fa-check-circle"></i> Payroll Finalized!</h4>
                    <p style="margin-bottom:0;">The payroll has been finalized and locked. Generate the bank file for payment processing.</p>
                </div>
                <div class="form-group" style="margin-top:16px;">
                    <label class="form-label">Bank File Format</label>
                    <select class="form-control" id="bank_format">
                        <option value="csv">Generic CSV</option>
                        <option value="standard_bank">Standard Bank</option>
                        <option value="absa">ABSA</option>
                        <option value="fnb">FNB</option>
                        <option value="nedbank">Nedbank</option>
                    </select>
                </div>
                <button type="button" class="btn btn-primary" style="width:100%;margin-bottom:12px;"
                    onclick="PayrollWizard.generateBankFile()">
                    <i class="fas fa-file-download"></i> Generate Bank File
                </button>
                <button type="button" class="btn btn-outline" style="width:100%;"
                    onclick="PayrollWizard.complete()">
                    <i class="fas fa-check"></i> Complete &amp; Return to Dashboard
                </button>
            </div>`;
    },

    // ── Helpers ───────────────────────────────────────────────────────────────
    selectCompany: function (companyId) {
        const company = window.DB.companies.find(c => c.id == companyId);
        if (company) {
            this.payrollData.companyId = company.id;
            this.payrollData.companyName = company.name;
            const notice = document.getElementById('companyEmployeeNotice');
            if (notice) {
                notice.innerHTML = `<i class="fas fa-info-circle"></i> <strong>${company.name}</strong> has ${this.getEmployeeCount()} active employees.`;
                notice.style.display = 'block';
            }
        } else {
            this.payrollData.companyId = null;
            this.payrollData.companyName = '';
            const notice = document.getElementById('companyEmployeeNotice');
            if (notice) notice.style.display = 'none';
        }
    },

    getEmployeeCount: function () {
        return window.DB.employees.filter(e =>
            e.companyName === this.payrollData.companyName && e.status === 'Active'
        ).length;
    },

    getCompanyEmployees: function () {
        return window.DB.employees.filter(e =>
            e.companyName === this.payrollData.companyName && e.status === 'Active'
        );
    },

    nextStep: function () {
        if (this.currentStep === 1) {
            if (!this.payrollData.companyId) { window.Toast.show('Please select a company', 'warning'); return; }
            // Read period from dropdown
            const periodEl = document.getElementById('wizard_period');
            if (periodEl) this.payrollData.period = periodEl.value;
            if (!this.payrollData.period) { window.Toast.show('Please select a payroll period', 'warning'); return; }
        }
        if (this.currentStep === 3 && this.payrollData.errors?.length > 0) {
            window.Toast.show('Fix critical errors before proceeding', 'warning'); return;
        }
        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.render(document.getElementById('content'));
        } else {
            this.complete();
        }
    },

    previousStep: function () {
        if (this.currentStep > 1) { this.currentStep--; this.render(document.getElementById('content')); }
    },

    sendForApproval: async function () {
        const companyId = this.payrollData.companyId;
        const company = window.DB.companies.find(c => c.id == companyId);

        if (!company || !company.email) {
            window.Toast.show('Company email is missing. Please edit the company details first to add an email address.', 'warning');
            return;
        }

        const btn = document.querySelector('#wizardStepContent button.btn-primary');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Email...';
            btn.disabled = true;
        }

        const totalNet = (this.payrollData.calculations || []).reduce((s, c) => s + c.net, 0);
        const notes = document.getElementById('approval_notes')?.value || '';

        try {
            const userStr = localStorage.getItem('hrpms_user');
            const token = userStr ? JSON.parse(userStr).token : '';

            const response = await fetch('api/mail.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Token': token
                },
                body: JSON.stringify({
                    companyEmail: company.email,
                    companyName: company.name,
                    period: this.payrollData.period,
                    totalNet: window.formatCurrency(totalNet),
                    notes: notes
                })
            });

            const result = await response.json();
            if (result.status === 'success') {
                window.Toast.show(`Approval email successfully sent to ${company.email}`, 'success');
                this.nextStep();
            } else {
                window.Toast.show(result.error || 'Failed to send email', 'danger');
            }
        } catch (err) {
            console.error(err);
            window.Toast.show('Network error while sending email.', 'danger');
        } finally {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send for Approval';
                btn.disabled = false;
            }
        }
    },

    finalizePayroll: function () {
        const run = {
            id: window.DB.payrollRuns.length + 1,
            company: this.payrollData.companyName,
            companyId: this.payrollData.companyId,
            period: this.payrollData.period,
            type: this.payrollData.type,
            status: 'Finalized',
            statusColor: 'primary',
            createdBy: window.currentUser?.name || 'Admin User',
            createdDate: new Date().toISOString(),
            finalizedBy: window.currentUser?.name || 'Admin User',
            finalizedDate: new Date().toISOString(),
            locked: true,
            version: 1,
            totalGross: this.payrollData.calculations.reduce((s, c) => s + c.gross, 0),
            totalNet: this.payrollData.calculations.reduce((s, c) => s + c.net, 0),
            totalPAYE: this.payrollData.calculations.reduce((s, c) => s + c.paye, 0),
            totalUIF: this.payrollData.calculations.reduce((s, c) => s + c.uif, 0),
            employeeCount: this.payrollData.calculations.length,
            errors: [],
            warnings: this.payrollData.warnings || [],
            variances: this.payrollData.variances || [],
            lines: this.payrollData.calculations
        };

        window.DB.payrollRuns.push(run);
        this.payrollData.runId = run.id;

        this.payrollData.calculations.forEach(calc => {
            window.DB.payslips.push({
                id: `RUN_${run.id}_EMP_${calc.employeeId}`,
                runId: run.id,
                employeeId: calc.employeeId,
                period: this.payrollData.period,
                companyName: this.payrollData.companyName,
                ...calc
            });
        });

        if (!window.DB.auditLogs) window.DB.auditLogs = [];
        window.DB.auditLogs.push({
            id: window.DB.auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            user: window.currentUser?.name || 'Admin User',
            action: 'Payroll Finalized', module: 'Payroll',
            details: { runId: run.id, company: this.payrollData.companyName, period: this.payrollData.period }
        });

        window.DB.save();
        window.Toast.show('Payroll finalized and locked', 'success');
        this.nextStep();
    },

    generateBankFile: function () {
        const format = document.getElementById('bank_format').value;
        BankFileGenerator.generateFile(this.payrollData.runId, format);
    },

    complete: function () {
        window.Toast.show('Payroll process completed!', 'success');
        if (typeof loadPage === 'function') loadPage('dashboard');
    },

    cancel: function () {
        window.showConfirmation('Cancel Wizard?', 'Are you sure? All progress will be lost.', () => {
            if (typeof loadPage === 'function') loadPage('payroll');
        });
    }
};

window.PayrollWizard = PayrollWizard;