const EmployeePortal = {
   render: function (container) {
      const user = window.currentUser;
      if (!user) {
         container.innerHTML = '<div class="alert alert-warning">Please log in to view the portal.</div>';
         return;
      }

      const emp = (window.DB.employees || []).find(e => e.id === user.employeeId) || {};
      const payslips = (window.DB.payslips || []).filter(p => p.employeeId === emp.id).sort((a, b) => b.id - a.id);
      const latestSlip = payslips[0];

      const leaveRequests = (window.DB.leaveRequests || []).filter(r => r.employeeId === emp.id);
      const leaveBalance = emp.leaveBalance || 0;

      const html = `
      <div class="page-header">
        <div class="header-content">
           <h2 class="page-title">Welcome, ${emp.firstName || user.name}</h2>
           <p class="page-subtitle">Employee Self Service Portal</p>
        </div>
      </div>

      <div class="grid-3" style="margin-bottom: 24px;">
         <div class="card stat-card" onclick="EmployeePortal.viewLatestPayslip('${latestSlip?.runId}', ${emp.id})" style="cursor:pointer;">
            <div class="card-body">
               <div class="stat-icon bg-primary-light"><i class="fas fa-file-invoice-dollar text-primary"></i></div>
               <div class="stat-label">Latest Payslip</div>
               <div class="stat-value" style="font-size:1.1rem;">${latestSlip ? latestSlip.period : 'None found'}</div>
               <div class="stat-meta">${latestSlip ? 'View & Download' : 'Check back later'}</div>
            </div>
         </div>
         <div class="card stat-card" onclick="EmployeePortal.applyLeave()" style="cursor:pointer;">
            <div class="card-body">
               <div class="stat-icon bg-success-light"><i class="fas fa-umbrella-beach text-success"></i></div>
               <div class="stat-label">Leave Balance</div>
               <div class="stat-value">${leaveBalance} Days</div>
               <div class="stat-meta">Apply for leave</div>
            </div>
         </div>
         <div class="card stat-card" onclick="loadPage('profile')" style="cursor:pointer;">
            <div class="card-body">
               <div class="stat-icon bg-info-light"><i class="fas fa-user-edit text-info"></i></div>
               <div class="stat-label">My Profile</div>
               <div class="stat-value" style="font-size:1.1rem;">${emp.position || 'Employee'}</div>
               <div class="stat-meta">Update personal info</div>
            </div>
         </div>
      </div>

      <div class="grid-2">
         <div class="card">
            <div class="card-header"><h4 class="card-title">Recent Leave Requests</h4></div>
            <div class="table-responsive">
               <table class="table">
                  <thead>
                     <tr>
                        <th>Type</th>
                        <th>Dates</th>
                        <th>Status</th>
                     </tr>
                  </thead>
                  <tbody>
                     ${leaveRequests.slice(0, 5).map(r => `
                        <tr>
                           <td>${r.type}</td>
                           <td><small>${r.startDate} to ${r.endDate}</small></td>
                           <td><span class="badge badge-${r.status === 'Approved' ? 'success' : (r.status === 'Rejected' ? 'danger' : 'warning')}">${r.status}</span></td>
                        </tr>
                     `).join('') || '<tr><td colspan="3" class="text-center text-muted">No requests yet</td></tr>'}
                  </tbody>
               </table>
            </div>
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
      </div>
      `;
      container.innerHTML = html;
   },

   viewLatestPayslip: function (runId, empId) {
      if (!runId) return Toast.show('No payslips available', 'info');
      if (typeof Payslips !== 'undefined') {
         Payslips.renderPayslipModal(runId, empId);
      } else {
         window.open(`api/payslip_pdf.php?employee_id=${empId}&run_id=${runId}&format=pdf`, '_blank');
      }
   },

   applyLeave: function () {
      const modal = document.createElement('div');
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
          <div class="modal-header"><h3>Apply for Leave</h3></div>
          <div class="modal-body">
            <form id="leaveForm">
              <div class="form-group">
                <label>Leave Type</label>
                <select class="form-control" name="type" required>
                  <option>Annual Leave</option>
                  <option>Sick Leave</option>
                  <option>Family Responsibility</option>
                  <option>Maternity/Paternity</option>
                </select>
              </div>
              <div class="grid-2">
                <div class="form-group">
                  <label>Start Date</label>
                  <input type="date" class="form-control" name="startDate" required>
                </div>
                <div class="form-group">
                  <label>End Date</label>
                  <input type="date" class="form-control" name="endDate" required>
                </div>
              </div>
              <div class="form-group">
                <label>Reason (Optional)</label>
                <textarea class="form-control" name="reason" rows="2"></textarea>
              </div>
              <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-backdrop').remove()">Cancel</button>
                <button type="submit" class="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#leaveForm').onsubmit = (e) => {
         e.preventDefault();
         const fd = new FormData(e.target);
         const request = {
            id: Date.now(),
            employeeId: window.currentUser.employeeId,
            type: fd.get('type'),
            startDate: fd.get('startDate'),
            endDate: fd.get('endDate'),
            reason: fd.get('reason'),
            status: 'Pending',
            createdAt: new Date().toISOString()
         };
         window.DB.leaveRequests = window.DB.leaveRequests || [];
         window.DB.leaveRequests.push(request);
         window.DB.save();
         Toast.show('Leave request submitted successfully!', 'success');
         modal.remove();
         this.render(document.getElementById('content'));
      };
   }
};

window.renderEmployeePortal = function (container) {
   EmployeePortal.render(container);
};
