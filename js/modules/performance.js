const Performance = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Performance Management</h2>
          <div style="color: var(--gray-500);">Reviews, OKRs and Goals</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline" onclick="Performance.newCycle()">
            <i class="fas fa-sync"></i> New Cycle
          </button>
          <button class="btn btn-primary" onclick="Performance.showAddReviewModal()">
            <i class="fas fa-plus"></i> Add Review
          </button>
        </div>
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

  showAddReviewModal: function () {
    const employees = window.DB.employees.filter(e => e.status === 'Active');
    const html = `
      <div style="padding: 24px;">
        <h3 style="margin-bottom: 20px;">New Performance Review</h3>
        <div class="form-group">
          <label class="form-label">Employee</label>
          <select id="revEmployeeId" class="form-control">
            ${employees.map(e => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Review Period</label>
          <input type="text" id="revPeriod" class="form-control" value="2025 Annual Review">
        </div>
        <div class="form-group">
          <label class="form-label">Performance Score (1-5)</label>
          <input type="number" id="revScore" class="form-control" min="1" max="5" value="3">
        </div>
        <div class="form-group">
          <label class="form-label">Manager Feedback</label>
          <textarea id="revFeedback" class="form-control" rows="3"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
          <button class="btn btn-outline" onclick="window.closeModal('revModal')">Cancel</button>
          <button class="btn btn-primary" onclick="Performance.submitReview()">Save Review</button>
        </div>
      </div>
    `;
    window.showModal('revModal', html);
  },

  submitReview: function() {
    const id = document.getElementById('revEmployeeId').value;
    const period = document.getElementById('revPeriod').value;
    const score = document.getElementById('revScore').value;
    const feedback = document.getElementById('revFeedback').value;
    
    if (!id || !period || !score) {
        window.Toast.show("Please fill all fields", "warning");
        return;
    }

    const newRev = {
        employeeId: parseInt(id),
        period: period,
        status: 'Completed',
        score: parseFloat(score),
        feedback: feedback
    };

    window.DB.performance.reviews.push(newRev);
    window.DB.save();
    window.closeModal('revModal');
    window.renderPerformance(document.getElementById('content'));
    window.Toast.show("Review saved successfully", "success");
  }
};

window.renderPerformance = function (container) {
  Performance.render(container);
};