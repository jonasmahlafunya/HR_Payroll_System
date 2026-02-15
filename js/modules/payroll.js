
const Payroll = {
  state: {
    mode: 'view', // view | draft | finalized
    currentPeriod: 'February 2025',
    selectedCompany: null, // New: Filter by Company
    activeRun: null,
    draftData: []
  },

  init: function () {
    if (window.DB.settings?.currentPeriod) {
      this.state.currentPeriod = window.DB.settings.currentPeriod;
    }
    // Reset modes
    this.state.mode = 'view';
    this.state.activeRun = null;
    this.state.draftData = [];
  },

  render: function (container) {
    try {
      if (!this.state.currentPeriod) this.init();

      // Ensure DB exists
      if (!window.DB) {
        console.error('DB is missing!');
        container.innerHTML = '<div class="alert alert-danger">Database not loaded. Refresh page.</div>';
        return;
      }

      // Get Company Options
      const companies = window.DB.companies || [];
      const companyOptions = `<option value="">-- Select Company --</option>` + companies.map(c => `<option value="${c.id}" ${this.state.selectedCompany == c.id ? 'selected' : ''}>${c.name}</option>`).join('');

      // Dynamic Header Actions
      let actionsHtml = '';
      if (this.state.mode === 'view') {
        actionsHtml = `
                <button class="btn btn-primary" onclick="PayrollWizard.start()" ${!this.state.selectedCompany ? 'disabled' : ''}>
                  <i class="fas fa-magic"></i> Run Payroll Wizard
                </button>
                <button class="btn btn-outline" onclick="Payroll.startDraft()" ${!this.state.selectedCompany ? 'disabled' : ''}>
                  <i class="fas fa-play"></i> Quick Start (Legacy)
                </button>`;
      } else if (this.state.mode === 'draft') {
        actionsHtml = `
                <button class="btn btn-outline" onclick="Payroll.discardDraft()">Discard</button>
                <button class="btn btn-primary" onclick="Payroll.finalizeRun()">
                  <i class="fas fa-check-double"></i> Finalize Payroll
                </button>`;
      } else if (this.state.mode === 'finalized') {
        actionsHtml = `
                  <button class="btn btn-outline btn-sm text-danger" onclick="Payroll.rollbackRun()" style="border-color: var(--danger); color: var(--danger);">
                      <i class="fas fa-undo"></i> Rollback
                  </button>
                  <div style="width: 1px; height: 24px; background: var(--gray-300); margin: 0 4px;"></div>
                  <button class="btn btn-outline" onclick="Payroll.exportEFT()"><i class="fas fa-file-export"></i> EFT</button>
                  <button class="btn btn-primary" onclick="Payroll.nextPeriod()">Next Month <i class="fas fa-arrow-right"></i></button>
                `;
      }

      const html = `
              <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div>
                  <h2>Payroll Processing</h2>
                  <div style="color: var(--gray-500);">Period: <strong>${this.state.currentPeriod}</strong> <span class="badge ${this.getStatusBadgeClass()}">${this.state.mode.toUpperCase()}</span></div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <div class="form-group" style="margin-bottom: 0;">
                      <select class="form-control" style="padding: 6px 10px; font-size: 0.8rem; width: 200px;" onchange="Payroll.selectCompany(this.value)" ${this.state.mode !== 'view' ? 'disabled' : ''}>
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
            `;
      container.innerHTML = html;
    } catch (e) {
      console.error('Payroll Render Error:', e);
      container.innerHTML = `<div class="alert alert-danger">Error rendering payroll: ${e.message}</div>`;
    }
  },

  selectCompany: function (val) {
    this.state.selectedCompany = val;
    // Check if there is already a finalized run for this company/period
    const existingRun = window.DB.payrollRuns?.find(r => r.period === this.state.currentPeriod && r.companyId == val && r.status === 'Finalized');

    if (existingRun) {
      this.state.mode = 'finalized';
      this.state.activeRun = existingRun;
      this.state.draftData = window.DB.payslips.filter(p => p.runId === existingRun.id);
    } else {
      this.state.mode = 'view';
      this.state.activeRun = null;
      this.state.draftData = [];
    }
    this.render(document.getElementById('content'));
  },

  getStatusBadgeClass: function () {
    switch (this.state.mode) {
      case 'view': return 'badge-secondary';
      case 'draft': return 'badge-warning';
      case 'finalized': return 'badge-success';
      default: return 'badge-secondary';
    }
  },

  renderTotalsCards: function () {
    if (this.state.mode === 'view') return '';

    const totals = this.calculateTotals();

    return `
          <div class="grid-4" style="margin-bottom: 24px;">
               ${this.renderSummaryCard("Total Gross", window.formatCurrency(totals.gross), "fas fa-coins", "text-primary")}
               ${this.renderSummaryCard("Total PAYE", window.formatCurrency(totals.paye), "fas fa-hand-holding-usd", "text-danger")}
               ${this.renderSummaryCard("Total Net Pay", window.formatCurrency(totals.net), "fas fa-wallet", "text-success")}
               ${this.renderSummaryCard("Employees", this.state.draftData.length, "fas fa-users", "text-info")}
          </div>`;
  },

  renderSummaryCard: function (title, value, icon, colorClass) {
    return `
             <div class="card">
               <div class="card-body">
                  <div style="display: flex; justify-content: space-between; align-items: start;">
                     <div>
                       <div style="color: var(--gray-500); font-size: 0.9rem;">${title}</div>
                       <div style="font-size: 1.5rem; font-weight: 700; margin-top: 4px;">${value}</div>
                     </div>
                     <div style="font-size: 1.5rem;" class="${colorClass || ''}"><i class="${icon}"></i></div>
                  </div>
               </div>
             </div>
           `;
  },

  startDraft: function () {
    if (!this.state.selectedCompany) {
      window.Toast.show("Please select a company first", "error");
      return;
    }
    this.state.mode = 'draft';
    this.calculateDraft();
    this.render(document.getElementById('content'));

    const compName = window.DB.companies.find(c => c.id == this.state.selectedCompany)?.name;
    window.Toast.show(`Draft Payroll for ${compName} Calculated`, "info");
  },

  discardDraft: function () {
    window.showConfirmation("Discard Draft?", "Are you sure you want to discard this payroll draft? All calculations will be lost.", () => {
      this.state.mode = 'view';
      this.state.activeRun = null;
      this.state.draftData = [];
      this.render(document.getElementById('content'));
      window.Toast.show("Draft discarded", "info");
    });
  },

  calculateDraft: function () {
    // 1. Filter Employees by Selected Company
    // We match by Company Name usually, or ID if we stored ID. Let's assume Name match for now as Emp data uses Name.
    const selectedCompObj = window.DB.companies.find(c => c.id == this.state.selectedCompany);
    const employees = window.DB.employees.filter(e => e.status === 'Active' && e.companyName === selectedCompObj.name);

    this.state.draftData = employees.map(emp => {
      const age = window.TaxCalc.calculateAge(emp.dateOfBirth);

      // 1. Income (Basic)
      const basic = emp.basicSalary;

      let totalBenefits = 0;
      let totalDeductions = 0;
      let companyContrib = 0;

      // Custom Benefits
      if (emp.benefits && emp.benefits.custom) {
        emp.benefits.custom.forEach(ben => {
          let val = 0;
          if (ben.calc === 'Fixed') val = parseFloat(ben.value);
          else if (ben.calc === 'Percentage') val = basic * (parseFloat(ben.value) / 100);

          if (ben.type === 'Allowance') {
            totalBenefits += val;
          } else if (ben.type === 'Deduction') {
            totalDeductions += val;
          } else if (ben.type === 'CompanyContribution') {
            companyContrib += val;
          }
        });
      }

      const gross = basic + totalBenefits;

      // 2. Variable Deductions (Medical, Pension)
      const medContrib = emp.benefits?.medicalContribution || 0;
      const pensionContrib = (basic * (emp.benefits?.pensionPercent || 0)) / 100;

      // 3. Tax Calc
      const rfi = basic + (totalBenefits * 0.5); // Simplified RFI
      const allowablePension = window.TaxCalc.calculateRetirementTaxDeduction(rfi, pensionContrib);
      const taxableIncome = gross - allowablePension;
      const medicalMembers = emp.benefits?.medicalMembers || 0;

      const paye = window.TaxCalc.calculatePAYE(taxableIncome, age, medicalMembers);
      const uif = window.TaxCalc.calculateUIF(gross);
      const sdl = window.TaxCalc.calculateSDL(gross);

      // 4. Net
      const totalEmployeeDeductions = paye + uif + pensionContrib + medContrib + totalDeductions;
      const net = gross - totalEmployeeDeductions;

      return {
        id: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        companyName: emp.companyName,
        basic,
        allowances: totalBenefits, // Now represents total custom allowances
        gross,
        paye,
        uif,
        pension: pensionContrib,
        medical: medContrib,
        otherDeductions: totalDeductions, // Now represents total custom deductions
        net,
        sdl,
        companyContrib // New field
      };
    });
  },

  calculateTotals: function () {
    return this.state.draftData.reduce((acc, row) => ({
      gross: acc.gross + row.gross,
      paye: acc.paye + row.paye,
      net: acc.net + row.net
    }), { gross: 0, paye: 0, net: 0 });
  },

  renderRows: function () {
    if (this.state.mode === 'view') return '<tr><td colspan="10" class="text-center">Select a company and start draft.</td></tr>';

    return this.state.draftData.map(row => `
              <tr>
                 <td><div style="font-weight: 500;">${row.employeeName}</div></td>
                 <td><span class="badge badge-info" style="font-size: 0.7rem;">${row.companyName}</span></td>
                 <td class="text-right">${window.formatCurrency(row.basic)}</td>
                 <td class="text-right">${window.formatCurrency(row.allowances)}</td>
                 <td class="text-right" style="font-weight:600;">${window.formatCurrency(row.gross)}</td>
                 <td class="text-right text-danger">${window.formatCurrency(row.paye)}</td>
                 <td class="text-right text-danger">${window.formatCurrency(row.uif)}</td>
                 <td class="text-right text-danger">${window.formatCurrency(row.pension + row.medical + row.otherDeductions)}</td>
                 <td class="text-right text-success" style="font-weight: 700;">${window.formatCurrency(row.net)}</td>
                 <td>
                   <button class="btn-icon-sm" onclick="Payroll.viewPayslip(${row.id})"><i class="fas fa-eye"></i></button>
                 </td>
              </tr>
          `).join('');
  },

  finalizeRun: function () {
    const totals = this.calculateTotals();
    const count = this.state.draftData.length;

    // Check for previous run to compare
    const prevPeriodDate = new Date(Date.parse("01 " + this.state.currentPeriod));
    prevPeriodDate.setMonth(prevPeriodDate.getMonth() - 1);
    const prevPeriod = prevPeriodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const prevRun = window.DB.payrollRuns?.find(r => r.period === prevPeriod && r.companyId == this.state.selectedCompany && r.status === 'Finalized');

    const varNet = prevRun ? totals.net - prevRun.net : 0;
    const varPercent = prevRun ? ((varNet / prevRun.net) * 100).toFixed(1) : 0;

    const html = `
        <div class="card" style="width: 100%; max-width: 600px; margin: auto;">
           <div class="card-header">
              <h3 class="card-title"><i class="fas fa-clipboard-check"></i> Reconciliation Report</h3>
              <button class="btn btn-outline btn-sm" onclick="closeModal('reconModal')"><i class="fas fa-times"></i></button>
           </div>
           <div class="card-body">
              <div class="alert alert-info">
                 <strong>Period:</strong> ${this.state.currentPeriod}<br>
                 <strong>Employees:</strong> ${count}
              </div>

              <table class="table table-sm" style="width:100%; margin-bottom: 20px;">
                 <tr style="background: #f8fafc;">
                    <th>Metric</th>
                    <th class="text-right">Current</th>
                    <th class="text-right">Previous (${prevRun ? 'Found' : 'New'})</th>
                    <th class="text-right">Variance</th>
                 </tr>
                 <tr>
                    <td>Gross Pay</td>
                    <td class="text-right">${window.formatCurrency(totals.gross)}</td>
                    <td class="text-right">${prevRun ? window.formatCurrency(prevRun.gross) : '-'}</td>
                    <td class="text-right">-</td>
                 </tr>
                 <tr>
                    <td>PAYE & Deductions</td>
                    <td class="text-right">${window.formatCurrency(totals.gross - totals.net)}</td>
                    <td class="text-right">${prevRun ? window.formatCurrency(prevRun.gross - prevRun.net) : '-'}</td>
                    <td class="text-right">-</td>
                 </tr>
                 <tr style="font-weight: bold; border-top: 2px solid #e2e8f0;">
                    <td>Net Pay (EFT)</td>
                    <td class="text-right text-success">${window.formatCurrency(totals.net)}</td>
                    <td class="text-right">${prevRun ? window.formatCurrency(prevRun.net) : '-'}</td>
                    <td class="text-right ${Math.abs(varPercent) > 10 ? 'text-danger' : ''}">
                        ${window.formatCurrency(varNet)} (${varPercent}%)
                    </td>
                 </tr>
              </table>

              ${Math.abs(varPercent) > 10 ? `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> <strong>Warning:</strong> Net Pay variance exceeds 10%. Please review before finalizing.</div>` : ''}

              <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
                 <h5 style="color: var(--success); margin-bottom: 8px; font-size: 0.9rem;">Automation Actions</h5>
                 <div style="font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px;">
                    <div><i class="fas fa-check-circle text-success"></i> Lock Payroll Run</div>
                    <div><i class="fas fa-envelope text-primary"></i> Email ${count} Payslips</div>
                    <div><i class="fas fa-file-invoice text-info"></i> Generate Bank Payment File (ACB)</div>
                 </div>
              </div>

              <div style="display: flex; gap: 10px;">
                 <button class="btn btn-outline" style="flex: 1;" onclick="closeModal('reconModal')">Review Draft</button>
                 <button class="btn btn-primary" style="flex: 1;" onclick="Payroll.processFinalization()">Confirm & Process</button>
              </div>
           </div>
        </div>
    `;
    window.showModal('reconModal', html);
  },

  processFinalization: function () {
    // 1. Close modal immediately for better UX
    window.closeModal('reconModal');

    // 2. Save Run
    const totals = this.calculateTotals();
    const newRun = {
      id: `RUN_${Date.now()}`,
      companyId: this.state.selectedCompany,
      period: this.state.currentPeriod,
      status: 'Finalized',
      date: new Date().toISOString(),
      ...totals,
      count: this.state.draftData.length
    };

    window.DB.payrollRuns = window.DB.payrollRuns || [];
    window.DB.payrollRuns.push(newRun);

    window.DB.payslips = window.DB.payslips || [];
    this.state.draftData.forEach(line => {
      window.DB.payslips.push({
        runId: newRun.id,
        ...line
      });
    });

    window.DB.save();

    // 3. Update State and Re-render
    this.state.mode = 'finalized';
    this.state.activeRun = newRun;
    this.render(document.getElementById('content'));

    // 4. Automation: Email Simulation
    window.Toast.show("Payroll Finalized. Sending Emails...", "info");
    setTimeout(() => {
      window.Toast.show(`Sent ${this.state.draftData.length} payslips successfully!`, "success");
    }, 1500);

    // 5. Automation: Bank File Generation
    setTimeout(() => {
      this.generateBankFile();
    }, 2000);
  },

  generateBankFile: function () {
    const rows = ["Account Name,Account Number,Branch Code,Reference,Amount"];
    this.state.draftData.forEach(d => {
      rows.push(`${d.employeeName},123456789,250655,SALARY ${this.state.currentPeriod},${d.net.toFixed(2)}`);
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

  rollbackRun: function () {
    if (!this.state.activeRun) return;

    window.showConfirmation("Rollback Payroll?", "WARNING: This will delete this finalized run. This cannot be undone.", () => {
      // 1. Remove Run
      window.DB.payrollRuns = window.DB.payrollRuns.filter(r => r.id !== this.state.activeRun.id);

      // 2. Remove Payslips
      window.DB.payslips = window.DB.payslips.filter(p => p.runId !== this.state.activeRun.id);

      // 3. Persist
      window.DB.save();

      // 4. Reset State
      this.state.mode = 'draft';
      this.state.activeRun = null;

      window.Toast.show("Payroll Rollback Complete", "warning");
      this.render(document.getElementById('content'));
    });
  },

  nextPeriod: function () {
    const current = new Date(Date.parse("01 " + this.state.currentPeriod));
    current.setMonth(current.getMonth() + 1);
    const nextMonthName = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    window.showConfirmation("Start New Period?", "Proceed to " + nextMonthName + "?", () => {
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
    if (this.state.mode === 'finalized') {
      this.generateBankFile();
    } else {
      window.Toast.show("No finalized run to export.", "error");
    }
  },

  viewPayslip: function (employeeId) {
    if (this.state.mode === 'finalized') {
      Payslips.renderPayslipModal(this.state.activeRun.id, employeeId);
    } else if (this.state.mode === 'draft') {
      // Find the draft line for this employee
      const draftLine = this.state.draftData.find(d => d.id === employeeId);
      if (draftLine) {
        Payslips.renderPayslipModal(draftLine, employeeId);
      } else {
        window.Toast.show("Draft data for employee not found", "error");
      }
    } else {
      window.Toast.show("Draft or Finalize payroll to view payslips", "info");
    }
  },

  filterRows: function (searchTerm) {
    const rows = document.querySelectorAll('#payrollTable tbody tr');
    const term = searchTerm.toLowerCase().trim();

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  }
};

window.renderPayroll = function (container) {
  Payroll.render(container);
};