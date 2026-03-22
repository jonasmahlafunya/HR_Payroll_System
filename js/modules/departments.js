// ─── Departments & Positions Module ──────────────────────────────────────────
const Departments = {

  render: function (container) {
    const departments    = window.DB.departments || [];
    const employees      = window.DB.employees   || [];
    const companies      = window.DB.companies   || [];
    const totalPositions = departments.reduce((s,d)=>s+(d.positions||[]).length,0);

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;
                  margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="font-size:1.3rem;margin:0;">Departments &amp; Positions</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            ${departments.length} department${departments.length!==1?'s':''} &bull;
            ${totalPositions} position${totalPositions!==1?'s':''}
          </div>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-outline btn-sm" onclick="Departments.addPositionQuickModal()"
            style="display:flex;align-items:center;gap:6px;padding:8px 16px;">
            <i class="fas fa-briefcase"></i> Add Position
          </button>
          <button class="btn btn-primary btn-sm" onclick="Departments.addDepartmentModal()"
            style="display:flex;align-items:center;gap:6px;padding:8px 16px;">
            <i class="fas fa-plus"></i> Add Department
          </button>
        </div>
      </div>

      ${!departments.length ? `
        <div style="background:var(--primary-soft,#eef2ff);border:1px solid var(--primary);
                    border-radius:10px;padding:20px 24px;margin-bottom:20px;
                    display:flex;gap:16px;align-items:flex-start;">
          <div style="font-size:2rem;">🏢</div>
          <div>
            <div style="font-weight:700;margin-bottom:4px;">
              Start by creating a department
            </div>
            <div style="font-size:0.83rem;color:var(--gray-600);">
              Departments organise your workforce. Add positions inside departments so they
              appear as dropdowns when creating employees.
            </div>
            <button class="btn btn-primary btn-sm" style="margin-top:12px;"
              onclick="Departments.addDepartmentModal()">
              <i class="fas fa-plus"></i> Add First Department
            </button>
          </div>
        </div>` : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;">
          ${departments.map(d => this.renderCard(d, employees)).join('')}
        </div>`}`;
  },

  renderCard: function (dept, employees) {
    const deptEmps  = employees.filter(e => e.department===dept.name && e.status!=='Terminated');
    const positions = dept.positions || [];
    const colorHex  = ({
      primary:'#4f46e5', success:'#16a34a', warning:'#d97706', info:'#0284c7',
      teal:'#0d9488', purple:'#7c3aed', orange:'#ea580c', danger:'#dc2626'
    })[dept.color||'primary'] || '#4f46e5';

    return `
      <div class="card" style="padding:0;overflow:hidden;border-top:3px solid ${colorHex};">
        <div style="padding:14px 16px;display:flex;align-items:center;
                    justify-content:space-between;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div style="width:38px;height:38px;border-radius:9px;flex-shrink:0;
                        background:${colorHex}1a;display:flex;align-items:center;justify-content:center;">
              <i class="${dept.icon||'fas fa-sitemap'}" style="font-size:1rem;color:${colorHex};"></i>
            </div>
            <div style="min-width:0;">
              <div style="font-weight:700;font-size:0.92rem;">${dept.name}</div>
              <div style="font-size:0.72rem;color:var(--gray-500);">
                ${deptEmps.length} employee${deptEmps.length!==1?'s':''}
                &bull; ${positions.length} position${positions.length!==1?'s':''}
                ${dept.manager?' &bull; '+dept.manager:''}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button class="btn-icon" onclick="Departments.editDepartment('${dept.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon" style="color:var(--danger);"
              onclick="Departments.deleteDepartment('${dept.id}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <div style="border-top:1px solid var(--gray-100);padding:12px 16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;
                        letter-spacing:0.5px;color:var(--gray-400);">Positions</div>
            <button class="btn btn-outline btn-sm" style="font-size:0.7rem;padding:3px 10px;"
              onclick="Departments.addPositionModal('${dept.id}')">
              <i class="fas fa-plus"></i> Add Position
            </button>
          </div>

          ${positions.length ? `
            <div style="display:flex;flex-direction:column;gap:5px;">
              ${positions.map(pos => {
                const filled = deptEmps.filter(e=>e.position===pos.title).length;
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;
                              padding:7px 10px;background:var(--gray-50);border-radius:7px;
                              border:1px solid var(--gray-100);">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <i class="fas fa-briefcase" style="font-size:0.68rem;color:${colorHex};"></i>
                      <div>
                        <div style="font-size:0.8rem;font-weight:500;">${pos.title}</div>
                        ${pos.grade?`<div style="font-size:0.63rem;color:var(--gray-400);">${pos.grade}</div>`:''}
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                      ${filled?`<span style="font-size:0.62rem;background:${colorHex}18;color:${colorHex};
                               padding:2px 7px;border-radius:99px;font-weight:600;">${filled} filled</span>`:''}
                      <button class="btn-icon" style="color:var(--danger);font-size:0.7rem;"
                        onclick="Departments.deletePosition('${dept.id}','${pos.id}')">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>`;
              }).join('')}
            </div>` : `
            <div style="text-align:center;padding:12px;color:var(--gray-400);font-size:0.78rem;">
              No positions yet —
              <button style="border:none;background:none;color:${colorHex};cursor:pointer;
                             font-size:0.78rem;font-weight:600;padding:0;"
                onclick="Departments.addPositionModal('${dept.id}')">add one</button>
            </div>`}
        </div>
        ${dept.description?`
          <div style="padding:8px 16px;border-top:1px solid var(--gray-100);
                      font-size:0.72rem;color:var(--gray-500);">${dept.description}</div>`:''}
      </div>`;
  },

  addDepartmentModal: function () {
    const companies = window.DB.companies || [];
    const html = `
      <div class="card" style="width:100%;max-width:560px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-sitemap text-primary"></i> Add Department</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addDeptModal')">
            <i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          ${companies.length>1?`
          <div class="form-group"><label class="form-label">Company</label>
            <select id="dept_company" class="form-control">
              <option value="">— Shared across all companies —</option>
              ${companies.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
            <div class="form-hint">Leave blank to share across all companies</div>
          </div>`:`<input type="hidden" id="dept_company" value="${companies[0]?.id||''}">`}
          <div class="form-group"><label class="form-label">Department Name *</label>
            <input id="dept_name" class="form-control" placeholder="e.g. Finance, IT, Operations" autofocus>
          </div>
          <div class="form-group"><label class="form-label">Description</label>
            <input id="dept_desc" class="form-control" placeholder="Optional description">
          </div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Manager</label>
              <input id="dept_manager" class="form-control"></div>
            <div class="form-group"><label class="form-label">Cost Centre</label>
              <input id="dept_costcentre" class="form-control" placeholder="e.g. CC-001"></div>
            <div class="form-group"><label class="form-label">Icon</label>
              <select id="dept_icon" class="form-control">
                ${[['fas fa-sitemap','Org Chart'],['fas fa-users','People'],['fas fa-laptop-code','Technology'],
                   ['fas fa-chart-bar','Finance'],['fas fa-bullhorn','Marketing'],['fas fa-hard-hat','Operations'],
                   ['fas fa-balance-scale','Legal'],['fas fa-truck','Logistics'],['fas fa-heartbeat','Healthcare'],
                   ['fas fa-graduation-cap','Training'],['fas fa-wrench','Maintenance'],['fas fa-handshake','Sales']]
                  .map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
              </select></div>
            <div class="form-group"><label class="form-label">Colour</label>
              <select id="dept_color" class="form-control">
                ${[['primary','Indigo'],['success','Green'],['info','Blue'],['warning','Amber'],
                   ['danger','Red'],['teal','Teal'],['purple','Purple'],['orange','Orange']]
                  .map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
              </select></div>
          </div>
          <div style="border-top:1px solid var(--gray-100);padding-top:14px;margin-top:4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-size:0.8rem;font-weight:600;">Initial Positions <span style="color:var(--gray-400);font-weight:400;">(optional)</span></div>
              <button class="btn btn-outline btn-sm" style="font-size:0.72rem;"
                onclick="Departments._addInitPositionRow()">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
            <div id="initPositions" style="display:flex;flex-direction:column;gap:6px;"></div>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:16px;"
            onclick="Departments.saveDepartment()">
            <i class="fas fa-save"></i> Save Department
          </button>
        </div>
      </div>`;
    window.showModal('addDeptModal', html);
  },

  _addInitPositionRow: function () {
    const c = document.getElementById('initPositions');
    if (!c) return;
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr auto;gap:6px;';
    row.innerHTML = `
      <input class="form-control init-pos-title" placeholder="Position title" style="font-size:0.82rem;">
      <input class="form-control init-pos-grade" placeholder="Grade" style="font-size:0.82rem;">
      <button class="btn btn-outline btn-sm" style="color:var(--danger);"
        onclick="this.closest('div').remove()"><i class="fas fa-times"></i></button>`;
    c.appendChild(row);
    row.querySelector('.init-pos-title').focus();
  },

  saveDepartment: function () {
    const name = document.getElementById('dept_name')?.value?.trim();
    if (!name) { window.showAlert('Required','Department name is required.'); return; }
    if ((window.DB.departments||[]).some(d=>d.name.toLowerCase()===name.toLowerCase())) {
      window.showAlert('Duplicate',`A department named "${name}" already exists.`); return;
    }
    const positions = [];
    document.querySelectorAll('#initPositions .init-pos-title').forEach((el,i) => {
      const title = el.value.trim();
      if (title) {
        const grade = document.querySelectorAll('#initPositions .init-pos-grade')[i]?.value?.trim()||'';
        positions.push({ id:'POS_'+Date.now()+'_'+i, title, grade, createdAt:new Date().toISOString() });
      }
    });
    const dept = {
      id:          'DEPT_'+Date.now(),
      name,
      description: document.getElementById('dept_desc')?.value?.trim()      || '',
      manager:     document.getElementById('dept_manager')?.value?.trim()    || '',
      costCentre:  document.getElementById('dept_costcentre')?.value?.trim() || '',
      icon:        document.getElementById('dept_icon')?.value               || 'fas fa-sitemap',
      color:       document.getElementById('dept_color')?.value              || 'primary',
      companyId:   document.getElementById('dept_company')?.value            || '',
      positions,
      createdAt:   new Date().toISOString()
    };
    window.DB.departments = window.DB.departments || [];
    window.DB.departments.push(dept);
    window.DB.save();
    window.Toast.show(`"${name}" created with ${positions.length} position${positions.length!==1?'s':''}`, 'success');
    window.closeModal('addDeptModal');
    this.render(document.getElementById('content'));
  },

  addPositionQuickModal: function () {
    const departments = window.DB.departments || [];
    if (!departments.length) {
      window.showAlert('No Departments', 'Please create a department first.', () => this.addDepartmentModal());
      return;
    }
    const html = `
      <div class="card" style="width:100%;max-width:460px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-briefcase text-primary"></i> Add Position</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addPosQuickModal')">
            <i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Department *</label>
            <select id="qpos_dept" class="form-control">
              <option value="">— Select Department —</option>
              ${departments.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Position Title *</label>
            <input id="qpos_title" class="form-control"
              placeholder="e.g. Senior Accountant, IT Manager" autofocus></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Grade / Level</label>
              <input id="qpos_grade" class="form-control" placeholder="e.g. Senior, L4"></div>
            <div class="form-group"><label class="form-label">Employment Type</label>
              <select id="qpos_type" class="form-control">
                <option value="">Any</option>
                <option>Permanent</option><option>Fixed Term</option>
                <option>Part-Time</option><option>Contractor</option>
              </select></div>
            <div class="form-group"><label class="form-label">Min Salary (R)</label>
              <input id="qpos_salMin" type="number" class="form-control" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Max Salary (R)</label>
              <input id="qpos_salMax" type="number" class="form-control" placeholder="0"></div>
          </div>
          <button class="btn btn-primary" style="width:100%;" onclick="Departments.saveQuickPosition()">
            <i class="fas fa-save"></i> Add Position
          </button>
        </div>
      </div>`;
    window.showModal('addPosQuickModal', html);
  },

  saveQuickPosition: function () {
    const deptId = document.getElementById('qpos_dept')?.value;
    const title  = document.getElementById('qpos_title')?.value?.trim();
    if (!deptId) { window.showAlert('Required','Please select a department.'); return; }
    if (!title)  { window.showAlert('Required','Position title is required.'); return; }
    const dept = (window.DB.departments||[]).find(d=>d.id===deptId);
    if (!dept) return;
    const pos = {
      id:       'POS_'+Date.now(), title,
      grade:    document.getElementById('qpos_grade')?.value?.trim()||'',
      type:     document.getElementById('qpos_type')?.value||'',
      salaryMin:parseFloat(document.getElementById('qpos_salMin')?.value||0)||0,
      salaryMax:parseFloat(document.getElementById('qpos_salMax')?.value||0)||0,
      createdAt:new Date().toISOString()
    };
    dept.positions = dept.positions || [];
    dept.positions.push(pos);
    window.DB.save();
    window.Toast.show(`"${title}" added to ${dept.name}`, 'success');
    window.closeModal('addPosQuickModal');
    this.render(document.getElementById('content'));
  },

  addPositionModal: function (deptId) {
    const dept = (window.DB.departments||[]).find(d=>d.id===deptId);
    if (!dept) return;
    const html = `
      <div class="card" style="width:100%;max-width:460px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title">Add Position — ${dept.name}</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addPosModal')">
            <i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Position Title *</label>
            <input id="pos_title" class="form-control" placeholder="e.g. Financial Analyst" autofocus></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Grade / Level</label>
              <input id="pos_grade" class="form-control" placeholder="e.g. Senior, L4"></div>
            <div class="form-group"><label class="form-label">Employment Type</label>
              <select id="pos_type" class="form-control">
                <option value="">Any</option>
                <option>Permanent</option><option>Fixed Term</option>
                <option>Part-Time</option><option>Contractor</option>
              </select></div>
            <div class="form-group"><label class="form-label">Min Salary (R)</label>
              <input id="pos_salMin" type="number" class="form-control" placeholder="0"></div>
            <div class="form-group"><label class="form-label">Max Salary (R)</label>
              <input id="pos_salMax" type="number" class="form-control" placeholder="0"></div>
          </div>
          <div class="form-group"><label class="form-label">Description</label>
            <textarea id="pos_desc" class="form-control" rows="2"></textarea></div>
          <button class="btn btn-primary" style="width:100%;"
            onclick="Departments.savePosition('${deptId}')">
            <i class="fas fa-save"></i> Add Position
          </button>
        </div>
      </div>`;
    window.showModal('addPosModal', html);
  },

  savePosition: function (deptId) {
    const dept  = (window.DB.departments||[]).find(d=>d.id===deptId);
    if (!dept) return;
    const title = document.getElementById('pos_title')?.value?.trim();
    if (!title) { window.showAlert('Required','Position title is required.'); return; }
    const pos = {
      id:'POS_'+Date.now(), title,
      grade:       document.getElementById('pos_grade')?.value?.trim()||'',
      type:        document.getElementById('pos_type')?.value||'',
      salaryMin:   parseFloat(document.getElementById('pos_salMin')?.value||0)||0,
      salaryMax:   parseFloat(document.getElementById('pos_salMax')?.value||0)||0,
      description: document.getElementById('pos_desc')?.value?.trim()||'',
      createdAt:   new Date().toISOString()
    };
    dept.positions = dept.positions||[];
    dept.positions.push(pos);
    window.DB.save();
    window.Toast.show(`"${title}" added to ${dept.name}`, 'success');
    window.closeModal('addPosModal');
    this.render(document.getElementById('content'));
  },

  deletePosition: function (deptId, posId) {
    const dept = (window.DB.departments||[]).find(d=>d.id===deptId);
    if (!dept) return;
    dept.positions = (dept.positions||[]).filter(p=>p.id!==posId);
    window.DB.save();
    window.Toast.show('Position removed', 'success');
    this.render(document.getElementById('content'));
  },

  editDepartment: function (deptId) {
    const dept = (window.DB.departments||[]).find(d=>d.id===deptId);
    if (!dept) return;
    const html = `
      <div class="card" style="width:100%;max-width:480px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title">Edit Department</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('editDeptModal')">
            <i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Department Name *</label>
            <input id="ed_name" class="form-control" value="${dept.name}"></div>
          <div class="form-group"><label class="form-label">Description</label>
            <input id="ed_desc" class="form-control" value="${dept.description||''}"></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Manager</label>
              <input id="ed_manager" class="form-control" value="${dept.manager||''}"></div>
            <div class="form-group"><label class="form-label">Cost Centre</label>
              <input id="ed_costcentre" class="form-control" value="${dept.costCentre||''}"></div>
            <div class="form-group"><label class="form-label">Icon</label>
              <select id="ed_icon" class="form-control">
                ${[['fas fa-sitemap','Org Chart'],['fas fa-users','People'],['fas fa-laptop-code','Technology'],
                   ['fas fa-chart-bar','Finance'],['fas fa-bullhorn','Marketing'],['fas fa-hard-hat','Operations'],
                   ['fas fa-balance-scale','Legal'],['fas fa-truck','Logistics'],['fas fa-heartbeat','Healthcare'],
                   ['fas fa-graduation-cap','Training'],['fas fa-wrench','Maintenance'],['fas fa-handshake','Sales']]
                  .map(([v,l])=>`<option value="${v}" ${dept.icon===v?'selected':''}>${l}</option>`).join('')}
              </select></div>
            <div class="form-group"><label class="form-label">Colour</label>
              <select id="ed_color" class="form-control">
                ${[['primary','Indigo'],['success','Green'],['info','Blue'],['warning','Amber'],
                   ['danger','Red'],['teal','Teal'],['purple','Purple'],['orange','Orange']]
                  .map(([v,l])=>`<option value="${v}" ${dept.color===v?'selected':''}>${l}</option>`).join('')}
              </select></div>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:8px;"
            onclick="Departments.updateDepartment('${deptId}')">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>`;
    window.showModal('editDeptModal', html);
  },

  updateDepartment: function (deptId) {
    const dept = (window.DB.departments||[]).find(d=>d.id===deptId);
    if (!dept) return;
    const name = document.getElementById('ed_name')?.value?.trim();
    if (!name) { window.showAlert('Required','Department name is required.'); return; }
    dept.name        = name;
    dept.description = document.getElementById('ed_desc')?.value?.trim()||dept.description;
    dept.manager     = document.getElementById('ed_manager')?.value?.trim()||dept.manager;
    dept.costCentre  = document.getElementById('ed_costcentre')?.value?.trim()||dept.costCentre;
    dept.icon        = document.getElementById('ed_icon')?.value||dept.icon;
    dept.color       = document.getElementById('ed_color')?.value||dept.color;
    window.DB.save();
    window.Toast.show('Department updated', 'success');
    window.closeModal('editDeptModal');
    this.render(document.getElementById('content'));
  },

  deleteDepartment: function (deptId) {
    const dept = (window.DB.departments||[]).find(d=>d.id===deptId);
    if (!dept) return;
    const n = (window.DB.employees||[]).filter(e=>e.department===dept.name&&e.status!=='Terminated').length;
    window.showConfirmation('Delete Department',
      `Delete <strong>${dept.name}</strong>?`+
      (n?`<br><span style="color:var(--warning);">${n} active employee${n!==1?'s are':' is'} in this department.</span>`:''),
      () => {
        window.DB.departments = (window.DB.departments||[]).filter(d=>d.id!==deptId);
        window.DB.save();
        window.Toast.show('Deleted', 'success');
        this.render(document.getElementById('content'));
      });
  },

  getDepartmentNames: function (companyId) {
    return (window.DB.departments||[])
      .filter(d=>!companyId||!d.companyId||d.companyId===companyId)
      .map(d=>d.name).sort();
  },
  getPositionsForDepartment: function (deptName) {
    const dept=(window.DB.departments||[]).find(d=>d.name===deptName);
    return (dept?.positions||[]).map(p=>p.title).sort();
  },
  getAllPositions: function (companyId) {
    return (window.DB.departments||[])
      .filter(d=>!companyId||!d.companyId||d.companyId===companyId)
      .flatMap(d=>(d.positions||[]).map(p=>({dept:d.name,title:p.title,grade:p.grade})))
      .sort((a,b)=>a.title.localeCompare(b.title));
  }
};

window.Departments       = Departments;
window.renderDepartments = function(c){ Departments.render(c); };