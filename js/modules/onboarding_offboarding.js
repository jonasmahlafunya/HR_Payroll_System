// ─── Onboarding & Offboarding Module ─────────────────────────────────────────
const OnboardingOffboarding = {
  _tab: 'onboarding',

  // Default task templates
  ONBOARDING_TASKS: [
    { key:'welcome',       label:'Send welcome email & first-day info',       category:'HR' },
    { key:'paperwork',     label:'Complete employment contracts & forms',      category:'HR' },
    { key:'it_account',    label:'Set up IT accounts (email, systems access)', category:'IT' },
    { key:'equipment',     label:'Issue laptop, phone & access card',          category:'IT' },
    { key:'office_tour',   label:'Office tour & team introductions',           category:'HR' },
    { key:'induction',     label:'Company induction & culture session',        category:'HR' },
    { key:'payroll',       label:'Add to payroll & confirm banking details',   category:'Payroll' },
    { key:'leave_setup',   label:'Set up leave balances',                      category:'HR' },
    { key:'medical_aid',   label:'Enrol in medical aid (if applicable)',       category:'Benefits' },
    { key:'30_day',        label:'30-day check-in with manager',               category:'HR' },
    { key:'probation',     label:'Schedule probation review date',             category:'HR' },
  ],

  OFFBOARDING_TASKS: [
    { key:'resignation',   label:'Receive and acknowledge resignation letter', category:'HR' },
    { key:'exit_date',     label:'Confirm last working day',                   category:'HR' },
    { key:'handover',      label:'Complete knowledge & project handover',      category:'Manager' },
    { key:'it_revoke',     label:'Revoke IT access & collect equipment',       category:'IT' },
    { key:'access_card',   label:'Collect access card, keys & parking disc',  category:'Ops' },
    { key:'final_payroll', label:'Process final salary & leave payout',        category:'Payroll' },
    { key:'irp5',          label:'Issue IRP5 / tax certificate',               category:'Payroll' },
    { key:'uif_filing',    label:'Submit UIF termination declaration (U-19)',  category:'HR' },
    { key:'exit_interview',label:'Conduct exit interview',                     category:'HR' },
    { key:'blacklist_check',label:'Note re-hire eligibility',                  category:'HR' },
    { key:'reference',     label:'Prepare reference letter if applicable',     category:'HR' },
  ],

  render: function (container) {
    const ob = (window.DB.onboarding  || []);
    const off= (window.DB.offboarding || []);
    const employees = window.DB.employees || [];

    const activeOB  = ob.filter(o=>o.status==='In Progress').length;
    const activeOff = off.filter(o=>o.status==='In Progress').length;
    const completedOB  = ob.filter(o=>o.status==='Completed').length;
    const completedOff = off.filter(o=>o.status==='Completed').length;

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.25rem;margin:0;">Onboarding &amp; Offboarding</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            ${activeOB} onboarding &bull; ${activeOff} offboarding in progress
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="OnboardingOffboarding.startOffboarding()">
            <i class="fas fa-door-open"></i> Start Offboarding
          </button>
          <button class="btn btn-primary btn-sm" onclick="OnboardingOffboarding.startOnboarding()">
            <i class="fas fa-user-plus"></i> Start Onboarding
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
        ${[
          ['Onboarding Active',  activeOB,   'primary', 'fas fa-user-plus'],
          ['Onboarding Done',    completedOB,'success', 'fas fa-check-circle'],
          ['Offboarding Active', activeOff,  'warning', 'fas fa-door-open'],
          ['Offboarding Done',   completedOff,'gray',   'fas fa-check'],
        ].map(([l,v,c,icon]) => `
          <div class="card" style="padding:10px 14px;border-left:3px solid var(--${c});">
            <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-400);">${l}</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--${c});">${v}</div>
          </div>`).join('')}
      </div>

      <!-- Tabs -->
      <div class="tabs" style="border-bottom:1px solid var(--gray-200);margin-bottom:16px;">
        <button class="tab-btn ${this._tab==='onboarding'?'active':''}"
          onclick="OnboardingOffboarding._tab='onboarding';OnboardingOffboarding.render(document.getElementById('content'))">
          <i class="fas fa-user-plus"></i> Onboarding (${ob.length})
        </button>
        <button class="tab-btn ${this._tab==='offboarding'?'active':''}"
          onclick="OnboardingOffboarding._tab='offboarding';OnboardingOffboarding.render(document.getElementById('content'))">
          <i class="fas fa-door-open"></i> Offboarding (${off.length})
        </button>
      </div>

      <div id="obTabContent">
        ${this._tab === 'onboarding'  ? this.renderList(ob,  'Onboarding',  employees) : ''}
        ${this._tab === 'offboarding' ? this.renderList(off, 'Offboarding', employees) : ''}
      </div>`;
  },

  renderList: function (list, type, employees) {
    const icon   = type === 'Onboarding' ? 'fas fa-user-plus' : 'fas fa-door-open';
    const color  = type === 'Onboarding' ? 'primary' : 'warning';

    if (!list.length) return `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="${icon}"></i></div>
        <div class="empty-state-title">No ${type} Processes</div>
        <div class="empty-state-desc">Start a ${type.toLowerCase()} process for an employee.</div>
        <button class="btn btn-primary btn-sm" style="margin-top:14px;"
          onclick="OnboardingOffboarding.start${type}()">
          <i class="fas fa-plus"></i> Start ${type}
        </button>
      </div>`;

    return `
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${list.map(ob => {
          const emp   = employees.find(e => e.id == ob.employeeId);
          const tasks = ob.tasks || [];
          const done  = tasks.filter(t=>t.done).length;
          const total = tasks.length || 1;
          const pct   = Math.round((done/total)*100);
          const statusColor = ob.status==='Completed'?'success':ob.status==='In Progress'?color:'gray';

          return `
            <div class="card" style="padding:0;overflow:hidden;">
              <div style="padding:12px 16px;border-bottom:1px solid var(--gray-100);
                          display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:36px;height:36px;border-radius:50%;background:var(--${color}-soft,var(--primary-soft));
                              color:var(--${color},var(--primary));display:flex;align-items:center;justify-content:center;
                              font-weight:700;font-size:0.8rem;flex-shrink:0;">
                    ${emp ? emp.firstName.charAt(0)+emp.lastName.charAt(0) : '?'}
                  </div>
                  <div>
                    <div style="font-weight:700;font-size:0.9rem;">
                      ${emp ? emp.firstName+' '+emp.lastName : 'Unknown Employee'}
                    </div>
                    <div style="font-size:0.72rem;color:var(--gray-500);">
                      ${emp?.position||'—'} &bull; Started: ${ob.startDate||'—'}
                      ${ob.targetDate ? ` &bull; Target: ${ob.targetDate}` : ''}
                    </div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="text-align:center;">
                    <div style="font-size:1.1rem;font-weight:800;color:var(--${color});">${pct}%</div>
                    <div style="font-size:0.65rem;color:var(--gray-400);">${done}/${total} tasks</div>
                  </div>
                  <span class="badge badge-${statusColor}">${ob.status||'In Progress'}</span>
                  <button class="btn btn-outline btn-sm"
                    onclick="OnboardingOffboarding.viewProcess('${ob.id}','${type}')">
                    <i class="fas fa-tasks"></i> Manage
                  </button>
                  ${ob.status!=='Completed' ? `
                    <button class="btn btn-success btn-xs" style="font-size:0.7rem;"
                      onclick="OnboardingOffboarding.markComplete('${ob.id}','${type}')">
                      <i class="fas fa-check"></i>
                    </button>` : ''}
                  <button class="btn-icon" style="color:var(--danger);"
                    onclick="OnboardingOffboarding.deleteProcess('${ob.id}','${type}')">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <!-- Progress bar -->
              <div style="height:4px;background:var(--gray-100);">
                <div style="height:100%;width:${pct}%;background:var(--${color});transition:width 0.4s;"></div>
              </div>

              <!-- Task mini-summary -->
              <div style="padding:10px 16px;display:flex;gap:8px;flex-wrap:wrap;">
                ${tasks.slice(0,6).map(t => `
                  <div style="display:flex;align-items:center;gap:5px;font-size:0.72rem;
                              color:${t.done?'var(--success)':'var(--gray-500)'};cursor:pointer;"
                       onclick="OnboardingOffboarding.toggleTask('${ob.id}','${t.key}','${type}')">
                    <i class="fas fa-${t.done?'check-circle':'circle'}" style="font-size:0.75rem;"></i>
                    <span style="text-decoration:${t.done?'line-through':'none'};">${t.label.slice(0,30)}</span>
                  </div>`).join('')}
                ${tasks.length > 6 ? `<div style="font-size:0.72rem;color:var(--gray-400);">+${tasks.length-6} more</div>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  viewProcess: function (obId, type) {
    const list   = type === 'Onboarding' ? (window.DB.onboarding||[]) : (window.DB.offboarding||[]);
    const ob     = list.find(o => o.id === obId);
    const emp    = (window.DB.employees||[]).find(e => e.id == ob?.employeeId);
    if (!ob) return;

    const color  = type === 'Onboarding' ? 'primary' : 'warning';
    const tasks  = ob.tasks || [];

    const html = `
      <div class="card" style="width:100%;max-width:580px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <div>
            <h3 class="card-title">${type} — ${emp ? emp.firstName+' '+emp.lastName : 'Employee'}</h3>
            <div style="font-size:0.72rem;color:var(--gray-500);">
              Started: ${ob.startDate||'—'} &bull; ${tasks.filter(t=>t.done).length}/${tasks.length} tasks complete
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="closeModal('obModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body" style="padding:0;">
          ${['HR','IT','Payroll','Manager','Benefits','Ops'].map(cat => {
            const catTasks = tasks.filter(t => t.category === cat);
            if (!catTasks.length) return '';
            return `
              <div style="border-bottom:1px solid var(--gray-100);">
                <div style="padding:8px 16px;background:var(--gray-50);font-size:0.7rem;
                            font-weight:700;text-transform:uppercase;color:var(--gray-500);">${cat}</div>
                ${catTasks.map(task => `
                  <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 16px;
                                cursor:pointer;border-bottom:1px solid var(--gray-50);">
                    <input type="checkbox" style="width:15px;height:15px;margin-top:1px;flex-shrink:0;"
                      ${task.done?'checked':''}
                      onchange="OnboardingOffboarding.toggleTask('${ob.id}','${task.key}','${type}');
                                this.closest('.card-body').innerHTML=OnboardingOffboarding._renderTaskBody('${ob.id}','${type}')">
                    <div>
                      <div style="font-size:0.82rem;${task.done?'text-decoration:line-through;color:var(--gray-400);':''}">${task.label}</div>
                      ${task.completedAt ? `<div style="font-size:0.68rem;color:var(--success);">Done: ${new Date(task.completedAt).toLocaleDateString()}</div>` : ''}
                    </div>
                  </label>`).join('')}
              </div>`;
          }).join('')}
          <div style="padding:12px 16px;">
            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea id="ob_notes_${obId}" class="form-control" rows="2">${ob.notes||''}</textarea>
            </div>
            <button class="btn btn-primary btn-sm" onclick="OnboardingOffboarding.saveNotes('${obId}','${type}')">
              <i class="fas fa-save"></i> Save Notes
            </button>
          </div>
        </div>
      </div>`;
    window.showModal('obModal', html);
  },

  toggleTask: function (obId, taskKey, type) {
    const list = type === 'Onboarding' ? (window.DB.onboarding||[]) : (window.DB.offboarding||[]);
    const ob   = list.find(o => o.id === obId);
    if (!ob) return;
    const task = (ob.tasks||[]).find(t => t.key === taskKey);
    if (!task) return;
    task.done = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : null;

    // Auto-complete if all tasks done
    if (ob.tasks.every(t => t.done)) ob.status = 'Completed';
    else if (ob.tasks.some(t => t.done)) ob.status = 'In Progress';

    window.DB.save();
    // Refresh main page in background (modal stays open)
  },

  saveNotes: function (obId, type) {
    const list = type === 'Onboarding' ? (window.DB.onboarding||[]) : (window.DB.offboarding||[]);
    const ob   = list.find(o => o.id === obId);
    if (!ob) return;
    ob.notes = document.getElementById(`ob_notes_${obId}`)?.value || '';
    window.DB.save();
    window.Toast.show('Notes saved', 'success');
  },

  markComplete: function (obId, type) {
    const list = type === 'Onboarding' ? (window.DB.onboarding||[]) : (window.DB.offboarding||[]);
    const ob   = list.find(o => o.id === obId);
    if (!ob) return;
    ob.status      = 'Completed';
    ob.completedAt = new Date().toISOString();
    ob.tasks.forEach(t => { if (!t.done) { t.done=true; t.completedAt=ob.completedAt; }});
    window.DB.save();
    window.Toast.show(`${type} marked as complete`, 'success');
    this.render(document.getElementById('content'));
  },

  deleteProcess: function (obId, type) {
    window.showConfirmation('Delete Process', 'Delete this process record?', () => {
      if (type==='Onboarding') window.DB.onboarding  = (window.DB.onboarding||[]).filter(o=>o.id!==obId);
      else                     window.DB.offboarding = (window.DB.offboarding||[]).filter(o=>o.id!==obId);
      window.DB.save();
      window.Toast.show('Deleted', 'success');
      this.render(document.getElementById('content'));
    });
  },

  startOnboarding: function () {
    const employees = (window.DB.employees||[]).filter(e=>e.status==='Active');
    const today     = new Date().toISOString().split('T')[0];
    const html = `
      <div class="card" style="width:100%;max-width:460px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title">Start Onboarding</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('startOBModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Employee *</label>
            <select id="ob_emp" class="form-control">
              <option value="">— Select Employee —</option>
              ${employees.map(e=>`<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('')}
            </select></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Start Date</label>
              <input id="ob_start" type="date" class="form-control" value="${today}"></div>
            <div class="form-group"><label class="form-label">Target Completion</label>
              <input id="ob_target" type="date" class="form-control"></div>
          </div>
          <div class="form-group"><label class="form-label">Assigned To (HR)</label>
            <input id="ob_assigned" class="form-control" value="${window.currentUser?.name||'HR Manager'}"></div>
          <button class="btn btn-primary" style="width:100%;"
            onclick="OnboardingOffboarding._createProcess('Onboarding')">
            <i class="fas fa-play"></i> Start Onboarding Process
          </button>
        </div>
      </div>`;
    window.showModal('startOBModal', html);
  },

  startOffboarding: function () {
    const employees = (window.DB.employees||[]).filter(e=>e.status==='Active');
    const today     = new Date().toISOString().split('T')[0];
    const html = `
      <div class="card" style="width:100%;max-width:460px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title">Start Offboarding</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('startOffModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Employee *</label>
            <select id="off_emp" class="form-control">
              <option value="">— Select Employee —</option>
              ${employees.map(e=>`<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('')}
            </select></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Start Date</label>
              <input id="off_start" type="date" class="form-control" value="${today}"></div>
            <div class="form-group"><label class="form-label">Last Working Day</label>
              <input id="off_target" type="date" class="form-control"></div>
          </div>
          <div class="form-group"><label class="form-label">Reason for Leaving</label>
            <select id="off_reason" class="form-control">
              <option>Resignation</option><option>Retrenchment</option>
              <option>End of Contract</option><option>Retirement</option>
              <option>Dismissal</option><option>Other</option>
            </select></div>
          <button class="btn btn-warning" style="width:100%;color:white;"
            onclick="OnboardingOffboarding._createProcess('Offboarding')">
            <i class="fas fa-door-open"></i> Start Offboarding Process
          </button>
        </div>
      </div>`;
    window.showModal('startOffModal', html);
  },

  _createProcess: function (type) {
    const isOn  = type === 'Onboarding';
    const empEl = document.getElementById(isOn ? 'ob_emp' : 'off_emp');
    const empId = empEl?.value;
    if (!empId) { window.showAlert('Required','Please select an employee.'); return; }

    const templates = isOn ? this.ONBOARDING_TASKS : this.OFFBOARDING_TASKS;
    const ob = {
      id:          (isOn?'OB_':'OFF_') + Date.now(),
      employeeId:  parseInt(empId),
      type,
      status:      'In Progress',
      startDate:   document.getElementById(isOn?'ob_start':'off_start')?.value || '',
      targetDate:  document.getElementById(isOn?'ob_target':'off_target')?.value || '',
      assignedTo:  isOn ? (document.getElementById('ob_assigned')?.value||'HR Manager') : '',
      reason:      isOn ? '' : (document.getElementById('off_reason')?.value||'Resignation'),
      notes:       '',
      tasks:       templates.map(t => ({ ...t, done: false, completedAt: null })),
      createdAt:   new Date().toISOString()
    };

    if (isOn) {
      window.DB.onboarding = window.DB.onboarding || [];
      window.DB.onboarding.push(ob);
    } else {
      window.DB.offboarding = window.DB.offboarding || [];
      window.DB.offboarding.push(ob);
      // Auto-set employee status to Terminated
      const emp = (window.DB.employees||[]).find(e=>e.id==empId);
      if (emp) {
        emp.status = 'Terminated';
        emp.terminatedAt = ob.targetDate || new Date().toISOString().split('T')[0];
      }
    }

    window.DB.save();
    const emp = (window.DB.employees||[]).find(e=>e.id==empId);
    AuditTrail?.log('CREATE', type, ob.id, {}, `${type} started for ${emp?.firstName||''} ${emp?.lastName||''}`);
    window.Toast.show(`${type} process started!`, 'success');
    window.closeModal(isOn?'startOBModal':'startOffModal');
    this._tab = isOn ? 'onboarding' : 'offboarding';
    this.render(document.getElementById('content'));
  }
};

window.OnboardingOffboarding = OnboardingOffboarding;
window.renderOnboarding   = function (container) { OnboardingOffboarding._tab='onboarding';  OnboardingOffboarding.render(container); };
window.renderOffboarding  = function (container) { OnboardingOffboarding._tab='offboarding'; OnboardingOffboarding.render(container); };
