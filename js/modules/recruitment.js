const Recruitment = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Recruitment</h2>
          <div style="color: var(--gray-500);">Talent Acquisition & Applicant Tracking</div>
        </div>
        <button class="btn btn-primary" onclick="Recruitment.showPostJobModal()">
          <i class="fas fa-plus"></i> Post New Job
        </button>
      </div>

      <div class="tabs" style="margin-bottom: 24px;">
        <button class="tab-btn active" onclick="Recruitment.switchView('jobs')">Job Board</button>
        <button class="tab-btn" onclick="Recruitment.switchView('applicants')">Applicants</button>
        <button class="tab-btn" onclick="Recruitment.switchView('pipeline')">Pipeline</button>
      </div>

      <div id="recruitmentContent">
         ${this.renderJobBoard()}
      </div>
    `;
    container.innerHTML = html;
  },

  switchView: function (view) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const container = document.getElementById('recruitmentContent');
    if (view === 'jobs') container.innerHTML = this.renderJobBoard();
    else if (view === 'applicants') container.innerHTML = this.renderApplicants();
    else if (view === 'pipeline') container.innerHTML = `<div class="empty-state"><i class="fas fa-kanban empty-state-icon"></i><h3>Kanban Pipeline Coming Soon</h3></div>`;
  },

  renderJobBoard: function () {
    return `
      <div class="grid-3">
        ${window.DB.recruitment.jobs.map(job => `
          <div class="card">
             <div class="card-body">
               <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                 <span class="badge badge-success">${job.status}</span>
                 <span style="color: var(--gray-500); font-size: 0.8rem;">${job.location}</span>
               </div>
               <h4 style="margin-bottom: 8px;">${job.title}</h4>
               <div style="margin-bottom: 16px;">
                 <span class="badge badge-info">${job.department}</span>
                 <span class="badge badge-warning">${job.type}</span>
               </div>
               <div style="font-size: 0.9rem; margin-bottom: 16px; color: var(--gray-600);">
                 <strong>${job.salary}</strong>
               </div>
               
               <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                 <i class="fas fa-users" style="color: var(--primary);"></i>
                 <strong>${job.applicants}</strong> Applicants
               </div>

               <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                 <button class="btn btn-sm btn-outline">Edit</button>
                 <button class="btn btn-sm btn-primary">View</button>
               </div>
             </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderApplicants: function () {
    return `
      <div class="card">
        <div class="table-responsive">
          <table>
             <thead>
               <tr>
                 <th>Candidate</th>
                 <th>Applied For</th>
                 <th>Stage</th>
                 <th>Rating</th>
                 <th>Actions</th>
               </tr>
             </thead>
             <tbody>
               ${window.DB.recruitment.applicants.map(app => `
                 <tr>
                    <td>
                      <div style="font-weight: 500;">${app.name}</div>
                      <small style="color: var(--gray-500);">${app.email}</small>
                    </td>
                    <td>Senior Full Stack Developer</td>
                    <td><span class="badge badge-info">${app.stage}</span></td>
                    <td>${this.renderStars(app.rating)}</td>
                    <td>
                       <button class="btn btn-sm btn-outline"><i class="fas fa-file-pdf"></i></button>
                       <button class="btn btn-sm btn-outline"><i class="fas fa-envelope"></i></button>
                    </td>
                 </tr>
               `).join('')}
             </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderStars: function (rating) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += `<i class="fas fa-star" style="color: ${i < rating ? '#fbbf24' : '#e5e7eb'}; font-size: 0.8rem;"></i>`;
    }
    return stars;
  },

  showPostJobModal: function () {
    const html = `
      <div class="card" style="width: 100%; max-width: 600px; margin: auto;">
         <div class="card-header">
            <h3>Post New Job</h3>
            <button class="btn btn-outline btn-sm" onclick="closeModal('postJobModal')"><i class="fas fa-times"></i></button>
         </div>
         <div class="card-body">
            <div class="form-group">
               <label class="form-label">Job Title</label>
               <input type="text" class="form-control">
            </div>
            <div class="grid-2">
               <div class="form-group"><label class="form-label">Department</label><select class="form-control"><option>IT</option><option>HR</option></select></div>
               <div class="form-group"><label class="form-label">Location</label><input type="text" class="form-control"></div>
            </div>
            <div class="form-group">
               <label class="form-label">Key Requirements</label>
               <textarea class="form-control" rows="4"></textarea>
            </div>
            <button class="btn btn-primary" style="width: 100%;" onclick="closeModal('postJobModal'); Toast.show('Job Posted Successfully', 'success');">Publish Job</button>
         </div>
      </div>
    `;
    showModal('postJobModal', html);
  }
};

window.renderRecruitment = function (container) {
  Recruitment.render(container);
};