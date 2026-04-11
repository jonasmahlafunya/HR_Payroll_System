
const Training = {
  render: function (container) {
    window.DB.trainingRecords = window.DB.trainingRecords || [];
    const records = window.DB.trainingRecords;
    const courses = ['Microsoft Office Advanced', 'Labour Law Fundamentals', 'Project Management (PMP)', 'First Aid Level 1', 'Occupational Health & Safety', 'Financial Management', 'Leadership & Management', 'Customer Service Excellence'];

    container.innerHTML = `
      <div class="page-title-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <div>
          <h2><i class="fas fa-graduation-cap"></i> Training & Development</h2>
          <div style="color:var(--gray-500)">Course catalogue, enrollments and completion tracking</div>
        </div>
        <button class="btn btn-primary" onclick="Training.showEnrollModal()"><i class="fas fa-plus"></i> Enroll Employee</button>
      </div>

      <div class="grid-4" style="margin-bottom:24px;">
        <div class="kpi-card"><div class="kpi-label">Total Records</div><div class="kpi-value">${records.length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Completed</div><div class="kpi-value" style="color:var(--success)">${records.filter(r=>r.status==='Completed').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">In Progress</div><div class="kpi-value" style="color:var(--warning)">${records.filter(r=>r.status==='In Progress').length}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Training Cost</div><div class="kpi-value" style="font-size:1rem;">${window.formatCurrency(records.reduce((s,r)=>s+(r.cost||0),0))}</div></div>
      </div>

      <div class="grid-2" style="margin-bottom:24px;">
        <div class="card">
          <div class="card-header"><h4>Course Catalogue</h4></div>
          <div class="card-body">
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${courses.map(c => `<div style="background:var(--primary-soft,#ede9fe);padding:6px 14px;border-radius:20px;font-size:0.8rem;font-weight:500;cursor:pointer;" onclick="Training.quickEnroll('${c}')">${c}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h4>Quick Stats</h4></div>
          <div class="card-body">
            ${[...new Set(records.map(r => r.course))].slice(0,5).map(course => {
              const done = records.filter(r => r.course === course && r.status === 'Completed').length;
              const total = records.filter(r => r.course === course).length;
              return `<div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.82rem;"><span>${course}</span><span>${done}/${total}</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width:${total>0?(done/total*100):0}%"></div></div>
              </div>`;
            }).join('') || '<div style="color:var(--gray-500);padding:12px;text-align:center">No training records yet.</div>'}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h4>Training Records</h4></div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Employee</th><th>Course</th><th>Provider</th><th>Date</th><th>Duration</th><th>Cost</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${records.length ? records.map(r => {
                const emp = window.DB.employees.find(e => e.id === r.employeeId);
                return `<tr>
                  <td>${emp ? `${emp.firstName} ${emp.lastName}` : '—'}</td>
                  <td style="font-weight:500">${r.course}</td>
                  <td>${r.provider || '—'}</td>
                  <td>${r.date}</td>
                  <td>${r.duration || '1 day'}</td>
                  <td>${r.cost ? window.formatCurrency(r.cost) : '—'}</td>
                  <td><span class="badge badge-${r.status==='Completed'?'success':r.status==='In Progress'?'warning':'gray'}">${r.status}</span></td>
                  <td>
                    ${r.status !== 'Completed' ? `<button class="btn-icon" title="Mark Complete" onclick="Training.markComplete(${r.id})"><i class="fas fa-check-circle" style="color:var(--success)"></i></button>` : ''}
                    <button class="btn-icon text-danger" onclick="Training.deleteRecord(${r.id})"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>`;
              }).join('') : '<tr><td colspan="8" class="text-center" style="padding:24px;color:var(--gray-500)">No training records. Enroll an employee to get started.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  showEnrollModal: function (defaultCourse = '') {
    const empOptions = window.DB.employees.filter(e => e.status === 'Active').map(e => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('');
    const html = `
      <div class="card" style="width:100%;max-width:520px;margin:auto;">
        <div class="card-header"><h4>Enroll Employee in Training</h4><button class="btn btn-outline btn-sm" onclick="closeModal('trainModal')"><i class="fas fa-times"></i></button></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Employee</label><select id="tr_emp" class="form-control">${empOptions}</select></div>
          <div class="form-group"><label class="form-label">Course</label><input type="text" id="tr_course" class="form-control" value="${defaultCourse}" placeholder="Course name"></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Provider</label><input type="text" id="tr_provider" class="form-control" placeholder="e.g. Unisa"></div>
            <div class="form-group"><label class="form-label">Date</label><input type="date" id="tr_date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label class="form-label">Duration</label><input type="text" id="tr_duration" class="form-control" placeholder="e.g. 2 days"></div>
            <div class="form-group"><label class="form-label">Cost (R)</label><input type="number" id="tr_cost" class="form-control" value="0"></div>
          </div>
          <button class="btn btn-primary" style="width:100%" onclick="Training.saveRecord()">Enroll</button>
        </div>
      </div>`;
    window.showModal('trainModal', html);
  },

  quickEnroll: function (course) { this.showEnrollModal(course); },

  saveRecord: function () {
    window.DB.trainingRecords = window.DB.trainingRecords || [];
    window.DB.trainingRecords.unshift({
      id: Date.now(),
      employeeId: parseInt(document.getElementById('tr_emp').value),
      course:     document.getElementById('tr_course').value,
      provider:   document.getElementById('tr_provider').value,
      date:       document.getElementById('tr_date').value,
      duration:   document.getElementById('tr_duration').value,
      cost:       parseFloat(document.getElementById('tr_cost').value) || 0,
      status: 'In Progress'
    });
    window.DB.save();
    window.Toast.show('Employee enrolled', 'success');
    closeModal('trainModal');
    this.render(document.getElementById('content'));
  },

  markComplete: function (id) {
    const rec = (window.DB.trainingRecords || []).find(r => r.id === id);
    if (rec) { rec.status = 'Completed'; rec.completedAt = new Date().toISOString(); }
    window.DB.save();
    window.Toast.show('Marked as completed', 'success');
    this.render(document.getElementById('content'));
  },

  deleteRecord: function (id) {
    window.DB.trainingRecords = (window.DB.trainingRecords || []).filter(r => r.id !== id);
    window.DB.save();
    this.render(document.getElementById('content'));
  }
};

window.renderTraining = function (container) { Training.render(container); };
