// ─── SA Bank Branch Codes (auto-populated when bank selected) ─────────────────
const SA_BANKS = [
  { name: 'ABSA', code: '632005' },
  { name: 'African Bank', code: '430000' },
  { name: 'Bidvest Bank', code: '462005' },
  { name: 'Capitec', code: '470010' },
  { name: 'Discovery Bank', code: '679000' },
  { name: 'FNB', code: '250655' },
  { name: 'Investec', code: '580105' },
  { name: 'Nedbank', code: '198765' },
  { name: 'Old Mutual Finance', code: '642005' },
  { name: 'Postbank', code: '460005' },
  { name: 'RMB', code: '223626' },
  { name: 'Sasfin Bank', code: '683000' },
  { name: 'Standard Bank', code: '051001' },
  { name: 'TymeBank', code: '678910' },
];

const SA_NATIONALITIES = [
  'South African', 'Zimbabwean', 'Mozambican', 'Lesotho', 'Swazi', 'Botswana',
  'Namibian', 'Namibian', 'Zambian', 'Malawian', 'Nigerian', 'Ghanaian', 'Kenyan',
  'Congolese', 'Angolan', 'British', 'Indian', 'Chinese', 'American',
  'German', 'French', 'Portuguese', 'Other'
];

function empBankOptions(selected) {
  return '<option value="">— Select Bank —</option>' +
    SA_BANKS.map(b => `<option value="${b.name}" data-code="${b.code}" ${selected === b.name ? 'selected' : ''}>${b.name} (${b.code})</option>`).join('');
}

function empNationalityOptions(selected) {
  return '<option value="">— Select Nationality —</option>' +
    SA_NATIONALITIES.map(n => `<option ${selected === n ? 'selected' : ''}>${n}</option>`).join('');
}

function empPositionOptions(selectedPos) {
  const depts = window.DB?.departments || [];
  const allPos = depts.flatMap(d => (d.positions || []).map(p => ({ dept: d.name, title: p.title })));
  let html = '<option value="">— Select Position —</option>';
  if (!allPos.length) return html + '<option disabled>No positions — add in Departments first</option>';
  const byDept = {};
  allPos.forEach(p => { if (!byDept[p.dept]) byDept[p.dept] = []; byDept[p.dept].push(p.title); });
  Object.entries(byDept).forEach(([dept, titles]) => {
    html += `<optgroup label="${dept}">`;
    titles.sort().forEach(t => { html += `<option ${selectedPos === t ? 'selected' : ''}>${t}</option>`; });
    html += '</optgroup>';
  });
  return html;
}

function autoFillBranchCode(selectEl, branchInputId) {
  const opt = selectEl?.options?.[selectEl.selectedIndex];
  const code = opt?.dataset?.code || '';
  const el = document.getElementById(branchInputId);
  if (el && code) { el.value = code; el.readOnly = true; }
  else if (el) { el.readOnly = false; }
}

