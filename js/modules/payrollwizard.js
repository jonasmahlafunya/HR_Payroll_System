
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
        { id: 1, name: 'Select Company & Period', icon: 'building', component: 'renderStepCompanySelection' },
        { id: 2, name: 'Collect Inputs', icon: 'clipboard-list', component: 'renderStepCollectInputs' },
        { id: 3, name: 'Validate Data', icon: 'check-circle', component: 'renderStepValidation' },
        { id: 4, name: 'Run Calculation', icon: 'calculator', component: 'renderStepCalculation' },
        { id: 5, name: 'Review Variances', icon: 'chart-line', component: 'renderStepVariances' },
        { id: 6, name: 'Client Approval', icon: 'user-check', component: 'renderStepApproval' },
        { id: 7, name: 'Finalize & Lock', icon: 'lock', component: 'renderStepFinalize' },
        { id: 8, name: 'Generate Bank File', icon: 'file-download', component: 'renderStepBankFile' }
    ],

    start: function () {
        this.currentStep = 1;
        this.payrollData = {
            runId: null,
            companyId: null,
            companyName: null,
            period: null,
            type: 'regular',
            employees: [],
            errors: [],
            warnings: [],
            variances: []
        };
        this.render(document.getElementById('content'));
    },

    render: function (container) {
        const step = this.steps[this.currentStep - 1];

        const html = `
      <div class="payroll-wizard">
        <!-- Progress Bar -->
        <div class="wizard-progress">
          <div class="progress-bar">
            ${this.renderProgressBar()}
          </div>
        </div>

        <!-- Step Content -->
        <div class="wizard-content card" style="margin-top: 24px;">
          <div class="card-header">
            <h3 class="card-title">
              <i class="fas fa-${step.icon}"></i> Step ${this.currentStep}: ${step.name}
            </h3>
          </div>
          <div class="card-body" id="wizardStepContent">
            ${this[step.component]()}
          </div>
          <div class="card-footer" style="display: flex; justify-content: space-between; padding: 16px;">
            <button class="btn btn-outline" onclick="PayrollWizard.previousStep()" ${this.currentStep === 1 ? 'disabled' : ''}>
              <i class="fas fa-arrow-left"></i> Previous
            </button>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline" onclick="PayrollWizard.cancel()">
                <i class="fas fa-times"></i> Cancel
              </button>
              <button class="btn btn-primary" onclick="PayrollWizard.nextStep()" id="wizardNextBtn">
                ${this.currentStep === this.maxSteps ? 'Complete' : 'Next'} <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

        container.innerHTML = html;
    },

    renderProgressBar: function () {
        const progress = (this.currentStep / this.maxSteps) * 100;

        return `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        ${this.steps.map((step, index) => {
            const isActive = index + 1 === this.currentStep;
            const isCompleted = index + 1 < this.currentStep;
            const stepClass = isCompleted ? 'completed' : (isActive ? 'active' : 'pending');

            return `
            <div class="progress-step ${stepClass}" style="flex: 1; text-align: center;">
              <div style="width: 32px; height: 32px; border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; 
                background: ${isCompleted ? 'var(--success)' : (isActive ? 'var(--primary)' : 'var(--gray-200)')}; 
                color: ${isCompleted || isActive ? 'white' : 'var(--gray-500)'};">
                ${isCompleted ? '<i class="fas fa-check"></i>' : (index + 1)}
              </div>
              <div style="font-size: 0.7rem; color: ${isActive ? 'var(--primary)' : 'var(--gray-500)'}; font-weight: ${isActive ? '600' : '400'};">
                ${step.name}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="width: 100%; height: 8px; background: var(--gray-200); border-radius: 4px; overflow: hidden;">
        <div style="width: ${progress}%; height: 100%; background: var(--primary); transition: width 0.3s ease;"></div>
      </div>
    `;
    },

    // STEP 1: Select Company & Period
    renderStepCompanySelection: function () {
        const companies = window.DB.companies || [];
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return `
      <div style="max-width: 600px; margin: 0 auto;">
        <p style="color: var(--gray-600); margin-bottom: 24px;">
          Select the company and payroll period to begin processing.
        </p>

        <div class="form-group">
          <label class="form-label">Payroll Type</label>
          <select class="form-control" id="wizard_payroll_type" onchange="PayrollWizard.payrollData.type = this.value">
            <option value="regular">Regular Monthly Payroll</option>
            <option value="bonus">Bonus-Only Payroll</option>
            <option value="correction">Correction Payroll</option>
            <option value="termination">Termination Payroll</option>
            <option value="adhoc">Ad-Hoc Payment</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Company *</label>
          <select class="form-control" id="wizard_company" onchange="PayrollWizard.selectCompany(this.value)">
            <option value="">-- Select Company --</option>
            ${companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Payroll Period *</label>
          <input type="text" class="form-control" id="wizard_period" value="${currentMonth}" 
                 onchange="PayrollWizard.payrollData.period = this.value">
        </div>

        ${this.payrollData.companyId ? `
          <div class="alert alert-info" style="margin-top: 16px;">
            <i class="fas fa-info-circle"></i>
            <strong>${this.payrollData.companyName}</strong> has ${this.getEmployeeCount()} active employees.
          </div>
        ` : ''}
      </div>
    `;
    },

    // STEP 2: Collect Inputs
    renderStepCollectInputs: function () {
        const employees = this.getCompanyEmployees();

        return `
      <div>
        <p style="color: var(--gray-600); margin-bottom: 16px;">
          Review employee data and add any bonuses, deductions, or adjustments.
        </p>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Position</th>
                <th class="text-right">Basic Salary</th>
                <th class="text-right">Bonus</th>
                <th class="text-right">Deductions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${employees.map(emp => `
                <tr>
                  <td>${emp.firstName} ${emp.lastName}</td>
                  <td>${emp.position || 'N/A'}</td>
                  <td class="text-right">${window.formatCurrency(emp.basicSalary || 0)}</td>
                  <td class="text-right">
                    <input type="number" class="form-control" style="width: 120px; text-align: right;" 
                           value="0" id="bonus_${emp.id}" placeholder="0.00">
                  </td>
                  <td class="text-right">
                    <input type="number" class="form-control" style="width: 120px; text-align: right;" 
                           value="0" id="deduction_${emp.id}" placeholder="0.00">
                  </td>
                  <td>
                    <span class="badge badge-success">Active</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    },

    // STEP 3: Validate Data
    renderStepValidation: function () {
        // Run validation
        const validation = PayrollValidation.validatePayrollRun(this.payrollData);
        this.payrollData.errors = validation.errors;
        this.payrollData.warnings = validation.warnings;

        const hasErrors = validation.errors.length > 0;
        const hasWarnings = validation.warnings.length > 0;

        return `
      <div>
        <p style="color: var(--gray-600); margin-bottom: 16px;">
          Validating employee data for errors and warnings...
        </p>

        ${hasErrors ? `
          <div class="alert alert-danger" style="margin-bottom: 16px;">
            <h4><i class="fas fa-exclamation-circle"></i> Critical Errors (${validation.errors.length})</h4>
            <p>The following errors must be fixed before proceeding:</p>
            <ul style="margin: 8px 0 0 20px;">
              ${validation.errors.map(err => `
                <li><strong>${err.employee}:</strong> ${err.message}</li>
              `).join('')}
            </ul>
          </div>
        ` : `
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i> No critical errors found!
          </div>
        `}

        ${hasWarnings ? `
          <div class="alert alert-warning">
            <h4><i class="fas fa-exclamation-triangle"></i> Warnings (${validation.warnings.length})</h4>
            <p>The following warnings were detected. You can proceed with caution:</p>
            <ul style="margin: 8px 0 0 20px;">
              ${validation.warnings.map(warn => `
                <li><strong>${warn.employee}:</strong> ${warn.message} - <em>${warn.action}</em></li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${!hasErrors && !hasWarnings ? `
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i> All validation checks passed! Ready to calculate payroll.
          </div>
        ` : ''}
      </div>
    `;
    },

    // STEP 4: Run Calculation
    renderStepCalculation: function () {
        // Calculate payroll for all employees
        const employees = this.getCompanyEmployees();
        const calculations = employees.map(emp => {
            const bonus = parseFloat(document.getElementById(`bonus_${emp.id}`)?.value || 0);
            const deduction = parseFloat(document.getElementById(`deduction_${emp.id}`)?.value || 0);

            const basic = emp.basicSalary || 0;
            const allowances = Object.values(emp.allowances || {}).reduce((sum, val) => sum + val, 0);
            const gross = basic + allowances + bonus;

            // Calculate PAYE (simplified)
            const paye = gross * 0.25; // Simplified tax calculation
            const uif = Math.min(gross * 0.01, 177.12); // UIF capped
            const totalDeductions = paye + uif + deduction;
            const net = gross - totalDeductions;

            return {
                employeeId: emp.id,
                employeeName: `${emp.firstName} ${emp.lastName}`,
                basic,
                allowances,
                bonus,
                gross,
                paye,
                uif,
                deduction,
                totalDeductions,
                net
            };
        });

        this.payrollData.calculations = calculations;

        const totals = calculations.reduce((acc, calc) => ({
            gross: acc.gross + calc.gross,
            paye: acc.paye + calc.paye,
            uif: acc.uif + calc.uif,
            net: acc.net + calc.net
        }), { gross: 0, paye: 0, uif: 0, net: 0 });

        return `
      <div>
        <p style="color: var(--gray-600); margin-bottom: 16px;">
          Payroll calculations completed for ${calculations.length} employees.
        </p>

        <div class="metrics-grid" style="margin-bottom: 24px;">
          <div class="metric-card">
            <div class="metric-label">Total Gross</div>
            <div class="metric-value">${window.formatCurrency(totals.gross)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total PAYE</div>
            <div class="metric-value">${window.formatCurrency(totals.paye)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total UIF</div>
            <div class="metric-value">${window.formatCurrency(totals.uif)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Net</div>
            <div class="metric-value" style="color: var(--success);">${window.formatCurrency(totals.net)}</div>
          </div>
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
              ${calculations.map(calc => `
                <tr>
                  <td>${calc.employeeName}</td>
                  <td class="text-right">${window.formatCurrency(calc.gross)}</td>
                  <td class="text-right">${window.formatCurrency(calc.paye)}</td>
                  <td class="text-right">${window.formatCurrency(calc.uif)}</td>
                  <td class="text-right">${window.formatCurrency(calc.totalDeductions)}</td>
                  <td class="text-right" style="font-weight: 600;">${window.formatCurrency(calc.net)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    },

    // STEP 5: Review Variances
    renderStepVariances: function () {
        const variances = VarianceAnalysis.analyzeVariances(this.payrollData);
        this.payrollData.variances = variances;

        return `
      <div>
        <p style="color: var(--gray-600); margin-bottom: 16px;">
          Comparing current payroll with previous month to detect significant changes.
        </p>

        ${variances.length === 0 ? `
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i> No previous payroll found for comparison, or no significant variances detected.
          </div>
        ` : `
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Field</th>
                  <th class="text-right">Previous</th>
                  <th class="text-right">Current</th>
                  <th class="text-right">Variance</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                ${variances.map(v => `
                  <tr>
                    <td>${v.employee}</td>
                    <td>${v.field}</td>
                    <td class="text-right">${window.formatCurrency(v.previous)}</td>
                    <td class="text-right">${window.formatCurrency(v.current)}</td>
                    <td class="text-right" style="color: ${v.variance.includes('-') ? 'var(--danger)' : 'var(--success)'};">
                      ${v.variance}
                    </td>
                    <td>
                      <span class="badge badge-${v.severity === 'high' ? 'danger' : 'warning'}">
                        ${v.severity.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
    },

    // STEP 6: Client Approval
    renderStepApproval: function () {
        return `
      <div style="max-width: 600px; margin: 0 auto;">
        <p style="color: var(--gray-600); margin-bottom: 24px;">
          Send payroll to client for approval before finalizing.
        </p>

        <div class="alert alert-info">
          <h4><i class="fas fa-info-circle"></i> Approval Required</h4>
          <p>This payroll will be sent to <strong>${this.payrollData.companyName}</strong> for approval.</p>
          <p style="margin-bottom: 0;">Once approved, you can proceed to finalize and lock the payroll.</p>
        </div>

        <div class="form-group">
          <label class="form-label">Approval Notes (Optional)</label>
          <textarea class="form-control" rows="4" id="approval_notes" 
                    placeholder="Add any notes for the client..."></textarea>
        </div>

        <div style="background: var(--gray-50); padding: 16px; border-radius: 8px; margin-top: 16px;">
          <h5 style="margin-bottom: 12px;">Payroll Summary</h5>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <div style="color: var(--gray-500); font-size: 0.85rem;">Employees</div>
              <div style="font-weight: 600;">${this.payrollData.calculations?.length || 0}</div>
            </div>
            <div>
              <div style="color: var(--gray-500); font-size: 0.85rem;">Total Net Pay</div>
              <div style="font-weight: 600; color: var(--success);">
                ${window.formatCurrency(this.payrollData.calculations?.reduce((sum, c) => sum + c.net, 0) || 0)}
              </div>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" 
                onclick="PayrollWizard.sendForApproval()">
          <i class="fas fa-paper-plane"></i> Send for Approval
        </button>
      </div>
    `;
    },

    // STEP 7: Finalize & Lock
    renderStepFinalize: function () {
        return `
      <div style="max-width: 600px; margin: 0 auto;">
        <div class="alert alert-warning">
          <h4><i class="fas fa-exclamation-triangle"></i> Warning: Finalization</h4>
          <p>Finalizing this payroll will:</p>
          <ul style="margin: 8px 0 0 20px;">
            <li><strong>Lock the payroll</strong> - No further edits allowed</li>
            <li><strong>Generate payslips</strong> - Payslips will be created for all employees</li>
            <li><strong>Create audit log</strong> - All actions will be recorded</li>
          </ul>
          <p style="margin-top: 12px; margin-bottom: 0;">
            <strong>This action cannot be undone without creating a correction payroll.</strong>
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">
            <input type="checkbox" id="confirm_finalize" style="margin-right: 8px;">
            I confirm that I want to finalize and lock this payroll
          </label>
        </div>

        <button class="btn btn-primary" style="width: 100%;" 
                onclick="PayrollWizard.finalizePayroll()" id="finalizeBtn" disabled>
          <i class="fas fa-lock"></i> Finalize & Lock Payroll
        </button>

        <script>
          document.getElementById('confirm_finalize').addEventListener('change', function() {
            document.getElementById('finalizeBtn').disabled = !this.checked;
          });
        </script>
      </div>
    `;
    },

    // STEP 8: Generate Bank File
    renderStepBankFile: function () {
        return `
      <div style="max-width: 600px; margin: 0 auto;">
        <div class="alert alert-success">
          <h4><i class="fas fa-check-circle"></i> Payroll Finalized!</h4>
          <p style="margin-bottom: 0;">The payroll has been successfully finalized and locked. You can now generate the bank file for payment processing.</p>
        </div>

        <div class="form-group">
          <label class="form-label">Bank File Format</label>
          <select class="form-control" id="bank_format">
            <option value="csv">Generic CSV</option>
            <option value="standard_bank">Standard Bank</option>
            <option value="absa">ABSA</option>
            <option value="fnb">FNB</option>
            <option value="nedbank">Nedbank</option>
          </select>
        </div>

        <button class="btn btn-primary" style="width: 100%; margin-bottom: 12px;" 
                onclick="PayrollWizard.generateBankFile()">
          <i class="fas fa-file-download"></i> Generate Bank File
        </button>

        <button class="btn btn-outline" style="width: 100%;" 
                onclick="PayrollWizard.complete()">
          <i class="fas fa-check"></i> Complete & Return to Dashboard
        </button>
      </div>
    `;
    },

    // Helper Methods
    selectCompany: function (companyId) {
        const company = window.DB.companies.find(c => c.id == companyId);
        if (company) {
            this.payrollData.companyId = company.id;
            this.payrollData.companyName = company.name;
            this.render(document.getElementById('content'));
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
        // Validation before moving to next step
        if (this.currentStep === 1) {
            if (!this.payrollData.companyId || !this.payrollData.period) {
                window.Toast.show('Please select a company and period', 'warning');
                return;
            }
        }

        if (this.currentStep === 3) {
            // Check for critical errors
            if (this.payrollData.errors && this.payrollData.errors.length > 0) {
                window.Toast.show('Fix critical errors before proceeding', 'error');
                return;
            }
        }

        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.render(document.getElementById('content'));
        } else {
            this.complete();
        }
    },

    previousStep: function () {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.render(document.getElementById('content'));
        }
    },

    sendForApproval: function () {
        window.Toast.show('Payroll sent for client approval', 'success');
        this.nextStep();
    },

    finalizePayroll: function () {
        // Create payroll run
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
            totalGross: this.payrollData.calculations.reduce((sum, c) => sum + c.gross, 0),
            totalNet: this.payrollData.calculations.reduce((sum, c) => sum + c.net, 0),
            totalPAYE: this.payrollData.calculations.reduce((sum, c) => sum + c.paye, 0),
            totalUIF: this.payrollData.calculations.reduce((sum, c) => sum + c.uif, 0),
            employeeCount: this.payrollData.calculations.length,
            errors: [],
            warnings: this.payrollData.warnings || [],
            variances: this.payrollData.variances || [],
            lines: this.payrollData.calculations
        };

        window.DB.payrollRuns.push(run);
        this.payrollData.runId = run.id;

        // Generate payslips
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

        // Create audit log
        if (!window.DB.auditLogs) window.DB.auditLogs = [];
        window.DB.auditLogs.push({
            id: window.DB.auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            user: window.currentUser?.name || 'Admin User',
            action: 'Payroll Finalized',
            module: 'Payroll',
            details: { runId: run.id, company: this.payrollData.companyName, period: this.payrollData.period },
            ipAddress: 'N/A'
        });

        window.DB.save();
        window.Toast.show('Payroll finalized and locked successfully', 'success');
        this.nextStep();
    },

    generateBankFile: function () {
        const format = document.getElementById('bank_format').value;
        BankFileGenerator.generateFile(this.payrollData.runId, format);
    },

    complete: function () {
        window.Toast.show('Payroll process completed successfully!', 'success');
        window.navigateTo('dashboard');
    },

    cancel: function () {
        window.showConfirmation(
            'Cancel Payroll Wizard?',
            'Are you sure you want to cancel? All progress will be lost.',
            () => {
                window.navigateTo('payroll');
            }
        );
    }
};

window.PayrollWizard = PayrollWizard;
