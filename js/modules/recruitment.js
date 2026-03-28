// ─── Recruitment Module ────────────────────────────────────────────────────────
const Recruitment = {
  _tab: 'jobs',

  render: function (container) {
    const rec  = window.DB.recruitment || { jobs: [], applicants: [] };
    const jobs = rec.jobs || [];
    const apps = rec.applicants || [];

    const openJobs   = jobs.filter(j => j.status === 'Open').length;
    const totalApps  = apps.length;
    const shortlisted= apps.filter(a => a.stage === 'Interview' || a.stage === 'Offer').length;
    const hired      = apps.filter(a => a.stage === 'Hired').length;

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.25rem;margin:0;">Recruitment</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            ${openJobs} open position${openJobs!==1?'s':''} &bull; ${totalApps} applicant${totalApps!==1?'s':''}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="Recruitment.showAddApplicantModal()">
            <i class="fas fa-user-plus"></i> Add Applicant
          </button>
          <button class="btn btn-primary btn-sm" onclick="Recruitment.showAddJobModal()">
            <i class="fas fa-plus"></i> Post Job
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
        ${[
          ['Open Positions', openJobs,     'primary', 'fas fa-briefcase'],
          ['Total Applicants',totalApps,   'info',    'fas fa-users'],
          ['In Interview',  shortlisted,   'warning', 'fas fa-comments'],
          ['Hired',         hired,         'success', 'fas fa-check-circle'],
        ].map(([l,v,c,icon]) => `
          <div class="card" style="padding:10px 14px;border-left:3px solid var(--${c});">
            <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-400);">${l}</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--${c});">${v}</div>
          </div>`).join('')}
      </div>

      <!-- Tabs -->
      <div class="tabs" style="border-bottom:1px solid var(--gray-200);margin-bottom:16px;">
        <button class="tab-btn ${this._tab==='jobs'?'active':''}"
          onclick="Recruitment._tab='jobs';Recruitment.render(document.getElementById('content'))">
          <i class="fas fa-briefcase"></i> Job Postings (${jobs.length})
        </button>
        <button class="tab-btn ${this._tab==='pipeline'?'active':''}"
          onclick="Recruitment._tab='pipeline';Recruitment.render(document.getElementById('content'))">
          <i class="fas fa-columns"></i> Pipeline
        </button>
        <button class="tab-btn ${this._tab==='applicants'?'active':''}"
          onclick="Recruitment._tab='applicants';Recruitment.render(document.getElementById('content'))">
          <i class="fas fa-list"></i> All Applicants (${apps.length})
        </button>
      </div>

      <div id="recruitTabContent">
        ${this._tab === 'jobs'       ? this.renderJobs(jobs, apps)      : ''}
        ${this._tab === 'pipeline'   ? this.renderPipeline(apps, jobs)  : ''}
        ${this._tab === 'applicants' ? this.renderApplicants(apps, jobs): ''}
      </div>`;
  },

  renderJobs: function (jobs, apps) {
    if (!jobs.length) return `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-briefcase"></i></div>
        <div class="empty-state-title">No Job Postings Yet</div>
        <div class="empty-state-desc">Post a job to start receiving applications.</div>
        <button class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="Recruitment.showAddJobModal()">
          <i class="fas fa-plus"></i> Post First Job
        </button>
      </div>`;

    const statusColors = { Open:'success', Closed:'danger', 'On Hold':'warning' };

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;">
        ${jobs.map(job => {
          const jobApps = apps.filter(a => a.jobId === job.id);
          const sc = statusColors[job.status] || 'gray';
          return `
            <div class="card" style="padding:0;overflow:hidden;">
              <div style="padding:14px 16px;border-bottom:1px solid var(--gray-100);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                  <div>
                    <div style="font-weight:700;font-size:0.9rem;margin-bottom:3px;">${job.title}</div>
                    <div style="font-size:0.72rem;color:var(--gray-500);">
                      ${job.department||'—'} &bull; ${job.employmentType||'Permanent'} &bull; ${job.location||'Not specified'}
                    </div>
                  </div>
                  <span class="badge badge-${sc}" style="font-size:0.65rem;flex-shrink:0;">${job.status}</span>
                </div>
              </div>
              <div style="padding:10px 16px;">
                ${job.salaryMin||job.salaryMax ? `
                  <div style="font-size:0.78rem;color:var(--gray-600);margin-bottom:8px;">
                    <i class="fas fa-money-bill" style="color:var(--success);"></i>
                    ${job.salaryMin ? window.formatCurrency(job.salaryMin) : 'From'} –
                    ${job.salaryMax ? window.formatCurrency(job.salaryMax) : 'Open'}
                  </div>` : ''}
                ${job.description ? `
                  <div style="font-size:0.75rem;color:var(--gray-600);margin-bottom:8px;
                              overflow:hidden;max-height:40px;text-overflow:ellipsis;">
                    ${job.description}
                  </div>` : ''}
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.72rem;margin-bottom:10px;">
                  <div style="color:var(--gray-500);">
                    <i class="fas fa-users"></i> ${jobApps.length} applicant${jobApps.length!==1?'s':''}
                  </div>
                  <div style="color:var(--gray-500);">
                    <i class="fas fa-calendar"></i> ${job.closingDate||'No deadline'}
                  </div>
                  <div style="color:${jobApps.filter(a=>a.stage==='Hired').length?'var(--success)':'var(--gray-400)'};">
                    <i class="fas fa-check"></i> ${jobApps.filter(a=>a.stage==='Hired').length} hired
                  </div>
                  <div style="color:var(--warning);">
                    <i class="fas fa-comments"></i> ${jobApps.filter(a=>a.stage==='Interview').length} interview
                  </div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-primary btn-sm" style="flex:1;font-size:0.72rem;"
                    onclick="Recruitment.showAddApplicantModal('${job.id}')">
                    <i class="fas fa-user-plus"></i> Add Applicant
                  </button>
                  <button class="btn btn-outline btn-sm" onclick="Recruitment.editJob('${job.id}')">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-outline btn-sm" style="color:var(--danger);"
                    onclick="Recruitment.deleteJob('${job.id}')">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  renderPipeline: function (apps, jobs) {
    const stages = ['Applied','Screening','Interview','Offer','Hired','Rejected'];
    const stageColors = {
      Applied:'gray', Screening:'info', Interview:'warning',
      Offer:'primary', Hired:'success', Rejected:'danger'
    };

    if (!apps.length) return `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-columns"></i></div>
        <div class="empty-state-title">No Applicants Yet</div>
        <div class="empty-state-desc">Add applicants to see them in the pipeline.</div>
      </div>`;

    return `
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;overflow-x:auto;min-width:900px;">
        ${stages.map(stage => {
          const stageApps = apps.filter(a => a.stage === stage);
          const sc = stageColors[stage];
          return `
            <div style="background:var(--gray-50);border-radius:8px;border:1px solid var(--gray-200);min-height:200px;">
              <div style="padding:8px 10px;border-bottom:1px solid var(--gray-200);
                          display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;
                             color:var(--${sc});">${stage}</span>
                <span class="badge badge-${sc}" style="font-size:0.6rem;">${stageApps.length}</span>
              </div>
              <div style="padding:8px;display:flex;flex-direction:column;gap:6px;">
                ${stageApps.map(app => {
                  const job = jobs.find(j => j.id === app.jobId);
                  return `
                    <div class="card" style="padding:8px;cursor:pointer;"
                      onclick="Recruitment.viewApplicant('${app.id}')">
                      <div style="font-size:0.78rem;font-weight:600;margin-bottom:2px;">
                        ${app.firstName} ${app.lastName}
                      </div>
                      <div style="font-size:0.68rem;color:var(--gray-500);">
                        ${job?.title||'—'}
                      </div>
                      <div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap;">
                        ${['Interview','Offer','Hired'].filter(s=>s!==stage).map(s => `
                          <button style="font-size:0.6rem;padding:2px 5px;border:none;border-radius:4px;
                            background:var(--${stageColors[s]}-soft,var(--gray-100));
                            color:var(--${stageColors[s]},var(--gray-500));cursor:pointer;"
                            onclick="event.stopPropagation();Recruitment.moveApplicant('${app.id}','${s}')">
                            → ${s}
                          </button>`).join('')}
                      </div>
                    </div>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  renderApplicants: function (apps, jobs) {
    if (!apps.length) return `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-users"></i></div>
        <div class="empty-state-title">No Applicants</div>
        <button class="btn btn-primary btn-sm" style="margin-top:14px;"
          onclick="Recruitment.showAddApplicantModal()">Add Applicant</button>
      </div>`;

    const stageColors = {
      Applied:'gray', Screening:'info', Interview:'warning',
      Offer:'primary', Hired:'success', Rejected:'danger'
    };

    return `
      <div class="table-responsive">
        <table style="font-size:0.82rem;">
          <thead>
            <tr>
              <th>Applicant</th><th>Job</th><th>Stage</th>
              <th>Source</th><th>Applied</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${apps.map(app => {
              const job = jobs.find(j => j.id === app.jobId);
              const sc  = stageColors[app.stage] || 'gray';
              return `
                <tr>
                  <td>
                    <div style="font-weight:600;">${app.firstName} ${app.lastName}</div>
                    <div style="font-size:0.7rem;color:var(--gray-500);">${app.email||'—'}</div>
                  </td>
                  <td style="font-size:0.8rem;">${job?.title||'—'}</td>
                  <td>
                    <select class="form-control" style="font-size:0.72rem;width:auto;padding:3px 6px;"
                      onchange="Recruitment.moveApplicant('${app.id}',this.value)">
                      ${['Applied','Screening','Interview','Offer','Hired','Rejected']
                        .map(s=>`<option ${app.stage===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                  </td>
                  <td style="font-size:0.78rem;">${app.source||'—'}</td>
                  <td style="font-size:0.78rem;">${app.appliedDate||'—'}</td>
                  <td>
                    <div style="display:flex;gap:4px;">
                      <button class="btn-icon" onclick="Recruitment.viewApplicant('${app.id}')">
                        <i class="fas fa-eye"></i>
                      </button>
                      ${app.stage === 'Hired' ? `
                        <button class="btn btn-xs btn-success" style="font-size:0.68rem;"
                          onclick="Recruitment.convertToEmployee('${app.id}')">
                          <i class="fas fa-user-check"></i> Hire
                        </button>` : ''}
                      <button class="btn-icon" style="color:var(--danger);"
                        onclick="Recruitment.deleteApplicant('${app.id}')">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  showAddJobModal: function () {
    const companies   = window.DB.companies  || [];
    const departments = window.DB.departments|| [];
    const html = `
      <div class="card" style="width:100%;max-width:580px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title">Post New Job</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addJobModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Job Title *</label>
            <input id="job_title" class="form-control" placeholder="e.g. Senior Accountant"></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Company</label>
              <select id="job_company" class="form-control">
                <option value="">— All Companies —</option>
                ${companies.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
              </select></div>
            <div class="form-group"><label class="form-label">Department</label>
              <select id="job_dept" class="form-control">
                <option value="">— Select —</option>
                ${departments.map(d=>`<option>${d.name}</option>`).join('')}
              </select></div>
            <div class="form-group"><label class="form-label">Employment Type</label>
              <select id="job_type" class="form-control">
                ${['Permanent','Fixed Term','Part-Time','Casual','Contractor','Internship']
                  .map(t=>`<option>${t}</option>`).join('')}
              </select></div>
            <div class="form-group"><label class="form-label">Location</label>
              <input id="job_location" class="form-control" placeholder="e.g. Johannesburg, Remote"></div>
            <div class="form-group"><label class="form-label">Min Salary (R)</label>
              <input id="job_salMin" type="number" class="form-control" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Max Salary (R)</label>
              <input id="job_salMax" type="number" class="form-control" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Closing Date</label>
              <input id="job_closing" type="date" class="form-control"></div>
            <div class="form-group"><label class="form-label">Status</label>
              <select id="job_status" class="form-control">
                <option>Open</option><option>On Hold</option><option>Closed</option>
              </select></div>
          </div>
          <div class="form-group"><label class="form-label">Job Description</label>
            <textarea id="job_desc" class="form-control" rows="3" placeholder="Describe the role and responsibilities..."></textarea></div>
          <div class="form-group"><label class="form-label">Requirements</label>
            <textarea id="job_reqs" class="form-control" rows="3" placeholder="Qualifications, experience, skills required..."></textarea></div>
          <button class="btn btn-primary" style="width:100%;" onclick="Recruitment.saveJob()">
            <i class="fas fa-briefcase"></i> Post Job
          </button>
        </div>
      </div>`;
    window.showModal('addJobModal', html);
  },

  saveJob: function () {
    const title = document.getElementById('job_title')?.value?.trim();
    if (!title) { window.showAlert('Required', 'Job title is required.'); return; }

    const job = {
      id:             'JOB_' + Date.now(),
      title,
      companyId:      document.getElementById('job_company')?.value        || '',
      department:     document.getElementById('job_dept')?.value           || '',
      employmentType: document.getElementById('job_type')?.value           || 'Permanent',
      location:       document.getElementById('job_location')?.value?.trim()|| '',
      salaryMin:      parseFloat(document.getElementById('job_salMin')?.value||0)||0,
      salaryMax:      parseFloat(document.getElementById('job_salMax')?.value||0)||0,
      closingDate:    document.getElementById('job_closing')?.value        || '',
      status:         document.getElementById('job_status')?.value         || 'Open',
      description:    document.getElementById('job_desc')?.value?.trim()   || '',
      requirements:   document.getElementById('job_reqs')?.value?.trim()   || '',
      postedDate:     new Date().toISOString().split('T')[0],
      createdBy:      window.currentUser?.name||'Admin'
    };

    window.DB.recruitment        = window.DB.recruitment || { jobs:[], applicants:[] };
    window.DB.recruitment.jobs   = window.DB.recruitment.jobs || [];
    window.DB.recruitment.jobs.push(job);
    window.DB.save();
    AuditTrail?.log('CREATE','Job',job.id,{},`Job posted: ${title}`);
    window.Toast.show(`Job "${title}" posted`, 'success');
    window.closeModal('addJobModal');
    this.render(document.getElementById('content'));
  },

  showAddApplicantModal: function (preJobId) {
    const jobs = (window.DB.recruitment?.jobs||[]).filter(j=>j.status==='Open');
    const html = `
      <div class="card" style="width:100%;max-width:520px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title">Add Applicant</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addApplicantModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="grid-2">
            <div class="form-group"><label class="form-label">First Name *</label>
              <input id="app_fn" class="form-control"></div>
            <div class="form-group"><label class="form-label">Last Name *</label>
              <input id="app_ln" class="form-control"></div>
            <div class="form-group"><label class="form-label">Email</label>
              <input id="app_email" type="email" class="form-control"></div>
            <div class="form-group"><label class="form-label">Phone</label>
              <input id="app_phone" class="form-control"></div>
          </div>
          <div class="form-group"><label class="form-label">Applying For *</label>
            <select id="app_job" class="form-control">
              <option value="">— Select Job —</option>
              ${jobs.map(j=>`<option value="${j.id}" ${preJobId===j.id?'selected':''}>${j.title}</option>`).join('')}
            </select></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Stage</label>
              <select id="app_stage" class="form-control">
                ${['Applied','Screening','Interview','Offer','Hired','Rejected']
                  .map(s=>`<option>${s}</option>`).join('')}
              </select></div>
            <div class="form-group"><label class="form-label">Source</label>
              <select id="app_source" class="form-control">
                <option>Direct Application</option><option>LinkedIn</option>
                <option>Referral</option><option>Pnet</option><option>Indeed</option>
                <option>CareerJunction</option><option>Recruitment Agency</option><option>Other</option>
              </select></div>
          </div>
          <div class="form-group"><label class="form-label">Notes</label>
            <textarea id="app_notes" class="form-control" rows="2"></textarea></div>
          <button class="btn btn-primary" style="width:100%;" onclick="Recruitment.saveApplicant()">
            <i class="fas fa-save"></i> Save Applicant
          </button>
        </div>
      </div>`;
    window.showModal('addApplicantModal', html);
  },

  saveApplicant: function () {
    const fn  = document.getElementById('app_fn')?.value?.trim();
    const ln  = document.getElementById('app_ln')?.value?.trim();
    const job = document.getElementById('app_job')?.value;
    if (!fn || !ln) { window.showAlert('Required','First and last name required.'); return; }
    if (!job)       { window.showAlert('Required','Please select a job.'); return; }

    const app = {
      id:          'APP_' + Date.now(),
      jobId:       job,
      firstName:   fn,
      lastName:    ln,
      email:       document.getElementById('app_email')?.value?.trim()||'',
      phone:       document.getElementById('app_phone')?.value?.trim()||'',
      stage:       document.getElementById('app_stage')?.value||'Applied',
      source:      document.getElementById('app_source')?.value||'Direct Application',
      notes:       document.getElementById('app_notes')?.value?.trim()||'',
      appliedDate: new Date().toISOString().split('T')[0],
    };

    window.DB.recruitment           = window.DB.recruitment || { jobs:[], applicants:[] };
    window.DB.recruitment.applicants= window.DB.recruitment.applicants || [];
    window.DB.recruitment.applicants.push(app);
    window.DB.save();
    AuditTrail?.log('CREATE','Applicant',app.id,{},`${fn} ${ln} applied`);
    window.Toast.show(`${fn} ${ln} added`, 'success');
    window.closeModal('addApplicantModal');
    this.render(document.getElementById('content'));
  },

  moveApplicant: function (appId, newStage) {
    const apps = window.DB.recruitment?.applicants || [];
    const app  = apps.find(a => a.id === appId);
    if (!app) return;
    const oldStage = app.stage;
    app.stage  = newStage;
    window.DB.save();
    AuditTrail?.log('UPDATE','Applicant',appId,{stage:{before:oldStage,after:newStage}},`Moved to ${newStage}`);
    window.Toast.show(`${app.firstName} → ${newStage}`, 'success');
    this.render(document.getElementById('content'));
  },

  viewApplicant: function (appId) {
    const app = (window.DB.recruitment?.applicants||[]).find(a=>a.id===appId);
    if (!app) return;
    const job = (window.DB.recruitment?.jobs||[]).find(j=>j.id===app.jobId);
    const stageColors = { Applied:'gray',Screening:'info',Interview:'warning',Offer:'primary',Hired:'success',Rejected:'danger' };

    const html = `
      <div class="card" style="width:100%;max-width:500px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title">${app.firstName} ${app.lastName}</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('viewApplicantModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.82rem;margin-bottom:14px;">
            ${[
              ['Applying for', job?.title||'—'],
              ['Stage', `<span class="badge badge-${stageColors[app.stage]||'gray'}">${app.stage}</span>`],
              ['Email', app.email||'—'],
              ['Phone', app.phone||'—'],
              ['Source', app.source||'—'],
              ['Applied', app.appliedDate||'—'],
            ].map(([l,v]) => `
              <div style="padding:6px 0;border-bottom:1px solid var(--gray-100);">
                <div style="font-size:0.65rem;color:var(--gray-400);text-transform:uppercase;">${l}</div>
                <div>${v}</div>
              </div>`).join('')}
          </div>
          ${app.notes ? `<div style="background:var(--gray-50);padding:10px;border-radius:6px;font-size:0.8rem;margin-bottom:12px;">${app.notes}</div>` : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <select class="form-control" style="flex:1;" onchange="Recruitment.moveApplicant('${app.id}',this.value)">
              ${['Applied','Screening','Interview','Offer','Hired','Rejected']
                .map(s=>`<option ${app.stage===s?'selected':''}>${s}</option>`).join('')}
            </select>
            ${app.stage==='Hired' ? `
              <button class="btn btn-success btn-sm" onclick="Recruitment.convertToEmployee('${app.id}');closeModal('viewApplicantModal')">
                <i class="fas fa-user-check"></i> Convert to Employee
              </button>` : ''}
          </div>
        </div>
      </div>`;
    window.showModal('viewApplicantModal', html);
  },

  convertToEmployee: function (appId) {
    const app = (window.DB.recruitment?.applicants||[]).find(a=>a.id===appId);
    if (!app) return;
    window.showConfirmation('Convert to Employee',
      `Add <strong>${app.firstName} ${app.lastName}</strong> as a new employee?`,
      () => {
        const maxId = (window.DB.employees||[]).reduce((m,e)=>Math.max(m,e.id||0),0);
        const emp = {
          id:        maxId + 1,
          firstName: app.firstName,
          lastName:  app.lastName,
          email:     app.email || '',
          phone:     app.phone || '',
          status:    'Active',
          createdAt: new Date().toISOString().split('T')[0],
          sourceApplicantId: appId
        };
        window.DB.employees = window.DB.employees || [];
        window.DB.employees.push(emp);
        app.stage = 'Hired';
        window.DB.save();
        AuditTrail?.log('CREATE','Employee',emp.id,{},`Hired from recruitment: ${emp.firstName} ${emp.lastName}`);
        window.Toast.show(`${app.firstName} ${app.lastName} added as employee!`, 'success');
        this.render(document.getElementById('content'));
      }
    );
  },

  editJob: function (jobId) {
    const job = (window.DB.recruitment?.jobs||[]).find(j=>j.id===jobId);
    if (!job) return;
    window.showConfirmation('Edit Job',
      `Update status for <strong>${job.title}</strong>:`,
      () => {}
    );
    // Simple status toggle for now
    const newStatus = job.status === 'Open' ? 'Closed' : 'Open';
    job.status = newStatus;
    window.DB.save();
    window.Toast.show(`Job marked as ${newStatus}`, 'success');
    this.render(document.getElementById('content'));
  },

  deleteJob: function (jobId) {
    const job = (window.DB.recruitment?.jobs||[]).find(j=>j.id===jobId);
    if (!job) return;
    window.showConfirmation('Delete Job', `Delete <strong>${job.title}</strong> and all its applications?`, () => {
      window.DB.recruitment.jobs = (window.DB.recruitment?.jobs||[]).filter(j=>j.id!==jobId);
      window.DB.recruitment.applicants = (window.DB.recruitment?.applicants||[]).filter(a=>a.jobId!==jobId);
      window.DB.save();
      window.Toast.show('Job deleted', 'success');
      this.render(document.getElementById('content'));
    });
  },

  deleteApplicant: function (appId) {
    window.showConfirmation('Delete Applicant', 'Delete this applicant record?', () => {
      window.DB.recruitment.applicants = (window.DB.recruitment?.applicants||[]).filter(a=>a.id!==appId);
      window.DB.save();
      window.Toast.show('Applicant deleted', 'success');
      this.render(document.getElementById('content'));
    });
  }
};

window.Recruitment = Recruitment;
window.renderRecruitment = function (container) { Recruitment.render(container); };