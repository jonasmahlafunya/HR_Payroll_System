const Leave = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Leave Management</h2>
          <div style="color: var(--gray-500);">Apply for leave and view balances</div>
        </div>
        <button class="btn btn-primary" onclick="Leave.showApplyModal()">
          <i class="fas fa-paper-plane"></i> Apply for Leave
        </button>
      </div>

      <div class="grid-4" style="margin-bottom: 24px;">
         ${this.balanceCard("Annual", 21, 15, "primary")}
         ${this.balanceCard("Sick", 30, 28, "success")}
         ${this.balanceCard("Study", 10, 10, "info")}
         ${this.balanceCard("Family", 3, 3, "warning")}
      </div>

      <div class="card">
        <div class="card-header"><h4 class="card-title">Leave History</h4></div>
        <div class="table-responsive">
          <table>
             <thead>
               <tr>
                 <th>Type</th>
                 <th>Dates</th>
                 <th>Days</th>
                 <th>Reason</th>
                 <th>Status</th>
                 <th>Approved By</th>
               </tr>
             </thead>
             <tbody>
               ${window.DB.leaveRequests.map(req => `
                 <tr>
                   <td><span class="badge badge-info">${req.type}</span></td>
                   <td>${req.startDate} to ${req.endDate}</td>
                   <td>${req.days}</td>
                   <td>${req.reason}</td>
                   <td><span class="badge badge-success">${req.status}</span></td>
                   <td>${req.approvedBy || '-'}</td>
                 </tr>
               `).join('')}
             </tbody>
          </table>
        </div>
      </div>
      
      <div class="card" style="margin-top: 24px;">
         <div class="card-header"><h4 class="card-title">Team Calendar</h4></div>
         <div class="card-body">
            <div style="padding: 40px; text-align: center; background: var(--gray-50); border-radius: 8px; color: var(--gray-500);">
               <i class="fas fa-calendar-alt" style="font-size: 3rem; margin-bottom: 16px;"></i>
               <p>Calendar View Integration Placeholder</p>
            </div>
         </div>
      </div>
    `;
    container.innerHTML = html;
  },

  balanceCard: function (type, total, remaining, color) {
    const percent = (remaining / total) * 100;
    return `
      <div class="card">
         <div class="card-body">
            <h4 style="color: var(--gray-500); font-size: 0.9rem; margin-bottom: 8px;">${type} Leave</h4>
            <div style="font-size: 2rem; font-weight: 700; margin-bottom: 8px;">${remaining} <span style="font-size: 1rem; font-weight: 400; color: var(--gray-400);">/ ${total}</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%; background: var(--${color});"></div></div>
         </div>
      </div>
    `;
  },

  showApplyModal: function () {
    const html = `
      <div class="card" style="width: 100%; max-width: 500px; margin: auto;">
         <div class="card-header">
            <h3>Apply for Leave</h3>
            <button class="btn btn-outline btn-sm" onclick="closeModal('leaveModal')"><i class="fas fa-times"></i></button>
         </div>
         <div class="card-body">
            <div class="form-group">
               <label class="form-label">Leave Type</label>
               <select class="form-control">
                  <option>Annual Leave</option>
                  <option>Sick Leave</option>
                  <option>Study Leave</option>
               </select>
            </div>
            <div class="grid-2">
               <div class="form-group"><label class="form-label">Start Date</label><input type="date" class="form-control"></div>
               <div class="form-group"><label class="form-label">End Date</label><input type="date" class="form-control"></div>
            </div>
            <div class="form-group">
               <label class="form-label">Reason</label>
               <textarea class="form-control" rows="3"></textarea>
            </div>
            <button class="btn btn-primary" style="width: 100%;" onclick="closeModal('leaveModal'); Toast.show('Leave Request Submitted', 'success');">Submit Request</button>
         </div>
      </div>
    `;
    showModal('leaveModal', html);
  }
};

window.renderLeave = function (container) {
  Leave.render(container);
};