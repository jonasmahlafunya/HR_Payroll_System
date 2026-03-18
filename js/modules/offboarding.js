// Offboarding Module
const Offboarding = {
  render: function (container) {
    const html = `
      <div class="page-title-box">
        <h3>Offboarding Management</h3>
        <button class="btn btn-primary" onclick="Offboarding.showInitiateModal()">
          <i class="fas fa-plus"></i> Initiate Exit
        </button>
      </div>

      <div class="dashboard-grid">
        <div class="widget">
           <div class="widget-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);">
             <i class="fas fa-user-times"></i>
           </div>
           <div>
             <h3>${window.DB.offboarding.length}</h3>
             <small>Pending Exits</small>
           </div>
        </div>
        <div class="widget">
           <div class="widget-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);">
             <i class="fas fa-tasks"></i>
           </div>
           <div>
             <h3>85%</h3>
             <small>Avg. Completion</small>
           </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h4 class="card-title">Active Exit Processes</h4>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Position</th>
                <th>Exit Date</th>
                <th>Type</th>
                <th>Progress</th>
                <th>Status</th>
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
  },

  renderRows: function () {
    return window.DB.offboarding.map(item => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="avatar" style="background: var(--gray-200); display: flex; align-items: center; justify-content: center;">
              ${item.employeeName.charAt(0)}
            </div>
            <div>
              <div style="font-weight: 500;">${item.employeeName}</div>
              <small style="color: var(--gray-500);">${item.position}</small>
            </div>
          </div>
        </td>
        <td>${item.position}</td>
        <td>${item.exitDate}</td>
        <td>Resignation</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="progress-bar" style="width: 100px; height: 6px;">
              <div class="progress-fill" style="width: ${item.progress}%;"></div>
            </div>
            <span style="font-size: 0.8rem;">${item.progress}%</span>
          </div>
        </td>
        <td><span class="badge badge-warning">${item.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline"><i class="fas fa-eye"></i></button>
        </td>
      </tr>
    `).join('');
  },

  showInitiateModal: function () {
    const employees = window.DB.employees.filter(e => e.status === 'Active');
    const html = `
      <div style="padding: 24px;">
        <h3 style="margin-bottom: 20px;">Initiate Exit Process</h3>
        <div class="form-group">
          <label class="form-label">Employee</label>
          <select id="exitEmployeeId" class="form-control">
            ${employees.map(e => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Last Working Day</label>
          <input type="date" id="exitDate" class="form-control">
        </div>
        <div class="form-group">
          <label class="form-label">Exit Type</label>
          <select id="exitType" class="form-control">
            <option value="Resignation">Resignation</option>
            <option value="Retirement">Retirement</option>
            <option value="Termination">Involuntary Termination</option>
            <option value="Contract Ended">Contract End</option>
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
          <button class="btn btn-outline" onclick="window.closeModal('exitModal')">Cancel</button>
          <button class="btn btn-primary" onclick="Offboarding.submitExit()">Start Offboarding</button>
        </div>
      </div>
    `;
    window.showModal('exitModal', html);
  },

  submitExit: function() {
    const id = document.getElementById('exitEmployeeId').value;
    const date = document.getElementById('exitDate').value;
    const type = document.getElementById('exitType').value;
    const emp = window.DB.employees.find(e => e.id == id);
    
    if (!emp || !date) {
        window.Toast.show("Please fill all fields", "warning");
        return;
    }

    const newExit = {
        id: window.DB.offboarding.length + 1,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        position: emp.position,
        exitDate: date,
        type: type,
        progress: 10,
        status: 'Initiated'
    };

    window.DB.offboarding.push(newExit);
    window.DB.save();
    window.closeModal('exitModal');
    window.renderOffboarding(document.getElementById('content'));
    window.Toast.show("Exit process initiated", "success");
  }
};

window.renderOffboarding = function (container) {
  Offboarding.render(container);
};