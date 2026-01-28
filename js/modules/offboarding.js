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
    alert("Initiate Exit Modal would open here");
  }
};

window.renderOffboarding = function (container) {
  Offboarding.render(container);
};