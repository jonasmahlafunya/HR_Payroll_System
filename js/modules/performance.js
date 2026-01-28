const Performance = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Performance Management</h2>
          <div style="color: var(--gray-500);">Reviews, OKRs and Goals</div>
        </div>
        <button class="btn btn-primary" onclick="Performance.newCycle()">
          <i class="fas fa-sync"></i> New Review Cycle
        </button>
      </div>

      <div class="grid-2">
         <div class="card">
            <div class="card-header"><h4 class="card-title">Active Reviews</h4></div>
            <div class="card-body">
               <div class="table-responsive">
                  <table>
                    <thead><tr><th>Employee</th><th>Period</th><th>Status</th><th>Score</th></tr></thead>
                    <tbody>
                      ${window.DB.performance.reviews.map(rev => `
                        <tr>
                           <td>${window.DB.employees.find(e => e.id === rev.employeeId)?.firstName || 'Unknown'}</td>
                           <td>${rev.period}</td>
                           <td><span class="badge badge-success">${rev.status}</span></td>
                           <td style="font-weight: 700;">${rev.score}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
               </div>
            </div>
         </div>

         <div class="card">
            <div class="card-header"><h4 class="card-title">My Goals</h4></div>
            <div class="card-body">
               ${window.DB.performance.goals.map(goal => `
                 <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--gray-100);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                       <span style="font-weight: 500;">${goal.title}</span>
                       <span class="badge badge-info">${goal.status}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${goal.progress}%;"></div></div>
                    <small style="color: var(--gray-500);">${goal.progress}% Complete</small>
                 </div>
               `).join('')}
               <button class="btn btn-sm btn-outline" style="width: 100%;">Add New Goal</button>
            </div>
         </div>
      </div>
    `;
    container.innerHTML = html;
  },

  newCycle: function () {
    window.showModal('cycleModal', `<div class='card' style='margin:auto; padding:20px;'><h3>New Cycle</h3><p>Start a new performance review cycle (e.g. 2025 H1).</p><button class='btn btn-primary' onclick='closeModal("cycleModal")'>Create</button></div>`);
  }
};

window.renderPerformance = function (container) {
  Performance.render(container);
};