// ─── Offboarding Module ───────────────────────────────────────────────────────
const Offboarding = {

  TASKS: [
    { key:'resignation',    label:'Receive & acknowledge resignation letter',     category:'HR',      required:true },
    { key:'exit_date',      label:'Confirm last working day',                     category:'HR',      required:true },
    { key:'handover_plan',  label:'Create knowledge & project handover plan',     category:'Manager', required:true },
    { key:'handover_done',  label:'Complete handover to colleague/successor',     category:'Manager', required:true },
    { key:'it_revoke',      label:'Revoke all IT access & system logins',         category:'IT',      required:true },
    { key:'equipment',      label:'Collect laptop, phone & company equipment',    category:'IT',      required:true },
    { key:'access_card',    label:'Collect access card, keys & parking disc',     category:'Ops',     required:true },
    { key:'email_redirect', label:'Set up email auto-redirect or out-of-office',  category:'IT',      required:false },
    { key:'final_payroll',  label:'Process final salary, leave payout & deductions', category:'Payroll', required:true },
    { key:'irp5',           label:'Prepare & issue IRP5 / tax certificate',       category:'Payroll', required:true },
    { key:'uif_ui19',       label:'Submit UIF termination declaration (UI-19)',   category:'HR',      required:true },
    { key:'exit_interview', label:'Conduct exit interview',                       category:'HR',      required:false },
    { key:'blacklist',      label:'Record re-hire eligibility decision',          category:'HR',      required:false },
    { key:'reference',      label:'Prepare reference / service letter if needed', category:'HR',      required:false },
    { key:'benefits_stop',  label:'Cancel medical aid & provident fund membership',category:'Benefits',required:true },
  ],

  render: function (container) {
    const list      = window.DB.offboarding || [];
    const employees = window.DB.employees   || [];

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
          <h2 style="font-size:1.3rem;margin:0;">Offboarding</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            ${active.length} in progress &bull; ${completed.length} completed
          </div>
        </div>
        <button class="btn btn-warning btn-sm" style="color:white;" onclick="Offboarding.startModal()">
          <i class="fas fa-door-open"></i> Start Offboarding
        </button>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;">
        ${[
          ['Active',    active.length,    'warning', 'fas fa-door-open'],
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
          <div class="empty-state-icon"><i class="fas fa-door-open"></i></div>
          <div class="empty-state-title">No Offboarding Processes</div>
          <div class="empty-state-desc">
            Start an offboarding process when an employee resigns or their contract ends.
          </div>
          <button class="btn btn-warning btn-sm" style="color:white;margin-top:16px;"
            onclick="Offboarding.startModal()">
            <i class="fas fa-plus"></i> Start Offboarding
          </button>
        </div>` : `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${list.slice().reverse().map(ob => this.renderCard(ob, employees)).join('')}
        </div>`}`;
  },

  renderCard: function (ob, employees) {
    const emp   = employees.find(e => e.id == ob.employeeId);
    const tasks = ob.tasks || [];
    const done  = tasks.filter(t=>t.done).length;
    const total = tasks.length || 1;
    const pct   = Math.round((done/total)*100);
    const isOver= ob.status !== 'Completed' && ob.targetDate && new Date(ob.targetDate) < new Date();
    const sc    = ob.status==='Completed'?'success': isOver?'danger':'warning';
    const sl    = ob.status==='Completed'?'Completed': isOver?'Overdue':'In Progress';

    return `
      <div class="card" style="padding:0;overflow:hidden;border-left:4px solid var(--${sc});">
        <div style="padding:14px 18px;display:flex;align-items:center;
                    justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;border-radius:50%;
                        background:var(--warning-soft,#fef3c7);color:#d97706;
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
                ${emp?.companyName?' &bull; '+emp.companyName:''}
                &bull; Reason: <strong>${ob.reason||'Resignation'}</strong>
                &bull; Last day: <span style="color:${isOver?'var(--danger)':'inherit'}">${ob.targetDate||'—'}</span>
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="text-align:center;">
              <div style="font-size:1.3rem;font-weight:800;color:var(--${sc});">${pct}%</div>
              <div style="font-size:0.65rem;color:var(--gray-400);">${done}/${total} tasks</div>
            </div>
            <span class="badge badge-${sc}">${sl}</span>
            <button class="btn btn-outline btn-sm"
              onclick="Offboarding.manageModal('${ob.id}')">
              <i class="fas fa-tasks"></i> Manage
            </button>
            ${ob.status !== 'Completed' ? `
              <button class="btn btn-success btn-sm"
                onclick="Offboarding.markComplete('${ob.id}')">
                <i class="fas fa-check"></i> Complete
              </button>` : ''}
            <button class="btn-icon" style="color:var(--danger);"
              onclick="Offboarding.deleteProcess('${ob.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <div style="height:5px;background:var(--gray-100);">
          <div style="height:100%;width:${pct}%;background:var(--${sc});
                      transition:width 0.4s ease;"></div>
        </div>

        <div style="padding:10px 18px;display:flex;flex-wrap:wrap;gap:6px 12px;">
          ${tasks.slice(0,8).map(t => `
            <div style="display:flex;align-items:center;gap:4px;font-size:0.72rem;
                        color:${t.done?'var(--success)':'var(--gray-500)'};cursor:pointer;"
                 onclick="Offboarding._toggleTask('${ob.id}','${t.key}')">
              <i class="fas fa-${t.done?'check-circle':'circle'}" style="font-size:0.75rem;"></i>
              <span style="text-decoration:${t.done?'line-through':'none'};">
                ${t.label.length>35?t.label.slice(0,35)+'…':t.label}
              </span>
            </div>`).join('')}
          ${tasks.length>8?`<div style="font-size:0.7rem;color:var(--gray-400);">
            +${tasks.length-8} more</div>`:''}
        </div>
      </div>`;
  },

  startModal: function () {
    const employees = (window.DB.employees||[]).filter(e=>e.status==='Active');
    const today     = new Date().toISOString().split('T')[0];
    const html = `
      <div class="card" style="width:100%;max-width:500px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-door-open" style="color:var(--warning);"></i>
            Start Offboarding</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('startOffModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="card-body">
          <div class="alert alert-warning" style="font-size:0.82rem;margin-bottom:16px;">
            <i class="fas fa-info-circle"></i>
            Starting offboarding will automatically mark the employee as <strong>Terminated</strong>
            once the last working day passes.
          </div>
          <div class="form-group"><label class="form-label">Employee *</label>
            <select id="off_emp" class="form-control">
              <option value="">— Select Employee —</option>
              ${employees.map(e=>`<option value="${e.id}">${e.firstName} ${e.lastName}${e.companyName?' ('+e.companyName+')':''}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Reason for Leaving *</label>
            <select id="off_reason" class="form-control">
              <option>Resignation</option>
              <option>Retrenchment</option>
              <option>End of Contract</option>
              <option>Retirement</option>
              <option>Dismissal</option>
              <option>Death</option>
              <option>Other</option>
            </select>
          </div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Process Start Date</label>
              <input id="off_start" type="date" class="form-control" value="${today}">
            </div>
            <div class="form-group"><label class="form-label">Last Working Day *</label>
              <input id="off_target" type="date" class="form-control">
            </div>
          </div>
          <div class="form-group"><label class="form-label">Assigned HR Officer</label>
            <input id="off_assigned" class="form-control"
              value="${window.currentUser?.name||'HR Manager'}">
          </div>
          <div class="form-group"><label class="form-label">Notes</label>
            <textarea id="off_notes" class="form-control" rows="2"
              placeholder="Additional context..."></textarea>
          </div>
          <button class="btn btn-warning" style="width:100%;margin-top:4px;color:white;"
            onclick="Offboarding.create()">
            <i class="fas fa-door-open"></i> Start Offboarding Process
          </button>
        </div>
      </div>`;
    window.showModal('startOffModal', html);
  },

  create: function () {
    const empId  = document.getElementById('off_emp')?.value;
    const target = document.getElementById('off_target')?.value;
    if (!empId)  { window.showAlert('Required','Please select an employee.'); return; }
    if (!target) { window.showAlert('Required','Please enter the last working day.'); return; }

    const ob = {
      id:         'OFF_'+Date.now(),
      employeeId: parseInt(empId),
      type:       'Offboarding',
      status:     'In Progress',
      reason:     document.getElementById('off_reason')?.value||'Resignation',
      startDate:  document.getElementById('off_start')?.value||'',
      targetDate: target,
      assignedTo: document.getElementById('off_assigned')?.value?.trim()||'HR Manager',
      notes:      document.getElementById('off_notes')?.value?.trim()||'',
      tasks:      this.TASKS.map(t=>({...t, done:false, completedAt:null})),
      createdAt:  new Date().toISOString()
    };

    // Check for existing active offboarding
    if ((window.DB.offboarding||[]).some(o=>o.employeeId==empId&&o.status==='In Progress')) {
      window.showAlert('Already Active','This employee already has an active offboarding process.'); return;
    }

    window.DB.offboarding = window.DB.offboarding || [];
    window.DB.offboarding.push(ob);

    // Update employee status to Terminated
    const emp = (window.DB.employees||[]).find(e=>e.id==empId);
    if (emp) {
      emp.status       = 'Terminated';
      emp.terminatedAt = target;
    }

    window.DB.save();

    if (typeof AuditTrail !== 'undefined') {
      AuditTrail.log('CREATE','Offboarding',ob.id,
        { status:{ before:'Active', after:'Terminated' }},
        `Offboarding started for ${emp?.firstName||''} ${emp?.lastName||''} — ${ob.reason}`);
    }

    window.Toast.show(`Offboarding started for ${emp?.firstName||'employee'}`, 'success');
    window.closeModal('startOffModal');
    this.render(document.getElementById('content'));
    if (typeof window.renderNotificationBell === 'function') window.renderNotificationBell();
  },

  manageModal: function (obId) {
    const ob  = (window.DB.offboarding||[]).find(o=>o.id===obId);
    const emp = (window.DB.employees||[]).find(e=>e.id==ob?.employeeId);
    if (!ob) return;

    const tasks = ob.tasks || [];
    const done  = tasks.filter(t=>t.done).length;

    const html = `
      <div class="card" style="width:100%;max-width:600px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <div>
            <h3 class="card-title">
              Offboarding — ${emp ? emp.firstName+' '+emp.lastName : 'Employee'}
            </h3>
            <div style="font-size:0.73rem;color:var(--gray-500);">
              ${ob.reason||'Resignation'} &bull; Last day: ${ob.targetDate||'—'} &bull;
              ${done}/${tasks.length} tasks complete
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="closeModal('offManageModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div id="offTaskContent_${obId}" class="card-body" style="padding:0;">
          ${this._renderTaskList(ob)}
        </div>

        <div style="padding:14px 18px;border-top:1px solid var(--gray-100);">
          <div class="form-group" style="margin:0;"><label class="form-label">Notes</label>
            <textarea id="offNotes_${obId}" class="form-control" rows="2">${ob.notes||''}</textarea>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn btn-outline btn-sm"
              onclick="Offboarding._saveNotes('${obId}')">
              <i class="fas fa-save"></i> Save Notes
            </button>
            ${ob.status !== 'Completed' ? `
              <button class="btn btn-success btn-sm"
                onclick="Offboarding.markComplete('${obId}');closeModal('offManageModal')">
                <i class="fas fa-check"></i> Mark Completed
              </button>` : ''}
          </div>
        </div>
      </div>`;
    window.showModal('offManageModal', html);
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
                          cursor:pointer;border-bottom:1px solid var(--gray-50);"
                   onmouseenter="this.style.background='var(--gray-50)'"
                   onmouseleave="this.style.background=''">
              <input type="checkbox" style="width:16px;height:16px;margin-top:1px;flex-shrink:0;"
                ${task.done?'checked':''}
                onchange="Offboarding._toggleTask('${ob.id}','${task.key}');
                  document.getElementById('offTaskContent_${ob.id}').innerHTML=
                    Offboarding._renderTaskList((window.DB.offboarding||[]).find(o=>o.id==='${ob.id}'))">
              <div>
                <div style="font-size:0.83rem;${task.done?'text-decoration:line-through;color:var(--gray-400);':'font-weight:500;'}">${task.label}</div>
                ${task.required?`<span style="font-size:0.62rem;color:var(--danger);">Required</span>`:''}
                ${task.completedAt?`<div style="font-size:0.68rem;color:var(--success);margin-top:1px;">
                  ✓ ${new Date(task.completedAt).toLocaleDateString()}</div>`:''}
              </div>
            </label>`).join('')}
        </div>`;
    }).join('');
  },

  _toggleTask: function (obId, taskKey) {
    const ob   = (window.DB.offboarding||[]).find(o=>o.id===obId);
    if (!ob) return;
    const task = (ob.tasks||[]).find(t=>t.key===taskKey);
    if (!task) return;
    task.done        = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : null;
    if (ob.tasks.every(t=>t.done)) ob.status = 'Completed';
    else ob.status = 'In Progress';
    window.DB.save();
  },

  _saveNotes: function (obId) {
    const ob = (window.DB.offboarding||[]).find(o=>o.id===obId);
    if (!ob) return;
    ob.notes = document.getElementById(`offNotes_${obId}`)?.value||'';
    window.DB.save();
    window.Toast.show('Notes saved', 'success');
  },

  markComplete: function (obId) {
    const ob = (window.DB.offboarding||[]).find(o=>o.id===obId);
    if (!ob) return;
    window.showConfirmation('Complete Offboarding',
      'Mark offboarding as fully completed?',
      () => {
        ob.status      = 'Completed';
        ob.completedAt = new Date().toISOString();
        ob.tasks.forEach(t=>{ if(!t.done){t.done=true;t.completedAt=ob.completedAt;} });
        window.DB.save();
        window.Toast.show('Offboarding completed', 'success');
        this.render(document.getElementById('content'));
      });
  },

  deleteProcess: function (obId) {
    window.showConfirmation('Delete Offboarding Record', 'Delete this offboarding record?', () => {
      window.DB.offboarding = (window.DB.offboarding||[]).filter(o=>o.id!==obId);
      window.DB.save();
      window.Toast.show('Deleted', 'success');
      this.render(document.getElementById('content'));
    });
  }
};

window.Offboarding      = Offboarding;
window.renderOffboarding = function(c){ Offboarding.render(c); };