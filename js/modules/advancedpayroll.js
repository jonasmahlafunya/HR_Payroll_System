const AdvancedPayroll = {
  render: function (container) {
    const html = `
      <div class="page-title-box">
        <h2>Advanced Payroll</h2>
        <div style="color: var(--gray-500);">Complex calculations, directives, and third-party payments</div>
      </div>

      <div class="grid-3">
         <div class="card cursor-pointer" onclick="Toast.show('Tax Directives Module Loading...', 'info')">
            <div class="card-body text-center">
               <i class="fas fa-file-signature" style="font-size: 2.5rem; color: var(--primary); margin-bottom: 16px;"></i>
               <h4>SARS Tax Directives</h4>
               <p class="text-muted">Manage lumpsum directives and fixed rates</p>
            </div>
         </div>
         <div class="card cursor-pointer" onclick="Toast.show('Garnishee Orders Module Loading...', 'info')">
            <div class="card-body text-center">
               <i class="fas fa-gavel" style="font-size: 2.5rem; color: var(--danger); margin-bottom: 16px;"></i>
               <h4>Garnishee Orders</h4>
               <p class="text-muted">Manage court orders and garnishees</p>
            </div>
         </div>
         <div class="card cursor-pointer" onclick="Toast.show('Loans Module Loading...', 'info')">
            <div class="card-body text-center">
               <i class="fas fa-hand-holding-usd" style="font-size: 2.5rem; color: var(--warning); margin-bottom: 16px;"></i>
               <h4>Company Loans</h4>
               <p class="text-muted">Track staff loans and interest</p>
            </div>
         </div>
      </div>

      <div class="card mt-4">
         <div class="card-header"><h4 class="card-title">Retirement Funds Reconciliation</h4></div>
         <div class="table-responsive">
            <table>
               <thead>
                  <tr><th>Fund Name</th><th>Type</th><th>Members</th><th>Total Contrib.</th><th>Status</th></tr>
               </thead>
               <tbody>
                  <tr><td>Allan Gray Provident</td><td>Provident Fund</td><td>85</td><td>R 450,200</td><td><span class="badge badge-success">Balanced</span></td></tr>
                  <tr><td>Old Mutual SuperFund</td><td>Pension Fund</td><td>35</td><td>R 125,000</td><td><span class="badge badge-success">Balanced</span></td></tr>
               </tbody>
            </table>
         </div>
      </div>
    `;
    container.innerHTML = html;
  }
};

window.renderAdvancedPayroll = function (container) {
  AdvancedPayroll.render(container);
};
