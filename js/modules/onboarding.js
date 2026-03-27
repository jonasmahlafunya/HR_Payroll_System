// ─── Onboarding Module ────────────────────────────────────────────────────────
const Onboarding = {

  TASKS: [
    { key:'welcome',       label:'Send welcome email & first-day pack',        category:'HR',      required:true },
    { key:'paperwork',     label:'Complete employment contracts & SARS forms',  category:'HR',      required:true },
    { key:'it_account',    label:'Set up email & system accounts',              category:'IT',      required:true },
    { key:'equipment',     label:'Issue laptop, phone & access card',           category:'IT',      required:false },
    { key:'office_tour',   label:'Office tour & team introductions',            category:'HR',      required:false },
    { key:'induction',     label:'Company induction & culture session',         category:'HR',      required:true },
    { key:'payroll',       label:'Add to payroll & confirm banking details',    category:'Payroll', required:true },
    { key:'leave_setup',   label:'Set up leave balances in the system',         category:'HR',      required:true },
    { key:'medical_aid',   label:'Enrol in medical aid (if applicable)',        category:'Benefits',required:false },
    { key:'provident',     label:'Enrol in pension/provident fund',             category:'Benefits',required:false },
    { key:'30_day',        label:'30-day check-in meeting with manager',        category:'HR',      required:false },
    { key:'probation',     label:'Schedule probation review date',              category:'HR',      required:true },
    { key:'health_safety', label:'Health & Safety orientation',                 category:'Ops',     required:false },
    { key:'it_security',   label:'IT security & acceptable use policy sign-off',category:'IT',      required:true },
  ],

  render: function (container) {
    const list      = window.DB.onboarding || [];
    const employees = window.DB.employees  || [];
    const companies = window.DB.companies  || [];

    const active    = list.filter(o => o.status === 'In Progress');
    const completed = list.filter(o => o.status === 'Completed');
    const overdue   = list.filter(o => {
      if (o.status === 'Completed') return false;
      return o.targetDate && new Date(o.targetDate) < new Date();
    });

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;
                  margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.3rem;margin:0;">Onboarding</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            ${active.length} in progress &bull; ${completed.length} completed
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Onboarding.startModal()">
          <i class="fas fa-user-plus"></i> Start Onboarding
        </button>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;">
        ${[
          ['Active',    active.length,    'primary', 'fas fa-spinner'],
          ['Completed', completed.length, 'success', 'fas fa-check-circle'],
          ['Overdue',   overdue.length,   'danger',  'fas fa-exclamation-circle'],
          ['Total',     list.length,      'gray',    'fas fa-list'],
        ].map(([l,v,c,icon]) => `
          <div class="card" style="padding:12px 14px;border-left:3px solid var(--${c});">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-400);">${l}</div>
                <div style="font-size:1.5rem;font-weight:800;color:var(--${c});">${v}</div>
              </div>
              <i class="${icon}" style="font-size:1.2rem;color:var(--${c});opacity:0.4;"></i>
            </div>
          </div>`).join('')}
      </div>

      ${!list.length ? `
        <div class="empty-state" style="padding:60px 0;">
          <div class="empty-state-icon"><i class="fas fa-user-plus"></i></div>
          <div class="empty-state-title">No Onboarding Processes</div>
          <div class="empty-state-desc">
            Start an onboarding process when a new employee joins.
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:16px;"
            onclick="Onboarding.startModal()">
            <i class="fas fa-plus"></i> Start Onboarding
          </button>
        </div>` : `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${list.slice().reverse().map(ob => this.renderCard(ob, employees)).join('')}
        </div>`}`;
  },

  renderCard: function (ob, employees) {
    const emp    = employees.find(e => e.id == ob.employeeId);
    const tasks  = ob.tasks || [];
    const done   = tasks.filter(t => t.done).length;
    const total  = tasks.length || 1;
    const pct    = Math.round((done / total) * 100);
    const isOver = ob.status !== 'Completed' && ob.targetDate && new Date(ob.targetDate) < new Date();
    const statusColor = ob.status==='Completed'?'success': isOver?'danger':'primary';
    const statusLabel = ob.status==='Completed'?'Completed': isOver?'Overdue':'In Progress';

    return `
      <div class="card" style="padding:0;overflow:hidden;
           border-left:4px solid var(--${statusColor});">

        <div style="padding:14px 18px;display:flex;align-items:center;
                    justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;border-radius:50%;
                        background:var(--primary-soft);color:var(--primary);
                        display:flex;align-items:center;justify-content:center;
                        font-weight:700;font-size:0.9rem;flex-shrink:0;">
              ${emp ? emp.firstName.charAt(0)+emp.lastName.charAt(0) : '?'}
            </div>
            <div>
              <div style="font-weight:700;font-size:0.95rem;">
                ${emp ? emp.firstName+' '+emp.lastName : 'Unknown Employee'}
              </div>
              <div style="font-size:0.73rem;color:var(--gray-500);">
                ${emp?.position||'—'}
                ${emp?.companyName ? ' &bull; '+emp.companyName : ''}
                &bull; Started: ${ob.startDate||'—'}
                ${ob.targetDate ? ` &bull; Target: <span style="color:${isOver?'var(--danger)':'inherit'}">${ob.targetDate}</span>` : ''}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="text-align:center;">
              <div style="font-size:1.3rem;font-weight:800;color:var(--${statusColor});">${pct}%</div>
              <div style="font-size:0.65rem;color:var(--gray-400);">${done}/${total} tasks</div>
            </div>
            <span class="badge badge-${statusColor}">${statusLabel}</span>
            <button class="btn btn-outline btn-sm"
              onclick="Onboarding.manageModal('${ob.id}')">
              <i class="fas fa-tasks"></i> Manage
            </button>
            ${ob.status !== 'Completed' ? `
              <button class="btn btn-success btn-sm"
                onclick="Onboarding.markComplete('${ob.id}')">
                <i class="fas fa-check"></i> Complete
              </button>` : ''}
            <button class="btn-icon" style="color:var(--danger);"
              onclick="Onboarding.deleteProcess('${ob.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <!-- Progress bar -->
        <div style="height:5px;background:var(--gray-100);">
          <div style="height:100%;width:${pct}%;background:var(--${statusColor});
                      transition:width 0.4s ease;"></div>
        </div>

        <!-- Task quick-view -->
        <div style="padding:10px 18px;display:flex;flex-wrap:wrap;gap:6px 12px;">
          ${tasks.slice(0,8).map(t => `
            <div style="display:flex;align-items:center;gap:4px;font-size:0.72rem;
                        color:${t.done?'var(--success)':'var(--gray-500)'};cursor:pointer;"
                 onclick="Onboarding._toggleTask('${ob.id}','${t.key}')">
              <i class="fas fa-${t.done?'check-circle':'circle'}"
                 style="font-size:0.75rem;"></i>
              <span style="text-decoration:${t.done?'line-through':'none'};">
                ${t.label.length > 35 ? t.label.slice(0,35)+'…' : t.label}
              </span>
            </div>`).join('')}
          ${tasks.length > 8 ? `<div style="font-size:0.7rem;color:var(--gray-400);">
            +${tasks.length-8} more tasks</div>` : ''}
        </div>
      </div>`;
  },

  startModal: function () {
    const employees = (window.DB.employees||[]).filter(e=>e.status==='Active');
    const today     = new Date().toISOString().split('T')[0];
    const html = `
      <div class="card" style="width:100%;max-width:500px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-user-plus text-primary"></i> Start Onboarding</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('startOBModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Employee *</label>
            <select id="ob_emp" class="form-control">
              <option value="">— Select Employee —</option>
              ${employees.map(e=>`<option value="${e.id}">${e.firstName} ${e.lastName}${e.companyName?' ('+e.companyName+')':''}</option>`).join('')}
            </select>
          </div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Onboarding Start Date</label>
              <input id="ob_start" type="date" class="form-control" value="${today}">
            </div>
            <div class="form-group"><label class="form-label">Target Completion Date</label>
              <input id="ob_target" type="date" class="form-control">
              <div class="form-hint">Usually 30–90 days from start</div>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Assigned HR Officer</label>
            <input id="ob_assigned" class="form-control"
              value="${window.currentUser?.name||'HR Manager'}">
          </div>
          <div class="form-group"><label class="form-label">Notes</label>
            <textarea id="ob_notes" class="form-control" rows="2"
              placeholder="Any special instructions..."></textarea>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:4px;"
            onclick="Onboarding.create()">
            <i class="fas fa-play"></i> Start Onboarding Process
          </button>
        </div>
      </div>`;
    window.showModal('startOBModal', html);
  },

  create: function () {
    const empId = document.getElementById('ob_emp')?.value;
    if (!empId) { window.showAlert('Required','Please select an employee.'); return; }

    const ob = {
      id:         'OB_'+Date.now(),
      employeeId: parseInt(empId),
      type:       'Onboarding',
      status:     'In Progress',
      startDate:  document.getElementById('ob_start')?.value  || '',
      targetDate: document.getElementById('ob_target')?.value || '',
      assignedTo: document.getElementById('ob_assigned')?.value?.trim()||'HR Manager',
      notes:      document.getElementById('ob_notes')?.value?.trim()   ||'',
      tasks:      this.TASKS.map(t=>({...t, done:false, completedAt:null})),
      createdAt:  new Date().toISOString()
    };

    window.DB.onboarding = window.DB.onboarding || [];
    // Prevent duplicate for same employee
    if (window.DB.onboarding.some(o=>o.employeeId==empId&&o.status==='In Progress')) {
      window.showAlert('Already Active','This employee already has an active onboarding process.'); return;
    }
    window.DB.onboarding.push(ob);
    window.DB.save();

    const emp = (window.DB.employees||[]).find(e=>e.id==empId);
    if (typeof AuditTrail !== 'undefined') {
      AuditTrail.log('CREATE','Onboarding',ob.id,{},
        `Onboarding started for ${emp?.firstName||''} ${emp?.lastName||''}`);
    }

    window.Toast.show(`Onboarding started for ${emp?.firstName||'employee'}!`, 'success');
    window.closeModal('startOBModal');
    this.render(document.getElementById('content'));
  },

  manageModal: function (obId) {
    const ob  = (window.DB.onboarding||[]).find(o=>o.id===obId);
    const emp = (window.DB.employees||[]).find(e=>e.id==ob?.employeeId);
    if (!ob) return;

    const tasks    = ob.tasks || [];
    const done     = tasks.filter(t=>t.done).length;
    const cats     = [...new Set(tasks.map(t=>t.category))];

    const html = `
      <div class="card" style="width:100%;max-width:600px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <div>
            <h3 class="card-title">
              Onboarding — ${emp ? emp.firstName+' '+emp.lastName : 'Employee'}
            </h3>
            <div style="font-size:0.73rem;color:var(--gray-500);">
              ${done}/${tasks.length} tasks complete &bull; ${ob.startDate||'—'} – ${ob.targetDate||'ongoing'}
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="closeModal('obManageModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div id="obTaskContent_${obId}" class="card-body" style="padding:0;">
          ${this._renderTaskList(ob)}
        </div>

        <div style="padding:14px 18px;border-top:1px solid var(--gray-100);">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Notes</label>
            <textarea id="obNotes_${obId}" class="form-control" rows="2">${ob.notes||''}</textarea>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn btn-outline btn-sm"
              onclick="Onboarding._saveNotes('${obId}')">
              <i class="fas fa-save"></i> Save Notes
            </button>
            ${ob.status !== 'Completed' ? `
              <button class="btn btn-success btn-sm"
                onclick="Onboarding.markComplete('${obId}');closeModal('obManageModal')">
                <i class="fas fa-check"></i> Mark All Complete
              </button>` : ''}
          </div>
        </div>
      </div>`;
    window.showModal('obManageModal', html);
  },

  _renderTaskList: function (ob) {
    const tasks = ob.tasks || [];
    const cats  = [...new Set(tasks.map(t=>t.category))];
    return cats.map(cat => {
      const catTasks = tasks.filter(t=>t.category===cat);
      return `
        <div style="border-bottom:1px solid var(--gray-100);">
          <div style="padding:8px 18px;background:var(--gray-50);font-size:0.68rem;
                      font-weight:700;text-transform:uppercase;letter-spacing:0.5px;
                      color:var(--gray-500);">${cat}</div>
          ${catTasks.map(task => `
            <label style="display:flex;align-items:flex-start;gap:12px;padding:11px 18px;
                          cursor:pointer;border-bottom:1px solid var(--gray-50);transition:background 0.1s;"
                   onmouseenter="this.style.background='var(--gray-50)'"
                   onmouseleave="this.style.background=''">
              <input type="checkbox" style="width:16px;height:16px;margin-top:1px;flex-shrink:0;"
                ${task.done?'checked':''}
                onchange="Onboarding._toggleTask('${ob.id}','${task.key}');
                  document.getElementById('obTaskContent_${ob.id}').innerHTML=
                    Onboarding._renderTaskList((window.DB.onboarding||[]).find(o=>o.id==='${ob.id}'))">
              <div>
                <div style="font-size:0.83rem;${task.done?'text-decoration:line-through;color:var(--gray-400);':'font-weight:500;'}">${task.label}</div>
                ${task.required?`<span style="font-size:0.62rem;color:var(--danger);">Required</span>`:''}
                ${task.completedAt?`<div style="font-size:0.68rem;color:var(--success);margin-top:1px;">
                  ✓ Done ${new Date(task.completedAt).toLocaleDateString()}</div>`:''}
              </div>
            </label>`).join('')}
        </div>`;
    }).join('');
  },

  _toggleTask: function (obId, taskKey) {
    const ob   = (window.DB.onboarding||[]).find(o=>o.id===obId);
    if (!ob) return;
    const task = (ob.tasks||[]).find(t=>t.key===taskKey);
    if (!task) return;
    task.done        = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : null;
    if (ob.tasks.every(t=>t.done)) ob.status = 'Completed';
    else if (ob.tasks.some(t=>t.done)) ob.status = 'In Progress';
    window.DB.save();
    // Refresh main page silently
    if (!document.getElementById('obManageModal')) {
      this.render(document.getElementById('content'));
    }
  },

  _saveNotes: function (obId) {
    const ob = (window.DB.onboarding||[]).find(o=>o.id===obId);
    if (!ob) return;
    ob.notes = document.getElementById(`obNotes_${obId}`)?.value||'';
    window.DB.save();
    window.Toast.show('Notes saved', 'success');
  },

  markComplete: function (obId) {
    const ob = (window.DB.onboarding||[]).find(o=>o.id===obId);
    if (!ob) return;
    window.showConfirmation('Complete Onboarding',
      'Mark this onboarding as completed?',
      () => {
        ob.status      = 'Completed';
        ob.completedAt = new Date().toISOString();
        ob.tasks.forEach(t=>{ if(!t.done){t.done=true;t.completedAt=ob.completedAt;} });
        window.DB.save();
        window.Toast.show('Onboarding completed!', 'success');
        this.render(document.getElementById('content'));
      });
  },

  deleteProcess: function (obId) {
    window.showConfirmation('Delete Onboarding Record', 'Delete this onboarding process?', () => {
      window.DB.onboarding = (window.DB.onboarding||[]).filter(o=>o.id!==obId);
      window.DB.save();
      window.Toast.show('Deleted', 'success');
      this.render(document.getElementById('content'));
    });
  }
};

window.Onboarding      = Onboarding;
window.renderOnboarding = function(c){ Onboarding.render(c); };