// ─── Employees Module ─────────────────────────────────────────────────────────
const Employees = {

  render: function (container) {
    const employees = window.DB.employees || [];
    const companies = window.DB.companies || [];
    const departments = window.DB.departments || [];

    const statusFilter = window._empStatusFilter || 'Active';
    const searchQuery = window._empSearch || '';
    const compFilter = window._empCompanyFilter || '';

    let filtered = employees;
    if (statusFilter === 'Active') filtered = filtered.filter(e => e.status !== 'Terminated');
    else if (statusFilter === 'Terminated') filtered = filtered.filter(e => e.status === 'Terminated');
    // 'All' shows everyone

    if (compFilter) filtered = filtered.filter(e =>
      e.companyName === compFilter || e.companyId == compFilter
    );
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        `${e.firstName} ${e.lastName} ${e.email} ${e.position} ${e.department} ${e.employeeNumber}`
          .toLowerCase().includes(q)
      );
    }

    const activeCount = employees.filter(e => e.status !== 'Terminated').length;
    const terminatedCount = employees.filter(e => e.status === 'Terminated').length;

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.25rem;margin:0;">Employees</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            ${activeCount} active &bull; ${terminatedCount} terminated
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Employees.showAddWizard()">
          <i class="fas fa-user-plus"></i> Add Employee
        </button>
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom:16px;padding:12px 16px;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <input type="text" class="search-input" style="flex:1;min-width:200px;"
            placeholder="Search name, position, email..."
            value="${searchQuery}"
            oninput="window._empSearch=this.value;Employees.render(document.getElementById('content'))">

          <select class="form-control" style="width:160px;"
            onchange="window._empStatusFilter=this.value;Employees.render(document.getElementById('content'))">
            <option value="Active" ${statusFilter === 'Active' ? 'selected' : ''}>Active Employees</option>
            <option value="Terminated" ${statusFilter === 'Terminated' ? 'selected' : ''}>Terminated</option>
            <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>All Employees</option>
          </select>

          <select class="form-control" style="width:180px;"
            onchange="window._empCompanyFilter=this.value;Employees.render(document.getElementById('content'))">
            <option value="">All Companies</option>
            ${companies.map(c => `<option value="${c.id}" ${compFilter == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>

          <button class="btn btn-outline btn-sm" onclick="
            window._empSearch='';window._empStatusFilter='Active';window._empCompanyFilter='';
            Employees.render(document.getElementById('content'))">
            <i class="fas fa-times"></i> Clear
          </button>
        </div>
      </div>

      ${!filtered.length ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-users"></i></div>
          <div class="empty-state-title">No Employees Found</div>
          <div class="empty-state-desc">
            ${employees.length ? 'No employees match your filter.' : 'Add your first employee to get started.'}
          </div>
          ${!employees.length ? `<button class="btn btn-primary btn-sm" style="margin-top:16px;"
            onclick="Employees.showAddWizard()">
            <i class="fas fa-user-plus"></i> Add Employee
          </button>` : ''}
        </div>` : `
      <div class="table-responsive">
        <table id="employeeTable">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position</th>
              <th>Department</th>
              <th>Company</th>
              <th class="text-right">Salary</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(emp => this.renderRow(emp)).join('')}
          </tbody>
        </table>
      </div>`}`;
  },

  renderRow: function (emp) {
    const statusColor = { Active: 'success', Terminated: 'danger', 'On Leave': 'warning' };
    const color = statusColor[emp.status] || 'gray';
    const initials = `${(emp.firstName || '').charAt(0)}${(emp.lastName || '').charAt(0)}`;

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:50%;
                        background:${emp.photo ? 'transparent' : 'var(--primary-soft)'};
                        color:var(--primary);display:flex;align-items:center;justify-content:center;
                        font-weight:700;font-size:0.75rem;flex-shrink:0;overflow:hidden;">
              ${emp.photo
        ? `<img src="${emp.photo}" style="width:100%;height:100%;object-fit:cover;">`
        : initials}
            </div>
            <div>
              <div style="font-weight:600;font-size:0.85rem;">
                ${emp.firstName} ${emp.lastName}
                ${emp.status === 'Terminated' ? '<span style="color:var(--danger);font-size:0.7rem;"> (Terminated)</span>' : ''}
              </div>
              <div style="font-size:0.72rem;color:var(--gray-500);">
                #${emp.employeeNumber || emp.id} &bull; ${emp.email || 'No email'}
              </div>
            </div>
          </div>
        </td>
        <td style="font-size:0.83rem;">${emp.position || '—'}</td>
        <td style="font-size:0.83rem;">${emp.department || '—'}</td>
        <td style="font-size:0.83rem;">${emp.companyName || '—'}</td>
        <td class="text-right" style="font-size:0.83rem;font-weight:600;">
          ${window.formatCurrency(emp.basicSalary || 0)}
        </td>
        <td>
          <select class="form-control" style="padding:3px 6px;font-size:0.72rem;width:auto;min-width:110px;"
            onchange="Employees.changeStatus(${emp.id}, this.value, this)">
            <option value="Active" ${emp.status === 'Active' || !emp.status ? 'selected' : ''}>✅ Active</option>
            <option value="On Leave" ${emp.status === 'On Leave' ? 'selected' : ''}>🏖 On Leave</option>
            <option value="Suspended" ${emp.status === 'Suspended' ? 'selected' : ''}>⏸ Suspended</option>
            <option value="Terminated" ${emp.status === 'Terminated' ? 'selected' : ''}>🚫 Terminated</option>
          </select>
        </td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn-icon" title="View Profile"
              onclick="window.currentEmployeeId=${emp.id};window.loadPage('profile');">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" title="Edit"
              onclick="Employees.editEmployee(${emp.id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon" title="Generate Contract"
              onclick="window.currentEmployeeId=${emp.id};loadPage('contracts')">
              <i class="fas fa-file-signature"></i>
            </button>
            <button class="btn-icon" title="Delete"
              style="color:var(--danger);"
              onclick="Employees.deleteEmployee(${emp.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  },

  _onCompanyChange: function (selectEl, labelId) {
    const compId = selectEl?.options[selectEl.selectedIndex]?.dataset?.id;
    if (!compId) return;
    const comp = (window.DB.companies || []).find(c => c.id == compId);
    const label = document.getElementById(labelId);
    if (label && comp) {
      if (comp.payFrequency === 'Weekly' || comp.payFrequency === 'Bi-Weekly') {
        label.innerHTML = 'Rate per Hour (R)';
      } else {
        label.innerHTML = 'Basic Salary (R)';
      }
    }
  },

  changeStatus: function (employeeId, newStatus, selectEl) {
    const emp = (window.DB.employees || []).find(e => e.id === employeeId);
    if (!emp) return;

    const oldStatus = emp.status || 'Active';
    if (newStatus === oldStatus) return;

    const confirmMsg = newStatus === 'Terminated'
      ? `Terminate <strong>${emp.firstName} ${emp.lastName}</strong>? This will mark them as terminated.`
      : newStatus === 'Active' && oldStatus === 'Terminated'
        ? `Reinstate <strong>${emp.firstName} ${emp.lastName}</strong> as an active employee?`
        : `Change status to <strong>${newStatus}</strong>?`;

    window.showConfirmation('Change Employee Status', confirmMsg, () => {
      emp.status = newStatus;
      if (newStatus === 'Terminated') {
        emp.terminatedAt = new Date().toISOString().split('T')[0];
      } else if (newStatus === 'Active' && oldStatus === 'Terminated') {
        emp.terminatedAt = null;
        emp.reinstatedAt = new Date().toISOString().split('T')[0];
      }
      window.DB.save();
      window.Toast.show(`${emp.firstName} ${emp.lastName} → ${newStatus}`, 'success');
      if (typeof window.renderNotificationBell === 'function') window.renderNotificationBell();
    }, () => {
      if (selectEl) selectEl.value = oldStatus;
    });
  },

  editEmployee: function (empId) {
    const emp = (window.DB.employees || []).find(e => e.id === empId);
    if (!emp) return;
    const companies = window.DB.companies || [];
    const departments = window.DB.departments || [];
    const comp = companies.find(c => c.name === emp.companyName || c.id == emp.companyId);
    const isHourly = comp && (comp.payFrequency === 'Weekly' || comp.payFrequency === 'Bi-Weekly');

    const html = `
      <div class="card" style="width:100%;max-width:720px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title">Edit Employee — ${emp.firstName} ${emp.lastName}</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('editEmpModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="tabs" style="margin-bottom:16px;">
            <button class="tab-btn active" id="editEmpTab_personal" onclick="Employees._switchEditTab('personal')">Personal</button>
            <button class="tab-btn" id="editEmpTab_employment" onclick="Employees._switchEditTab('employment')">Employment</button>
            <button class="tab-btn" id="editEmpTab_banking" onclick="Employees._switchEditTab('banking')">Banking</button>
          </div>
          <div id="editEmpContent"></div>
          <button class="btn btn-primary" style="width:100%;margin-top:20px;" onclick="Employees.saveEmployee(${empId})">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>`;
    window.showModal('editEmpModal', html);
    window._editEmpData = JSON.parse(JSON.stringify(emp));
    this._switchEditTab('personal');
  },

  _flushEditTab: function () {
    // Read current DOM field values into _editEmpData before switching tabs
    const data = window._editEmpData;
    if (!data) return;
    const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : undefined; };
    // Personal
    if (g('edit_firstName') !== undefined) data.firstName = g('edit_firstName');
    if (g('edit_lastName') !== undefined) data.lastName = g('edit_lastName');
    if (g('edit_email') !== undefined) data.email = g('edit_email');
    if (g('edit_phone') !== undefined) data.phone = g('edit_phone');
    if (g('edit_idNumber') !== undefined) data.idNumber = g('edit_idNumber');
    if (g('edit_dob') !== undefined) data.dateOfBirth = g('edit_dob');
    if (g('edit_gender') !== undefined) data.gender = g('edit_gender');
    if (g('edit_nationality') !== undefined) data.nationality = g('edit_nationality');
    if (g('edit_address') !== undefined) data.address = g('edit_address');
    // Employment
    const compSel = document.getElementById('edit_company');
    if (compSel) { data.companyName = compSel.value; data._companyId = compSel.options[compSel.selectedIndex]?.dataset?.id; }
    if (g('edit_department') !== undefined) data.department = g('edit_department');
    if (g('edit_position') !== undefined) data.position = g('edit_position');
    if (g('edit_empNo') !== undefined) data.employeeNumber = g('edit_empNo');
    if (g('edit_startDate') !== undefined) data.startDate = g('edit_startDate');
    if (g('edit_empType') !== undefined) data.employmentType = g('edit_empType');
    const salEl = document.getElementById('edit_salary');
    if (salEl) {
      const s = parseFloat(salEl.value);
      if (!isNaN(s)) {
        const compId = data._companyId || data.companyId || window._editEmpData.companyId;
        const comp = (window.DB.companies || []).find(c => c.id == compId);
        const isHourly = comp && (comp.payFrequency === 'Weekly' || comp.payFrequency === 'Bi-Weekly');
        if (isHourly) { data.ratePerHour = s; data.basicSalary = 0; }
        else { data.basicSalary = s; data.ratePerHour = 0; }
      }
    }
    if (g('edit_status') !== undefined) data.status = g('edit_status');
    if (g('edit_taxNo') !== undefined) data.taxNumber = g('edit_taxNo');
    if (g('edit_uif') !== undefined) data.uifNumber = g('edit_uif');
    // Banking
    if (g('edit_bank') !== undefined) data.bankName = g('edit_bank');
    if (g('edit_accNo') !== undefined) data.accountNumber = g('edit_accNo');
    if (g('edit_branchCode') !== undefined) data.branchCode = g('edit_branchCode');
    if (g('edit_accType') !== undefined) data.accountType = g('edit_accType');
  },

  _switchEditTab: function (tab) {
    this._flushEditTab(); // Save current tab values before switching
    ['personal', 'employment', 'banking'].forEach(t => {
      const btn = document.getElementById(`editEmpTab_${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });
    const emp = window._editEmpData;
    const content = document.getElementById('editEmpContent');
    if (!content || !emp) return;
    const companies = window.DB.companies || [];
    const departments = window.DB.departments || [];
    const comp = companies.find(c => c.name === emp.companyName || c.id == emp.companyId);
    const isHourly = comp && (comp.payFrequency === 'Weekly' || comp.payFrequency === 'Bi-Weekly');

    if (tab === 'personal') {
      content.innerHTML = `
        <div class="grid-2">
          <div class="form-group"><label class="form-label">First Name *</label>
            <input id="edit_firstName" class="form-control" value="${emp.firstName || ''}"></div>
          <div class="form-group"><label class="form-label">Last Name *</label>
            <input id="edit_lastName" class="form-control" value="${emp.lastName || ''}"></div>
          <div class="form-group"><label class="form-label">Email</label>
            <input id="edit_email" type="email" class="form-control" value="${emp.email || ''}"></div>
          <div class="form-group"><label class="form-label">Phone</label>
            <input id="edit_phone" class="form-control" value="${emp.phone || emp.cellphone || ''}"></div>
          <div class="form-group"><label class="form-label">ID Number</label>
            <input id="edit_idNumber" class="form-control" value="${emp.idNumber || ''}"></div>
          <div class="form-group"><label class="form-label">Date of Birth</label>
            <input id="edit_dob" type="date" class="form-control" value="${emp.dateOfBirth || ''}"></div>
          <div class="form-group"><label class="form-label">Gender</label>
            <select id="edit_gender" class="form-control">
              <option value="">— Select —</option>
              ${['Male', 'Female', 'Other'].map(g => `<option value="${g}" ${emp.gender === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Nationality</label>
            <select id="edit_nationality" class="form-control">
              ${empNationalityOptions(emp.nationality || 'South African')}
            </select></div>
          <div class="form-group" style="grid-column:span 2;"><label class="form-label">Residential Address</label>
            <input id="edit_address" class="form-control" value="${emp.address || emp.residentialAddress || ''}"></div>
        </div>`;
    } else if (tab === 'employment') {
      content.innerHTML = `
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Company</label>
            <select id="edit_company" class="form-control" onchange="Employees._onCompanyChange(this, 'label_edit_salary')">
              <option value="">— Select —</option>
              ${companies.map(c => `<option value="${c.name}" data-id="${c.id}" ${emp.companyName === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Department</label>
            <select id="edit_department" class="form-control">
              <option value="">— Select Department —</option>
              ${departments.map(d => `<option value="${d.name || d}" ${emp.department === (d.name || d) ? 'selected' : ''}>${d.name || d}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Job Title / Position</label>
            <select id="edit_position" class="form-control">
              ${empPositionOptions(emp.position || '')}
            </select>
            <div class="form-hint">Add positions in Departments &amp; Positions</div>
          </div>
          <div class="form-group"><label class="form-label">Employee Number</label>
            <input id="edit_empNo" class="form-control" value="${emp.employeeNumber || ''}"></div>
          <div class="form-group"><label class="form-label">Start Date</label>
            <input id="edit_startDate" type="date" class="form-control" value="${emp.startDate || ''}"></div>
          <div class="form-group"><label class="form-label">Employment Type</label>
            <select id="edit_empType" class="form-control">
              ${['Permanent', 'Fixed Term', 'Part-Time', 'Casual', 'Contractor'].map(t =>
        `<option value="${t}" ${emp.employmentType === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label" id="label_edit_salary">${isHourly ? 'Rate per Hour (R)' : 'Basic Salary (R)'}</label>
            <input id="edit_salary" type="number" class="form-control" value="${emp.ratePerHour || emp.basicSalary || 0}"></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select id="edit_status" class="form-control">
              <option value="Active" ${emp.status === 'Active' || !emp.status ? 'selected' : ''}>Active</option>
              <option value="On Leave" ${emp.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
              <option value="Suspended" ${emp.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
              <option value="Terminated" ${emp.status === 'Terminated' ? 'selected' : ''}>Terminated</option>
            </select></div>
          <div class="form-group"><label class="form-label">Tax Number (IRP5)</label>
            <input id="edit_taxNo" class="form-control" value="${emp.taxNumber || ''}"></div>
          <div class="form-group"><label class="form-label">UIF Number</label>
            <input id="edit_uif" class="form-control" value="${emp.uifNumber || ''}"></div>
        </div>`;
    } else {
      content.innerHTML = `
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Bank Name</label>
            <select id="edit_bank" class="form-control"
              onchange="autoFillBranchCode(this,'edit_branchCode')">
              ${empBankOptions(emp.bankName || '')}
            </select></div>
          <div class="form-group"><label class="form-label">Account Number</label>
            <input id="edit_accNo" class="form-control" value="${emp.accountNumber || ''}"></div>
          <div class="form-group"><label class="form-label">Branch Code</label>
            <input id="edit_branchCode" class="form-control" value="${emp.branchCode || ''}"
              placeholder="Auto-filled when bank selected">
          </div>
          <div class="form-group"><label class="form-label">Account Type</label>
            <select id="edit_accType" class="form-control">
              ${['Cheque/Current', 'Savings', 'Transmission'].map(t =>
        `<option value="${t}" ${emp.accountType === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select></div>
        </div>`;
    }
  },

  saveEmployee: function (empId) {
    // Flush any still-visible tab fields into _editEmpData first
    this._flushEditTab();

    const emp = (window.DB.employees || []).find(e => e.id === empId);
    if (!emp) return;
    const data = window._editEmpData || {};

    // Read from _editEmpData (which was populated by _flushEditTab across all tabs)
    const firstName = (data.firstName || '').trim();
    const lastName = (data.lastName || '').trim();
    if (!firstName || !lastName) {
      window.showAlert('Required', 'First name and last name are required.'); return;
    }

    // Personal
    emp.firstName = firstName;
    emp.lastName = lastName;
    if (data.email) emp.email = data.email;
    if (data.phone) { emp.phone = data.phone; emp.cellphone = data.phone; }
    if (data.idNumber) emp.idNumber = data.idNumber;
    if (data.dateOfBirth) emp.dateOfBirth = data.dateOfBirth;
    if (data.gender) emp.gender = data.gender;
    if (data.nationality) emp.nationality = data.nationality;
    if (data.address) { emp.address = data.address; emp.residentialAddress = data.address; }

    // Employment
    if (data.companyName) {
      emp.companyName = data.companyName;
      if (data._companyId) emp.companyId = data._companyId;
    }
    if (data.department) emp.department = data.department;
    if (data.position) emp.position = data.position;
    if (data.employeeNumber) emp.employeeNumber = data.employeeNumber;
    if (data.startDate) emp.startDate = data.startDate;
    if (data.employmentType) emp.employmentType = data.employmentType;
    if (data.basicSalary !== undefined) emp.basicSalary = data.basicSalary;
    if (data.ratePerHour !== undefined) emp.ratePerHour = data.ratePerHour;
    if (data.status) emp.status = data.status;
    if (data.taxNumber) emp.taxNumber = data.taxNumber;
    if (data.uifNumber) emp.uifNumber = data.uifNumber;

    // Banking
    if (data.bankName) emp.bankName = data.bankName;
    if (data.accountNumber) emp.accountNumber = data.accountNumber;
    if (data.branchCode) emp.branchCode = data.branchCode;
    if (data.accountType) emp.accountType = data.accountType;

    window.DB.save();
    window.Toast.show(`${emp.firstName} ${emp.lastName} updated successfully`, 'success');
    window.closeModal('editEmpModal');
    delete window._editEmpData;
    this.render(document.getElementById('content'));
    if (typeof window.renderNotificationBell === 'function') window.renderNotificationBell();
  },

  deleteEmployee: function (empId) {
    const emp = (window.DB.employees || []).find(e => e.id === empId);
    if (!emp) return;
    window.showConfirmation('Delete Employee',
      `Permanently delete <strong>${emp.firstName} ${emp.lastName}</strong>? This cannot be undone.`,
      () => {
        window.DB.employees = (window.DB.employees || []).filter(e => e.id !== empId);
        window.DB.save();
        window.Toast.show('Employee deleted', 'success');
        this.render(document.getElementById('content'));
      }
    );
  },

  showAddWizard: function () {
    const companies = window.DB.companies || [];
    const departments = window.DB.departments || [];

    // Build position options grouped by department
    const posOpts = () => {
      const depts = window.DB.departments || [];
      const all = depts.flatMap(d => (d.positions || []).map(p => ({ dept: d.name, title: p.title })));
      if (!all.length) return '<option value="">No positions — add in Departments first</option>';
      let html = '<option value="">— Select Position —</option>';
      const byDept = {};
      all.forEach(p => { if (!byDept[p.dept]) byDept[p.dept] = []; byDept[p.dept].push(p.title); });
      Object.entries(byDept).forEach(([dept, titles]) => {
        html += `<optgroup label="${dept}">`;
        titles.sort().forEach(t => { html += `<option>${t}</option>`; });
        html += '</optgroup>';
      });
      return html;
    };

    const deptOptions = departments.map(d => `<option>${d.name}</option>`).join('');

    const html = `
      <div class="card" style="width:100%;max-width:780px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title">Add New Employee</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addEmpModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="card-body">
          <div class="tabs" style="margin-bottom:20px;">
            <button class="tab-btn active" id="addEmpTab_personal"
              onclick="Employees._switchAddTab('personal')">
              <i class="fas fa-user"></i> Personal
            </button>
            <button class="tab-btn" id="addEmpTab_employment"
              onclick="Employees._switchAddTab('employment')">
              <i class="fas fa-briefcase"></i> Employment
            </button>
            <button class="tab-btn" id="addEmpTab_banking"
              onclick="Employees._switchAddTab('banking')">
              <i class="fas fa-university"></i> Banking
            </button>
          </div>

          <!-- TAB: Personal -->
          <div id="addEmpPane_personal">
            <div class="grid-2">
              <div class="form-group"><label class="form-label">First Name <span style="color:var(--danger)">*</span></label>
                <input id="emp_firstName" class="form-control" placeholder="e.g. Sipho"></div>
              <div class="form-group"><label class="form-label">Last Name <span style="color:var(--danger)">*</span></label>
                <input id="emp_lastName" class="form-control" placeholder="e.g. Dlamini"></div>
              <div class="form-group"><label class="form-label">Email Address</label>
                <input id="emp_email" type="email" class="form-control"
                  placeholder="sipho@company.co.za"></div>
              <div class="form-group"><label class="form-label">Phone</label>
                <input id="emp_phone" class="form-control" placeholder="073 000 0000"></div>
              <div class="form-group"><label class="form-label">ID Number</label>
                <input id="emp_idNumber" class="form-control" maxlength="13"
                  placeholder="13-digit SA ID"></div>
              <div class="form-group"><label class="form-label">Date of Birth</label>
                <input id="emp_dob" type="date" class="form-control"></div>
              <div class="form-group"><label class="form-label">Gender</label>
                <select id="emp_gender" class="form-control">
                  <option value="">— Select —</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select></div>
              <div class="form-group"><label class="form-label">Nationality</label>
                <select id="emp_nationality" class="form-control">
                  ${empNationalityOptions('South African')}
                </select></div>
              <div class="form-group" style="grid-column:span 2;">
                <label class="form-label">Residential Address</label>
                <input id="emp_address" class="form-control"></div>
            </div>
          </div>

          <!-- TAB: Employment -->
          <div id="addEmpPane_employment" style="display:none;">
            <div class="grid-2">
              <div class="form-group"><label class="form-label">Company <span style="color:var(--danger)">*</span></label>
                <select id="emp_company" class="form-control" onchange="Employees._onCompanyChange(this, 'label_emp_salary')">
                  <option value="">— Select Company —</option>
                  ${companies.map(co => `<option value="${co.name}" data-id="${co.id}">${co.name}</option>`).join('')}
                </select>
                ${!companies.length ? '<div class="form-hint" style="color:var(--danger);">No companies yet — add a company first</div>' : ''}
              </div>
              <div class="form-group"><label class="form-label">Department</label>
                <select id="emp_dept" class="form-control">
                  <option value="">— Select Department —</option>
                  ${deptOptions}
                </select></div>
              <div class="form-group"><label class="form-label">Position / Job Title</label>
                <select id="emp_position" class="form-control">
                  ${posOpts()}
                </select>
                <div class="form-hint">Add positions in Departments &amp; Positions</div>
              </div>
              <div class="form-group"><label class="form-label">Employment Type</label>
                <select id="emp_empType" class="form-control">
                  <option>Permanent</option><option>Fixed Term</option>
                  <option>Part-Time</option><option>Casual</option><option>Contractor</option>
                </select></div>
              <div class="form-group"><label class="form-label">Start Date</label>
                <input id="emp_startDate" type="date" class="form-control"
                  value="${new Date().toISOString().split('T')[0]}"></div>
              <div class="form-group"><label class="form-label">Employee Number</label>
                <input id="emp_empNo" class="form-control"
                  placeholder="Auto-generated if empty"></div>
              <div class="form-group"><label class="form-label" id="label_emp_salary">Basic Salary (R)</label>
                <input id="emp_salary" type="number" class="form-control"
                  placeholder="0.00" min="0"></div>
              <div class="form-group"><label class="form-label">Tax Number</label>
                <input id="emp_taxNo" class="form-control"></div>
            </div>
          </div>

          <!-- TAB: Banking -->
          <div id="addEmpPane_banking" style="display:none;">
            <div class="grid-2">
              <div class="form-group"><label class="form-label">Bank Name</label>
                <select id="emp_bank" class="form-control"
                  onchange="autoFillBranchCode(this,'emp_branchCode')">
                  ${empBankOptions('')}
                </select></div>
              <div class="form-group"><label class="form-label">Account Number</label>
                <input id="emp_accNo" class="form-control"></div>
              <div class="form-group"><label class="form-label">Branch Code</label>
                <input id="emp_branchCode" class="form-control"
                  placeholder="Auto-filled when bank selected"></div>
              <div class="form-group"><label class="form-label">Account Type</label>
                <select id="emp_accType" class="form-control">
                  <option>Cheque/Current</option>
                  <option>Savings</option>
                  <option>Transmission</option>
                </select></div>
            </div>
          </div>

          <!-- Action row -->
          <div style="display:flex;gap:10px;margin-top:24px;">
            <button class="btn btn-outline btn-sm" id="addEmpPrevBtn" style="display:none;"
              onclick="Employees._addEmpNav(-1)">
              <i class="fas fa-arrow-left"></i> Back
            </button>
            <button class="btn btn-primary" style="flex:1;" id="addEmpNextBtn"
              onclick="Employees._addEmpNav(1)">
              Next: Employment <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>`;

    window.showModal('addEmpModal', html);
    window._addEmpStep = 0;
  },

  _addEmpTabs: ['personal', 'employment', 'banking'],

  _switchAddTab: function (tab) {
    this._addEmpTabs.forEach(t => {
      const btn = document.getElementById(`addEmpTab_${t}`);
      const pane = document.getElementById(`addEmpPane_${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
      if (pane) pane.style.display = t === tab ? '' : 'none';
    });
    window._addEmpStep = this._addEmpTabs.indexOf(tab);
    this._updateAddEmpNav();
  },

  _updateAddEmpNav: function () {
    const step = window._addEmpStep || 0;
    const tabs = this._addEmpTabs;
    const prevBtn = document.getElementById('addEmpPrevBtn');
    const nextBtn = document.getElementById('addEmpNextBtn');
    if (prevBtn) prevBtn.style.display = step > 0 ? '' : 'none';
    if (nextBtn) {
      if (step < tabs.length - 1) {
        const nextLabel = ['Employment', 'Banking', 'Save'][step] || 'Next';
        nextBtn.innerHTML = `Next: ${nextLabel} <i class="fas fa-arrow-right"></i>`;
        nextBtn.onclick = () => Employees._addEmpNav(1);
      } else {
        nextBtn.innerHTML = '<i class="fas fa-save"></i> Save Employee';
        nextBtn.onclick = () => Employees.createEmployee({});
      }
    }
  },

  _addEmpNav: function (dir) {
    const step = window._addEmpStep || 0;
    const tabs = this._addEmpTabs;
    const newStep = Math.max(0, Math.min(tabs.length - 1, step + dir));
    this._switchAddTab(tabs[newStep]);
  },


  createEmployee: function (_unused) {
    try {
      // Read directly from DOM — works with both wizard and tab-based form
      const g = id => document.getElementById(id)?.value?.trim() || '';

      const firstName = g('emp_firstName');
      const lastName = g('emp_lastName');
      if (!firstName || !lastName) {
        window.showAlert('Required', 'First name and last name are required.');
        this._switchAddTab('personal'); return;
      }

      const compName = g('emp_company');
      if (!compName) {
        window.showAlert('Required', 'Please select a company for this employee.');
        this._switchAddTab('employment'); return;
      }

      const compSel = document.getElementById('emp_company');
      const compId = compSel?.options[compSel?.selectedIndex]?.dataset?.id || '';

      const maxId = (window.DB.employees || []).reduce((m, e) => Math.max(m, e.id || 0), 0);
      const id = maxId + 1;
      const autoEmpNo = 'EMP' + String(id).padStart(4, '0');

      const selComp = (window.DB.companies || []).find(c => c.id == compId);
      const isHourly = selComp && (selComp.payFrequency === 'Weekly' || selComp.payFrequency === 'Bi-Weekly');
      const salaryVal = parseFloat(document.getElementById('emp_salary')?.value) || 0;

      const emp = {
        id,
        firstName,
        lastName,
        email: g('emp_email'),
        phone: g('emp_phone'),
        cellphone: g('emp_phone'),
        idNumber: g('emp_idNumber'),
        dateOfBirth: g('emp_dob'),
        gender: g('emp_gender'),
        nationality: g('emp_nationality') || 'South African',
        address: g('emp_address'),
        residentialAddress: g('emp_address'),
        companyName: compName,
        companyId: compId,
        department: g('emp_dept'),
        position: g('emp_position'),
        employmentType: g('emp_empType') || 'Permanent',
        startDate: g('emp_startDate') || new Date().toISOString().split('T')[0],
        employeeNumber: g('emp_empNo') || autoEmpNo,
        basicSalary: isHourly ? 0 : salaryVal,
        ratePerHour: isHourly ? salaryVal : 0,
        taxNumber: g('emp_taxNo'),
        bankName: g('emp_bank'),
        accountNumber: g('emp_accNo'),
        branchCode: g('emp_branchCode'),
        accountType: g('emp_accType') || 'Cheque/Current',
        status: 'Active',
        createdAt: new Date().toISOString().split('T')[0],
        photo: null
      };

      window.DB.employees = window.DB.employees || [];
      window.DB.employees.push(emp);
      window.DB.save();

      if (typeof AuditTrail !== 'undefined') {
        AuditTrail.log('CREATE', 'Employee', emp.id, {},
          `Created employee: ${emp.firstName} ${emp.lastName} at ${emp.companyName}`);
      }

      window.Toast.show(
        `${emp.firstName} ${emp.lastName} added successfully!`, 'success');
      window.closeModal('addEmpModal');
      delete window._addEmpStep;

      this.render(document.getElementById('content'));
      if (typeof window.renderNotificationBell === 'function') {
        window.renderNotificationBell();
      }
    } catch (err) {
      window.Toast.show('Error adding employee: ' + err.message, 'warning');
    }
  }
};

window._empStatusFilter = window._empStatusFilter || 'Active';
window._empSearch = window._empSearch || '';
window._empCompanyFilter = window._empCompanyFilter || '';

window.renderEmployees = function (container) {
  Employees.render(container);
};
window.Employees = Employees;