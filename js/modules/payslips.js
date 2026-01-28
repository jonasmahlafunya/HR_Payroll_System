const Payslips = {
  render: function (container) {
    const html = `
      <div class="page-title-box">
        <h2>Payslips</h2>
        <div style="color: var(--gray-500);">View and download employee payslips</div>
      </div>

      <div class="card">
        <div class="card-header">
           <div style="display: flex; gap: 16px; flex: 1;">
              <select class="form-control" style="max-width: 200px;">
                <option>January 2025</option>
                <option>December 2024</option>
                <option>November 2024</option>
              </select>
              <div class="search-box" style="flex: 1;">
                 <input type="text" class="search-input" placeholder="Search employee...">
              </div>
           </div>
           <button class="btn btn-outline" style="margin-left: 16px;">
             <i class="fas fa-envelope"></i> Email All
           </button>
        </div>
        <div class="table-responsive">
          <table>
             <thead>
               <tr>
                 <th>Employee</th>
                 <th>Period</th>
                 <th>Net Pay</th>
                 <th>Pay Date</th>
                 <th>Actions</th>
               </tr>
             </thead>
             <tbody>
               ${window.DB.employees.map(emp => `
                 <tr>
                   <td>${emp.firstName} ${emp.lastName}</td>
                   <td>January 2025</td>
                   <td style="font-weight: 600;">${window.formatCurrency(emp.basicSalary * 0.75)}</td> <!-- Approx Net -->
                   <td>2025-01-25</td>
                   <td>
                     <button class="btn btn-sm btn-primary" onclick="Payslips.viewPayslip(${emp.id})"><i class="fas fa-eye"></i> View</button>
                     <button class="btn btn-sm btn-outline"><i class="fas fa-download"></i></button>
                   </td>
                 </tr>
               `).join('')}
             </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
  },

  viewPayslip: function (empId) {
    const emp = window.DB.employees.find(e => e.id === empId);

    // Simulate calc again for display
    const basic = emp.basicSalary;
    const tax = window.TaxCalc ? window.TaxCalc.calculatePAYE(basic * 12) / 12 : basic * 0.2;
    const uif = window.TaxCalc ? window.TaxCalc.calculateUIF(basic) : 148.72;
    const net = basic - tax - uif;

    const modalContent = `
      <div class="card" style="width: 100%; max-width: 800px; margin: auto;">
         <div class="card-header" style="background: var(--gray-50); border-bottom: 2px solid var(--gray-200);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
               <div>
                  <h2 style="color: var(--primary);">HRPMS Pro</h2>
                  <small>Acme Corp SA</small>
               </div>
               <div style="text-align: right;">
                  <h3>Payslip</h3>
                  <div>January 2025</div>
               </div>
            </div>
         </div>
         <div class="card-body">
            <div style="display: flex; justify-content: space-between; margin-bottom: 32px; font-size: 0.9rem;">
               <div>
                  <strong>Employee:</strong> ${emp.firstName} ${emp.lastName}<br>
                  <strong>ID:</strong> ${emp.idNumber}<br>
                  <strong>Position:</strong> ${emp.position}<br>
                  <strong>Tax Ref:</strong> ${emp.taxNumber}
               </div>
               <div style="text-align: right;">
                  <strong>Engagement Date:</strong> ${emp.hireDate}<br>
                  <strong>Bank:</strong> ${emp.bankName}<br>
                  <strong>Account:</strong> ***${String(emp.accountNumber).slice(-4)}
               </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px;">
               <div>
                  <h4 style="border-bottom: 1px solid var(--gray-300); padding-bottom: 8px;">Earnings</h4>
                  <table style="width: 100%;">
                     <tr><td style="padding: 8px 0;">Basic Salary</td><td style="text-align: right;">${window.formatCurrency(basic)}</td></tr>
                     <tr><td style="padding: 8px 0;">Travel Allowance</td><td style="text-align: right;">${window.formatCurrency(emp.allowances?.travel || 0)}</td></tr>
                     <tr style="font-weight: 700; border-top: 1px solid var(--gray-200);"><td style="padding: 8px 0; margin-top: 8px;">Total Earnings</td><td style="text-align: right;">${window.formatCurrency(basic + (emp.allowances?.travel || 0))}</td></tr>
                  </table>
               </div>
               <div>
                  <h4 style="border-bottom: 1px solid var(--gray-300); padding-bottom: 8px;">Deductions</h4>
                  <table style="width: 100%;">
                     <tr><td style="padding: 8px 0;">PAYE Tax</td><td style="text-align: right;">${window.formatCurrency(tax)}</td></tr>
                     <tr><td style="padding: 8px 0;">UIF</td><td style="text-align: right;">${window.formatCurrency(uif)}</td></tr>
                     <tr style="font-weight: 700; border-top: 1px solid var(--gray-200);"><td style="padding: 8px 0; margin-top: 8px;">Total Deductions</td><td style="text-align: right;">${window.formatCurrency(tax + uif)}</td></tr>
                  </table>
               </div>
            </div>

            <div style="background: var(--gray-100); padding: 20px; text-align: right; border-radius: 8px;">
               <div style="font-size: 0.9rem; color: var(--gray-600);">Net Pay</div>
               <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${window.formatCurrency(net + (emp.allowances?.travel || 0))}</div>
            </div>
            
            <div style="margin-top: 24px; text-align: center;">
               <button class="btn btn-primary" onclick="window.print()">Download PDF</button>
               <button class="btn btn-outline" onclick="closeModal('payslipViewModal')">Close</button>
            </div>
         </div>
      </div>
    `;
    window.showModal('payslipViewModal', modalContent);
  }
};

window.renderPayslips = function (container) {
  Payslips.render(container);
};