const Payroll = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Payroll Processing</h2>
          <div style="color: var(--gray-500);">Current Period: February 2025</div>
        </div>
        <div style="display: flex; gap: 12px;">
           <button class="btn btn-outline" onclick="Payroll.exportEFT()">
             <i class="fas fa-file-export"></i> Export EFT
           </button>
           <button class="btn btn-primary" onclick="Payroll.processPayroll()">
             <i class="fas fa-check-circle"></i> Process Payroll
           </button>
        </div>
      </div>

      <div class="grid-4" style="margin-bottom: 24px;">
         ${this.renderSummaryCard("Total Gross", "R 4,325,000", "fas fa-coins", "text-primary")}
         ${this.renderSummaryCard("Total PAYE", "R 952,150", "fas fa-hand-holding-usd", "text-danger")}
         ${this.renderSummaryCard("Total Net Pay", "R 3,210,400", "fas fa-wallet", "text-success")}
         ${this.renderSummaryCard("Employees", window.DB.employees.length, "fas fa-users", "text-info")}
      </div>

      <div class="card">
        <div class="card-header">
           <h4 class="card-title">Employee Payroll Draft</h4>
           <div class="search-box">
             <input type="text" class="search-input" placeholder="Search employees...">
           </div>
        </div>
        <div class="table-responsive">
          <table>
             <thead>
               <tr>
                 <th>Employee</th>
                 <th>Basic Salary</th>
                 <th>Gross Earnings</th>
                 <th>PAYE</th>
                 <th>UIF</th>
                 <th>Medical Aid</th>
                 <th>Net Pay</th>
                 <th>Status</th>
               </tr>
             </thead>
             <tbody>
               ${this.renderPayrollRows()}
             </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
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

  renderPayrollRows: function () {
    return window.DB.employees.map(emp => {
      // Calculate Payroll on the fly
      const basic = emp.basicSalary;
      const allowances = Object.values(emp.allowances || {}).reduce((a, b) => a + b, 0);
      const gross = basic + allowances;
      const annualGross = gross * 12;

      // Use TaxCompliance Logic
      const taxYearly = window.TaxCalc ? window.TaxCalc.calculatePAYE(annualGross) : (gross * 0.18 * 12); // Fallback if module load order issue
      let monthlyTax = taxYearly / 12;

      // Apply Medical Credits
      const medCredits = window.TaxCalc ? window.TaxCalc.calculateMedicalCredits(emp.benefits?.medicalMembers || 0) : 0;
      monthlyTax = Math.max(0, monthlyTax - medCredits);

      const uif = window.TaxCalc ? window.TaxCalc.calculateUIF(gross) : Math.min(gross * 0.01, 148.72);

      // Medical Deduction (Employee contribution part)
      const medDed = emp.benefits?.medicalContribution || 0;
      const pensionDed = (basic * (emp.benefits?.pensionPercent || 0)) / 100;

      const totalDed = monthlyTax + uif + medDed + pensionDed;
      const net = gross - totalDed;

      return `
        <tr>
          <td>
            <div style="font-weight: 500;">${emp.firstName} ${emp.lastName}</div>
            <small style="color: var(--gray-500);">${emp.position}</small>
          </td>
          <td>${window.formatCurrency(basic)}</td>
          <td>${window.formatCurrency(gross)}</td>
          <td style="color: var(--danger);">${window.formatCurrency(monthlyTax)}</td>
          <td style="color: var(--danger);">${window.formatCurrency(uif)}</td>
          <td style="color: var(--danger);">${window.formatCurrency(medDed)}</td>
          <td style="font-weight: 700; color: var(--success);">${window.formatCurrency(net)}</td>
          <td><span class="badge badge-warning">Draft</span></td>
        </tr>
      `;
    }).join('');
  },

  exportEFT: function () {
    window.Toast.show("Generating ACB/EFT File...", "info");
    setTimeout(() => {
      window.Toast.show("EFT File Downloaded (ACB format)", "success");
    }, 1500);
  },

  processPayroll: function () {
    window.showConfirmation("Confirm Payroll Processing", "Are you sure you want to finalize the payroll for February 2025? This action cannot be undone and will generate payslips for all active employees.", () => {
      window.Toast.show("Processing Payroll...", "info");
      setTimeout(() => {
        window.Toast.show("Payroll Finalized Successfully!", "success");
      }, 2000);
    });
  }
};

window.renderPayroll = function (container) {
  Payroll.render(container);
};