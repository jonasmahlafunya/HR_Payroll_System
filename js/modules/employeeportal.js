const EmployeePortal = {
   render: function (container) {
      const user = window.currentUser || { name: 'Thabo' };

      const html = `
      <div class="page-title-box">
        <h2>Employee Self Service</h2>
        <div style="color: var(--gray-500);">Manage your personal HR profile</div>
      </div>

      <div class="grid-3">
         <button class="card btn-outline" style="text-align: left; height: auto;" onclick="loadPage('payslips')">
            <div class="card-body">
               <i class="fas fa-file-invoice-dollar text-primary" style="font-size: 2rem; margin-bottom: 12px;"></i>
               <h4>Latest Payslip</h4>
               <p class="text-muted">View January 2025</p>
            </div>
         </button>
         <button class="card btn-outline" style="text-align: left; height: auto;" onclick="loadPage('leave')">
            <div class="card-body">
               <i class="fas fa-umbrella-beach text-success" style="font-size: 2rem; margin-bottom: 12px;"></i>
               <h4>Leave Balance</h4>
               <p class="text-muted">18 Days Available</p>
            </div>
         </button>
         <button class="card btn-outline" style="text-align: left; height: auto;" onclick="loadPage('profile')">
            <div class="card-body">
               <i class="fas fa-user-edit text-info" style="font-size: 2rem; margin-bottom: 12px;"></i>
               <h4>Update Info</h4>
               <p class="text-muted">Edit personal details</p>
            </div>
         </button>
      </div>

      <div class="card">
         <div class="card-header"><h4 class="card-title">Internal Announcements</h4></div>
         <div class="card-body">
            <div style="border-left: 4px solid var(--primary); padding-left: 16px; margin-bottom: 16px;">
               <h5 style="margin-bottom: 4px;">Office Policy Update</h5>
               <small style="color: var(--gray-500);">24 Jan 2025</small>
               <p>Please review the updated hybrid work policy attached in the Documents section.</p>
            </div>
         </div>
      </div>
    `;
      container.innerHTML = html;
   }
};

window.renderEmployeePortal = function (container) {
   EmployeePortal.render(container);
};
