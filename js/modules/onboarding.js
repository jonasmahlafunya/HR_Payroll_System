const Onboarding = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Onboarding</h2>
          <div style="color: var(--gray-500);">New Hire Orientation & Checklists</div>
        </div>
        <button class="btn btn-primary" onclick="Onboarding.assignOnboarding()">
          <i class="fas fa-user-plus"></i> Assign Onboarding
        </button>
      </div>

      <div class="dashboard-grid">
         <div class="widget">
           <div style="display: flex; justify-content: space-between; align-items: center;">
             <div>
               <h3>${window.DB.onboarding.length}</h3>
               <small>Active Onboarding</small>
             </div>
             <i class="fas fa-user-clock text-primary" style="font-size: 1.5rem;"></i>
           </div>
         </div>
         <div class="widget">
           <div style="display: flex; justify-content: space-between; align-items: center;">
             <div>
               <h3>95%</h3>
               <small>Satisfaction</small>
             </div>
             <i class="fas fa-smile text-success" style="font-size: 1.5rem;"></i>
           </div>
         </div>
      </div>

      <div class="card">
        <div class="card-header"><h4 class="card-title">Active Checklists</h4></div>
        <div class="table-responsive">
          <table>
             <thead>
               <tr>
                 <th>New Hire</th>
                 <th>Position</th>
                 <th>Start Date</th>
                 <th>Progress</th>
                 <th>Status</th>
                 <th>Actions</th>
               </tr>
             </thead>
             <tbody>
               ${window.DB.onboarding.map(item => `
                 <tr>
                   <td>${item.employeeName}</td>
                   <td>${item.position}</td>
                   <td>${item.startDate}</td>
                   <td>
                     <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="progress-bar" style="width: 100px; height: 6px;">
                           <div class="progress-fill" style="width: ${item.progress}%;"></div>
                        </div>
                        <span style="font-size: 0.8rem;">${item.progress}%</span>
                     </div>
                   </td>
                   <td><span class="badge badge-info">${item.status}</span></td>
                   <td>
                     <button class="btn btn-sm btn-outline">Checklist</button>
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

  assignOnboarding: function () {
    const html = `
      <div class="card" style="width: 100%; max-width: 500px; margin: auto;">
         <div class="card-header"><h3>Start Onboarding</h3></div>
         <div class="card-body">
            <div class="form-group">
               <label class="form-label">Select New Hire</label>
               <select class="form-control"><option>Select...</option></select>
            </div>
            <div class="form-group">
               <label class="form-label">Template</label>
               <select class="form-control">
                  <option>Standard Employee</option>
                  <option>Management</option>
                  <option>Remote Developer</option>
               </select>
            </div>
            <button class="btn btn-primary" style="width: 100%;" onclick="closeModal('onboardingModal'); Toast.show('Onboarding Started', 'success');">Assign</button>
         </div>
      </div>
    `;
    showModal('onboardingModal', html);
  }
};

window.renderOnboarding = function (container) {
  Onboarding.render(container);
};