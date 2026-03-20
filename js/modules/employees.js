const Employees = {
  state: { view: 'list', filterStatus: 'active', filterDepartment: 'all', searchQuery: '' },

  render: function (container) {
    const html = `
      <div class="page-title-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <h2 style="font-size:1.25rem;">Employees</h2>
          <div style="color:var(--gray-500);font-size:0.85rem;">Manage your workforce directory</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="Employees.toggleView()">
            <i class="fas fa-${this.state.view === 'list' ? 'th-large' : 'list'}"></i>
          </button>
          <button class="btn btn-outline btn-sm" onclick="Employees.showBulkImport()">
            <i class="fas fa-file-csv"></i> Import CSV
          </button>
          <button class="btn btn-outline btn-sm" onclick="Employees.showDisciplinaryCases()">
            <i class="fas fa-gavel"></i> Disciplinary
          </button>
          <button class="btn btn-primary btn-sm" onclick="Employees.showAddWizard()">
            <i class="fas fa-plus"></i> Add Employee
          </button>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;padding:12px;">
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="search-box" style="flex:1;">
            <input type="text" class="search-input"
              placeholder="Search by name, ID, or position..."
              onkeyup="Employees.search(this.value)">
          </div>
          <select class="form-control" style="width:180px;font-size:0.8rem;"
            onchange="Employees.filterDepartment(this.value)">
            <option value="all">All Departments</option>
            ${[...new Set((window.DB.employees || []).map(e => e.department).filter(Boolean))].map(d =>
      `<option value="${d}">${d}</option>`).join('')}
          </select>
          <select class="form-control" style="width:180px;font-size:0.8rem;"
            onchange="Employees.filterStatus(this.value)">
            <option value="active">Active Only</option>
            <option value="terminated">Terminated</option>
            <option value="all">All Status</option>
          </select>
        </div>
      </div>

      <div id="employeesContainer">
        ${this.state.view === 'list' ? this.renderList() : this.renderGrid()}
      </div>`;
    container.innerHTML = html;
  },

  filterStatus: function (val) { this.state.filterStatus = val; this.render(document.getElementById('content')); },
  filterDepartment: function (val) { this.state.filterDepartment = val; this.render(document.getElementById('content')); },
  search: function (val) { this.state.searchQuery = val.toLowerCase(); this.render(document.getElementById('content')); },

  getFilteredEmployees: function () {
    const { filterStatus, filterDepartment, searchQuery } = this.state;
    return (window.DB.employees || []).filter(e => {
      const matchStatus = filterStatus === 'all' || (e.status || '').toLowerCase() === filterStatus;
      const matchDept = filterDepartment === 'all' || e.department === filterDepartment;
      const matchQuery = !searchQuery ||
        (e.firstName || '').toLowerCase().includes(searchQuery) ||
        (e.lastName || '').toLowerCase().includes(searchQuery) ||
        (e.idNumber || '').toLowerCase().includes(searchQuery) ||
        (e.position || '').toLowerCase().includes(searchQuery);
      return matchStatus && matchDept && matchQuery;
    });
  },

  renderList: function () {
    const emps = this.getFilteredEmployees();
    if (!emps.length) return `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-users"></i></div>
        <div class="empty-state-title">No employees found</div>
        <div class="empty-state-desc">Add your first employee or adjust the filters above.</div>
      </div>`;

    return `
      <div class="card">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Employee</th><th>Department</th><th>Position</th>
                <th class="text-right">Salary</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${emps.map(emp => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      ${emp.photo
        ? `<img src="${emp.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
        : `<div style="width:32px;height:32px;border-radius:50%;background:var(--primary-soft);
                               color:var(--primary);display:flex;align-items:center;justify-content:center;
                               font-weight:700;font-size:0.8rem;">
                             ${(emp.firstName || '?').charAt(0)}${(emp.lastName || '').charAt(0)}
                           </div>`}
                      <div>
                        <div style="font-weight:500;font-size:0.85rem;">${emp.firstName} ${emp.lastName}</div>
                        <small style="color:var(--gray-500);font-size:0.75rem;">${emp.email || '—'}</small>
                      </div>
                    </div>
                  </td>
                  <td style="font-size:0.85rem;">${emp.department || '—'}</td>
                  <td style="font-size:0.85rem;">${emp.position || '—'}</td>
                  <td class="text-right" style="font-size:0.85rem;">${window.formatCurrency(emp.basicSalary || 0)}</td>
                  <td>
                    <span class="badge badge-${emp.status === 'Terminated' ? 'danger' : 'success'}" style="font-size:0.7rem;">
                      ${emp.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <div style="display:flex;gap:4px;">
                      <button class="btn-icon" title="View Profile"    onclick="Employees.viewEmployee(${emp.id})"><i class="fas fa-eye"></i></button>
                      <button class="btn-icon" title="Edit"            onclick="Employees.editEmployee(${emp.id})"><i class="fas fa-edit"></i></button>
                      <button class="btn-icon" title="Salary History"  onclick="Employees.showSalaryHistory(${emp.id})"><i class="fas fa-chart-line"></i></button>
                      <button class="btn-icon" title="Emergency Contacts" onclick="Employees.showEmergencyContacts(${emp.id})"><i class="fas fa-phone-alt"></i></button>
                      ${emp.status !== 'Terminated'
        ? `<button class="btn-icon text-danger" title="Terminate" onclick="Employees.showTerminationWizard(${emp.id})">
                             <i class="fas fa-user-minus"></i>
                           </button>`
        : `<button class="btn-icon text-success" title="Reinstate" onclick="Employees.reinstateEmployee(${emp.id})">
                             <i class="fas fa-undo"></i>
                           </button>`}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  renderGrid: function () {
    const emps = this.getFilteredEmployees();
    if (!emps.length) return '<div class="empty-state"><div class="empty-state-title">No employees found</div></div>';
    return `
      <div class="grid-3" style="gap:12px;">
        ${emps.map(emp => `
          <div class="card" style="padding:12px;">
            <div class="card-body" style="text-align:center;padding:0;">
              <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-soft);
                          color:var(--primary);display:flex;align-items:center;justify-content:center;
                          font-size:1.2rem;font-weight:700;margin:0 auto 12px;">
                ${(emp.firstName || '?').charAt(0)}${(emp.lastName || '').charAt(0)}
              </div>
              <h4 style="margin-bottom:2px;font-size:1rem;">${emp.firstName} ${emp.lastName}</h4>
              <div style="color:var(--gray-500);font-size:0.8rem;margin-bottom:12px;">${emp.position || '—'}</div>
              <button class="btn btn-outline btn-sm" style="width:100%;"
                onclick="Employees.viewEmployee(${emp.id})">View Profile</button>
            </div>
          </div>`).join('')}
      </div>`;
  },

  toggleView: function () {
    this.state.view = this.state.view === 'list' ? 'grid' : 'list';
    this.render(document.getElementById('content'));
  },

  // ── Add Employee Wizard ──────────────────────────────────────────────────────
  showAddWizard: function () {
    const companyOptions = (window.DB.companies || []).map(c =>
      `<option value="${c.id}">${c.name}</option>`).join('');

    if (!companyOptions) {
      window.showAlert('No Companies', 'Please add a company before creating employees.', 'warning');
      return;
    }

    const html = `
      <div class="card" style="width:100%;max-width:800px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title">Add New Employee</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addEmployeeWizard')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div id="employeeWizardContainer" class="card-body"></div>
      </div>`;
    showModal('addEmployeeWizard', html);

    window.currentWizard = new Wizard({
      containerId: 'employeeWizardContainer',
      steps: [
        // ── Step 1: Organisation ─────────────────────────────────────────────
        {
          title: 'Organisation',
          template: `
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Company Entity *</label>
                <select id="new_company" class="form-control">${companyOptions}</select>
              </div>
              <div class="form-group">
                <label class="form-label">Department *</label>
                <select id="new_department" class="form-control">
                  ${(window.DB.departments || []).map(d => `<option value="${d.name}">${d.name}</option>`).join('')
            || '<option value="General">General</option>'}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Position *</label>
                <input type="text" id="new_position" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" id="new_startDate" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Basic Salary (R) *</label>
                <input type="number" id="new_salary" class="form-control" min="0" required>
              </div>
              <div class="form-group">
                <label class="form-label">Employment Type</label>
                <select id="new_empType" class="form-control">
                  <option value="Permanent">Permanent</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>
            </div>`,
          validate: () => {
            // FIXED: use optional chaining to prevent null crashes
            const company = document.getElementById('new_company')?.value?.trim();
            const position = document.getElementById('new_position')?.value?.trim();
            const salary = document.getElementById('new_salary')?.value?.trim();
            if (!company || !position || !salary) {
              window.showAlert('Incomplete Details', 'Company, Position and Basic Salary are required.');
              return false;
            }
            return true;
          }
        },
        // ── Step 2: Personal Details ─────────────────────────────────────────
        {
          title: 'Personal Details',
          template: `
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">First Name *</label>
                <input type="text" id="new_firstName" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">Last Name *</label>
                <input type="text" id="new_lastName" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">SA ID Number</label>
                <input type="text" id="new_idNumber" class="form-control" maxlength="13" placeholder="13-digit ID">
              </div>
              <div class="form-group">
                <label class="form-label">Date of Birth</label>
                <input type="date" id="new_dob" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Gender</label>
                <select id="new_gender" class="form-control">
                  <option value="">— Select —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Race (EEA)</label>
                <select id="new_race" class="form-control">
                  <option value="">— Select —</option>
                  <option value="African">African</option>
                  <option value="Coloured">Coloured</option>
                  <option value="Indian/Asian">Indian/Asian</option>
                  <option value="White">White</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>`,
          validate: () => {
            // FIXED: optional chaining prevents null reference crash
            const first = document.getElementById('new_firstName')?.value?.trim();
            const last = document.getElementById('new_lastName')?.value?.trim();
            if (!first || !last) {
              window.showAlert('Missing Name', 'First Name and Last Name are required.');
              return false;
            }
            return true;
          }
        },
        // ── Step 3: Contact Info ──────────────────────────────────────────────
        {
          title: 'Contact Info',
          template: `
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Email Address *</label>
                <input type="email" id="new_email" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="text" id="new_phone" class="form-control">
              </div>
              <div class="form-group" style="grid-column:span 2;">
                <label class="form-label">Residential Address</label>
                <input type="text" id="new_address" class="form-control">
              </div>
            </div>`,
          validate: () => {
            // FIXED: optional chaining
            const email = document.getElementById('new_email')?.value?.trim();
            if (!email) {
              window.showAlert('Missing Email', 'Email address is required for payslip delivery.');
              return false;
            }
            return true;
          }
        },
        // ── Step 4: Banking & Tax ─────────────────────────────────────────────
        {
          title: 'Banking & Tax',
          template: `
            <div class="alert alert-info" style="margin-bottom:16px;font-size:0.82rem;">
              <i class="fas fa-info-circle"></i>
              Banking details are needed for EFT payroll processing. You can add them later via Edit Profile.
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Bank Name</label>
                <input type="text" id="new_bank" class="form-control" placeholder="e.g. FNB">
              </div>
              <div class="form-group">
                <label class="form-label">Branch Code</label>
                <input type="text" id="new_branch" class="form-control" placeholder="e.g. 250655">
              </div>
              <div class="form-group">
                <label class="form-label">Account Number</label>
                <input type="text" id="new_acc" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Account Type</label>
                <select id="new_accType" class="form-control">
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Transmission">Transmission</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tax Number</label>
                <input type="text" id="new_tax" class="form-control" placeholder="SARS Tax Reference">
              </div>
              <div class="form-group">
                <label class="form-label">UIF Number</label>
                <input type="text" id="new_uif" class="form-control">
              </div>
            </div>`,
          // FIXED: Step 4 has NO mandatory validate — banking is optional
          // (users can fill this in later via Edit Profile)
          validate: () => true
        }
      ],
      onFinish: (data) => {
        Employees.createEmployeeFromWizard(data);
      }
    });

    window.currentWizard.render();
  },

  // ── Create employee from wizard data ─────────────────────────────────────────
  createEmployeeFromWizard: function (data) {
    try {
      console.log('[Employees] Creating employee from wizard data:', data);

      const maxId = (window.DB.employees || []).reduce((m, e) => Math.max(m, e.id || 0), 0);
      const newId = maxId + 1;
      const empNum = `EMP${String(newId).padStart(3, '0')}`;

      const companyId = data.new_company || '';
      const co = (window.DB.companies || []).find(c => c.id == companyId);
      const companyName = co ? co.name : '';

      const newEmp = {
        id: newId,
        employeeNumber: empNum,
        firstName: (data.new_firstName || '').trim(),
        lastName: (data.new_lastName || '').trim(),
        email: (data.new_email || '').trim(),
        position: (data.new_position || '').trim(),
        department: data.new_department || 'General',
        companyId: companyId,
        companyName: companyName,
        idNumber: (data.new_idNumber || '').replace(/\s/g, ''),
        dateOfBirth: data.new_dob || '',
        gender: data.new_gender || '',
        race: data.new_race || '',
        phone: (data.new_phone || '').trim(),
        address: (data.new_address || '').trim(),
        bankName: (data.new_bank || '').trim(),
        branchCode: (data.new_branch || '').trim(),
        accountNumber: (data.new_acc || '').trim(),
        accountType: data.new_accType || 'Savings',
        taxNumber: (data.new_tax || '').trim(),
        uifNumber: (data.new_uif || '').trim(),
        basicSalary: parseFloat(data.new_salary) || 0,
        hireDate: data.new_startDate || '',
        employmentType: data.new_empType || 'Permanent',
        status: 'Active',
        benefits: {
          pensionFund: 'Allan Gray',
          pensionPercent: 5,
          medicalAid: '',
          medicalMembers: 0,
          medicalContribution: 0,
          custom: []
        },
        leaveBalances: { annual: 15, sick: 30, family: 3 }
      };

      // Validation double-check
      if (!newEmp.firstName || !newEmp.lastName) {
        throw new Error('Employee name is missing from wizard data.');
      }

      window.DB.employees = window.DB.employees || [];
      window.DB.employees.push(newEmp);
      window.DB.save();

      console.log('[Employees] Employee created successfully:', newEmp);
      window.Toast.show(`Employee ${newEmp.firstName} ${newEmp.lastName} created!`, 'success');
      window.closeModal('addEmployeeWizard');
      delete window.currentWizard;
      this.render(document.getElementById('content'));
    } catch (err) {
      console.error('[Employees] createEmployeeFromWizard error:', err);
      window.showAlert('Creation Error', 'Failed to create employee: ' + err.message, 'danger');
    }
  },

  viewEmployee: function (id) {
    window.currentEmployee = (window.DB.employees || []).find(e => e.id === id);
    if (typeof loadPage === 'function') loadPage('profile');
  },

  editEmployee: function (id) {
    window.currentEmployee = (window.DB.employees || []).find(e => e.id === id);
    window.currentEmployeeId = id;
    if (typeof loadPage === 'function') loadPage('profile');
    setTimeout(() => { if (typeof Profile !== 'undefined' && Profile.editProfile) Profile.editProfile(id); }, 300);
  },

  // ── Salary History ─────────────────────────────────────────────────────────
  showSalaryHistory: function (id) {
    const emp = (window.DB.employees || []).find(e => e.id === id);
    if (!emp) return;
    emp.salaryHistory = emp.salaryHistory || [];
    const html = `
      <div class="card" style="width:100%;max-width:700px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h4>Salary History — ${emp.firstName} ${emp.lastName}</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('salHistModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <button class="btn btn-primary btn-sm" style="margin-bottom:12px"
            onclick="Employees.addSalaryRecord(${emp.id})">
            <i class="fas fa-plus"></i> Add Adjustment
          </button>
          <div style="margin-bottom:12px;padding:12px;background:var(--gray-50);border-radius:8px;">
            <strong>Current Salary:</strong> ${window.formatCurrency(emp.basicSalary || 0)}
          </div>
          ${!emp.salaryHistory.length
        ? '<div class="text-center" style="padding:20px;color:var(--gray-500)">No salary history recorded yet.</div>'
        : `<div class="table-responsive"><table>
                <thead><tr><th>Date</th><th>Previous</th><th>New Salary</th><th>Reason</th><th>Approved By</th></tr></thead>
                <tbody>
                  ${emp.salaryHistory.map(h => `<tr>
                    <td>${h.date}</td>
                    <td>${window.formatCurrency(h.fromSalary)}</td>
                    <td style="font-weight:600;color:var(--success)">${window.formatCurrency(h.toSalary)}</td>
                    <td>${h.reason}</td><td>${h.approvedBy}</td>
                  </tr>`).join('')}
                </tbody>
               </table></div>`}
        </div>
      </div>`;
    window.showModal('salHistModal', html);
  },

  addSalaryRecord: function (id) {
    const emp = (window.DB.employees || []).find(e => e.id === id);
    if (!emp) return;
    const newSalaryStr = prompt(`Current: R${emp.basicSalary}\nEnter new basic salary:`);
    if (!newSalaryStr) return;
    const newSalary = parseFloat(newSalaryStr);
    if (isNaN(newSalary) || newSalary <= 0) { window.Toast.show('Invalid salary amount', 'warning'); return; }
    const reason = prompt('Reason (e.g. Annual Review, Promotion):') || 'Adjustment';
    emp.salaryHistory = emp.salaryHistory || [];
    emp.salaryHistory.unshift({
      date: new Date().toISOString().split('T')[0],
      fromSalary: emp.basicSalary,
      toSalary: newSalary,
      reason,
      approvedBy: window.currentUser?.name || 'Admin'
    });
    emp.basicSalary = newSalary;
    window.DB.save();
    window.Toast.show('Salary updated', 'success');
    closeModal('salHistModal');
    this.showSalaryHistory(id);
  },

  // ── Emergency Contacts ─────────────────────────────────────────────────────
  showEmergencyContacts: function (id) {
    const emp = (window.DB.employees || []).find(e => e.id === id);
    if (!emp) return;
    emp.emergencyContacts = emp.emergencyContacts || [];
    const html = `
      <div class="card" style="width:100%;max-width:600px;margin:auto;">
        <div class="card-header">
          <h4>Emergency Contacts — ${emp.firstName} ${emp.lastName}</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('emgCtModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          ${emp.emergencyContacts.map((c, i) => `
            <div style="background:var(--gray-50);padding:12px;border-radius:8px;margin-bottom:8px;
                        display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:600">${c.name}</div>
                <div style="font-size:0.82rem;color:var(--gray-500)">${c.relationship} &bull; ${c.phone}</div>
              </div>
              <button class="btn-icon text-danger"
                onclick="Employees.removeEmergencyContact(${id},${i})">
                <i class="fas fa-trash"></i>
              </button>
            </div>`).join('') || '<div style="padding:16px;color:var(--gray-500);text-align:center">No emergency contacts added.</div>'}
          <div style="border-top:1px solid var(--gray-200);margin-top:16px;padding-top:16px;">
            <h5 style="margin-bottom:12px">Add Contact</h5>
            <div class="grid-2">
              <div class="form-group"><label class="form-label">Name</label><input type="text" id="ec_name" class="form-control"></div>
              <div class="form-group"><label class="form-label">Relationship</label><input type="text" id="ec_rel" class="form-control" placeholder="e.g. Spouse"></div>
              <div class="form-group"><label class="form-label">Phone</label><input type="tel" id="ec_phone" class="form-control"></div>
            </div>
            <button class="btn btn-primary" style="width:100%" onclick="Employees.addEmergencyContact(${id})">Add Contact</button>
          </div>
        </div>
      </div>`;
    window.showModal('emgCtModal', html);
  },

  addEmergencyContact: function (id) {
    const emp = (window.DB.employees || []).find(e => e.id === id);
    const name = document.getElementById('ec_name')?.value?.trim();
    const rel = document.getElementById('ec_rel')?.value?.trim();
    const ph = document.getElementById('ec_phone')?.value?.trim();
    if (!name || !ph) { window.Toast.show('Name and phone are required', 'warning'); return; }
    emp.emergencyContacts = emp.emergencyContacts || [];
    emp.emergencyContacts.push({ name, relationship: rel || 'Other', phone: ph });
    window.DB.save();
    closeModal('emgCtModal');
    this.showEmergencyContacts(id);
  },

  removeEmergencyContact: function (id, index) {
    const emp = (window.DB.employees || []).find(e => e.id === id);
    if (!emp) return;
    emp.emergencyContacts.splice(index, 1);
    window.DB.save();
    closeModal('emgCtModal');
    this.showEmergencyContacts(id);
  },

  // ── Termination Wizard ─────────────────────────────────────────────────────
  showTerminationWizard: function (id) {
    const emp = (window.DB.employees || []).find(e => e.id === id);
    if (!emp) return;
    const dailyRate = (emp.basicSalary || 0) / 22;
    const leaveDays = emp.leaveBalances?.annual || 0;
    const leavePayout = dailyRate * leaveDays;

    const html = `
      <div class="card" style="width:100%;max-width:600px;margin:auto;">
        <div class="card-header">
          <h4 style="color:var(--danger)"><i class="fas fa-user-minus"></i> Terminate: ${emp.firstName} ${emp.lastName}</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('terminateModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> This marks the employee as Terminated.</div>
          <div class="form-group">
            <label class="form-label">Reason</label>
            <select id="term_reason" class="form-control">
              <option>Resignation</option><option>Retrenchment</option>
              <option>Dismissal</option><option>Contract End</option><option>Retirement</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Last Day of Service</label>
            <input type="date" id="term_lastday" class="form-control" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div style="background:var(--gray-50);padding:16px;border-radius:8px;margin-bottom:16px;">
            <h5 style="margin-bottom:12px">Final Pay Estimate</h5>
            <table style="width:100%;font-size:0.85rem;">
              <tr><td>Basic Salary</td><td style="text-align:right;font-weight:600">${window.formatCurrency(emp.basicSalary || 0)}</td></tr>
              <tr><td>Leave Payout (${leaveDays} days)</td><td style="text-align:right;font-weight:600">${window.formatCurrency(leavePayout)}</td></tr>
              <tr style="border-top:1px solid var(--gray-300)">
                <td><strong>Estimated Total</strong></td>
                <td style="text-align:right;font-weight:700;color:var(--primary)">${window.formatCurrency((emp.basicSalary || 0) + leavePayout)}</td>
              </tr>
            </table>
          </div>
          <button class="btn btn-danger" style="width:100%" onclick="Employees.processTermination(${id})">Confirm Termination</button>
        </div>
      </div>`;
    window.showModal('terminateModal', html);
  },

  processTermination: function (id) {
    const emp = (window.DB.employees || []).find(e => e.id === id);
    if (!emp) return;
    const reason = document.getElementById('term_reason')?.value || 'Resignation';
    const lastDay = document.getElementById('term_lastday')?.value || new Date().toISOString().split('T')[0];
    emp.status = 'Terminated';
    emp.terminationDate = lastDay;
    emp.terminationReason = reason;
    window.DB.auditLogs = window.DB.auditLogs || [];
    window.DB.auditLogs.unshift({
      id: Date.now(), timestamp: new Date().toLocaleString(),
      user: window.currentUser?.name || 'Admin',
      action: `Employee Terminated (${reason})`, module: 'Employees',
      details: { employeeId: id, name: `${emp.firstName} ${emp.lastName}`, reason, lastDay }
    });
    window.DB.save();
    window.Toast.show(`${emp.firstName} ${emp.lastName} terminated`, 'success');
    closeModal('terminateModal');
    this.render(document.getElementById('content'));
  },

  reinstateEmployee: function (id) {
    const emp = (window.DB.employees || []).find(e => e.id === id);
    if (!emp) return;

    window.showConfirmation(
      'Reinstate Employee',
      `Are you sure you want to reinstate ${emp.firstName} ${emp.lastName}? Their status will be set back to Active.`,
      () => {
        emp.status = 'Active';
        delete emp.terminationDate;
        delete emp.terminationReason;

        window.DB.auditLogs = window.DB.auditLogs || [];
        window.DB.auditLogs.unshift({
          id: Date.now(), timestamp: new Date().toLocaleString(),
          user: window.currentUser?.name || 'Admin',
          action: 'Employee Reinstated', module: 'Employees',
          details: { employeeId: id, name: `${emp.firstName} ${emp.lastName}` }
        });

        window.DB.save();
        window.Toast.show(`${emp.firstName} reinstated successfully`, 'success');
        this.render(document.getElementById('content'));
      }
    );
  },

  // ── Disciplinary Cases ─────────────────────────────────────────────────────
  showDisciplinaryCases: function () {
    window.DB.disciplinaryCases = window.DB.disciplinaryCases || [];
    const cases = window.DB.disciplinaryCases;
    const html = `
      <div class="card" style="width:100%;max-width:800px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h4><i class="fas fa-gavel"></i> Disciplinary Cases</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('discModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <button class="btn btn-primary btn-sm" style="margin-bottom:16px" onclick="Employees.addDisciplinaryCase()">
            <i class="fas fa-plus"></i> New Case
          </button>
          ${!cases.length
        ? '<div class="text-center" style="padding:24px;color:var(--gray-500)">No cases recorded.</div>'
        : `<div class="table-responsive"><table>
                <thead><tr><th>Date</th><th>Employee</th><th>Type</th><th>Details</th><th>Outcome</th><th>Status</th></tr></thead>
                <tbody>
                  ${cases.map(c => {
          const e = (window.DB.employees || []).find(x => x.id === c.employeeId);
          return `<tr>
                      <td>${c.date}</td>
                      <td>${e ? e.firstName + ' ' + e.lastName : '—'}</td>
                      <td><span class="badge badge-${c.type === 'Dismissal' ? 'danger' : c.type === 'Warning' ? 'warning' : 'info'}">${c.type}</span></td>
                      <td>${c.details}</td><td>${c.outcome || 'Pending'}</td>
                      <td><span class="badge badge-${c.status === 'Closed' ? 'success' : 'warning'}">${c.status}</span></td>
                    </tr>`;
        }).join('')}
                </tbody>
               </table></div>`}
        </div>
      </div>`;
    window.showModal('discModal', html);
  },

  addDisciplinaryCase: function () {
    const empOptions = (window.DB.employees || []).map(e =>
      `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('');
    const html = `
      <div class="card" style="width:100%;max-width:550px;margin:auto;">
        <div class="card-header"><h4>New Disciplinary Case</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addDiscModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Employee</label>
            <select id="disc_emp" class="form-control">${empOptions}</select></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Type</label>
              <select id="disc_type" class="form-control">
                <option>Verbal Warning</option><option>Written Warning</option>
                <option>Final Warning</option><option>Suspension</option>
                <option>Dismissal</option><option>Grievance</option>
              </select></div>
            <div class="form-group"><label class="form-label">Date</label>
              <input type="date" id="disc_date" class="form-control"
                value="${new Date().toISOString().split('T')[0]}"></div>
          </div>
          <div class="form-group"><label class="form-label">Details</label>
            <textarea id="disc_details" class="form-control" rows="3"></textarea></div>
          <div class="form-group"><label class="form-label">Outcome</label>
            <input type="text" id="disc_outcome" class="form-control" placeholder="e.g. Counselled"></div>
          <button class="btn btn-primary" style="width:100%" onclick="Employees.saveDiscCase()">Save</button>
        </div>
      </div>`;
    window.showModal('addDiscModal', html);
  },

  saveDiscCase: function () {
    window.DB.disciplinaryCases = window.DB.disciplinaryCases || [];
    window.DB.disciplinaryCases.unshift({
      id: Date.now(),
      employeeId: parseInt(document.getElementById('disc_emp')?.value || 0),
      type: document.getElementById('disc_type')?.value || '',
      date: document.getElementById('disc_date')?.value || '',
      details: document.getElementById('disc_details')?.value || '',
      outcome: document.getElementById('disc_outcome')?.value || 'Pending',
      status: 'Open',
      createdBy: window.currentUser?.name || 'Admin'
    });
    window.DB.save();
    window.Toast.show('Case recorded', 'success');
    closeModal('addDiscModal');
    this.showDisciplinaryCases();
  },

  // ── Bulk CSV Import ────────────────────────────────────────────────────────
  showBulkImport: function () {
    const html = `
      <div class="card" style="width:100%;max-width:700px;margin:auto;">
        <div class="card-header">
          <h4><i class="fas fa-file-csv"></i> Bulk Employee Import (CSV)</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('bulkImportModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="alert alert-info">
            Columns: <code>FirstName, LastName, Email, IDNumber, Department, Position, BasicSalary, Company, HireDate</code><br>
            <a href="#" onclick="Employees.downloadTemplate()">Download template</a>
          </div>
          <div style="border:2px dashed var(--gray-300);border-radius:8px;padding:32px;text-align:center;margin-bottom:16px;">
            <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:var(--gray-400);display:block;margin-bottom:8px;"></i>
            <input type="file" id="csvFileInput" accept=".csv" style="display:none;"
              onchange="Employees.parseCSV(this.files[0])">
            <button class="btn btn-outline" onclick="document.getElementById('csvFileInput').click()">Browse File</button>
          </div>
          <div id="csvPreview"></div>
        </div>
      </div>`;
    window.showModal('bulkImportModal', html);
  },

  downloadTemplate: function () {
    const csv = 'FirstName,LastName,Email,IDNumber,Department,Position,BasicSalary,Company,HireDate\nJohn,Doe,john@example.com,8001015009087,IT,Developer,35000,My Company,2024-01-15';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'employee_import_template.csv';
    a.click();
  },

  parseCSV: function (file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const lines = e.target.result.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
      const preview = lines.slice(1).map(row => {
        const cols = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
        return obj;
      });
      const el = document.getElementById('csvPreview');
      if (!el) return;
      if (!preview.length) { el.innerHTML = '<div class="alert alert-warning">No data rows found.</div>'; return; }
      el.innerHTML = `
        <div style="margin-bottom:8px;font-weight:600;">${preview.length} employees found</div>
        <div style="max-height:200px;overflow-y:auto;margin-bottom:12px;">
          <table style="width:100%;font-size:0.8rem;">
            <thead><tr><th>Name</th><th>Email</th><th>Dept</th><th>Salary</th></tr></thead>
            <tbody>${preview.map(p => `<tr>
              <td>${p.firstname || ''} ${p.lastname || ''}</td>
              <td>${p.email || ''}</td><td>${p.department || ''}</td>
              <td>R${p.basicsalary || 0}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
        <button class="btn btn-primary" style="width:100%"
          onclick="window._csvImport=${JSON.stringify(preview)}; Employees.importCSVData()">
          Import ${preview.length} Employees
        </button>`;
    };
    reader.readAsText(file);
  },

  importCSVData: function () {
    const data = window._csvImport;
    if (!data?.length) return;
    let added = 0;
    const maxId = (window.DB.employees || []).reduce((m, e) => Math.max(m, e.id || 0), 0);
    data.forEach(row => {
      window.DB.employees = window.DB.employees || [];
      window.DB.employees.push({
        id: maxId + 1 + added,
        firstName: row.firstname || row.name?.split(' ')[0] || '',
        lastName: row.lastname || row.name?.split(' ').slice(1).join(' ') || '',
        email: row.email || '',
        idNumber: row.idnumber || '',
        department: row.department || '',
        position: row.position || '',
        basicSalary: parseFloat(row.basicsalary || row.salary || 0),
        companyName: row.company || '',
        hireDate: row.hiredate || '',
        status: 'Active',
        benefits: { pensionFund: 'Allan Gray', pensionPercent: 5 },
        leaveBalances: { annual: 15, sick: 30, family: 3 }
      });
      added++;
    });
    window.DB.save();
    window.Toast.show(`${added} employees imported`, 'success');
    closeModal('bulkImportModal');
    this.render(document.getElementById('content'));
  }
};

window.renderEmployees = function (container) {
  Employees.render(container);
};