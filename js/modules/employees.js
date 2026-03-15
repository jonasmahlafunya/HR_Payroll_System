const Employees = {
  state: {
    view: 'list',
    filter: 'all'
  },

  render: function (container) {
    const html = `
        <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 1.25rem;">Employees</h2>
            <div style="color: var(--gray-500); font-size: 0.85rem;">Manage your workforce directory</div>
          </div>
          <div style="display: flex; gap: 8px;">
             <button class="btn btn-outline btn-sm" onclick="Employees.toggleView()"><i class="fas fa-${this.state.view === 'list' ? 'th-large' : 'list'}"></i></button>
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
  
        <div class="card" style="margin-bottom: 16px; padding: 12px;">
            <div style="display: flex; gap: 12px; align-items: center;">
               <div class="search-box" style="flex: 1;">
                 <input type="text" class="search-input" placeholder="Search by name, ID, or position..." onkeyup="Employees.search(this.value)">
               </div>
               <select class="form-control" style="width: 180px; font-size: 0.8rem;" onchange="Employees.filterDepartment(this.value)">
                 <option value="all">All Departments</option>
                 <option value="IT">IT</option>
                 <option value="Finance">Finance</option>
                 <option value="HR">HR</option>
                 <option value="Operations">Operations</option>
               </select>
               <select class="form-control" style="width: 180px; font-size: 0.8rem;" onchange="Employees.filterStatus(this.value)">
                 <option value="active">Active Only</option>
                 <option value="terminated">Terminated</option>
                 <option value="all">All Status</option>
               </select>
            </div>
        </div>
  
        <div id="employeesContainer">
          ${this.state.view === 'list' ? this.renderList() : this.renderGrid()}
        </div>
      `;
    container.innerHTML = html;
  },

  filterStatus: function(val) {
    this.state.filterStatus = val;
    this.render(document.getElementById('content'));
  },

  search: function(query) {
    this.state.searchQuery = query.toLowerCase();
    this.render(document.getElementById('content'));
  },

  filterDepartment: function(dept) {
    this.state.filterDepartment = dept;
    this.render(document.getElementById('content'));
  },

  getFilteredEmployees: function() {
    const statusFilter = this.state.filterStatus || 'active';
    const deptFilter = this.state.filterDepartment || 'all';
    const query = this.state.searchQuery || '';
    
    return window.DB.employees.filter(e => {
        const matchesStatus = statusFilter === 'all' || (e.status || '').toLowerCase() === statusFilter;
        const matchesDept = deptFilter === 'all' || e.department === deptFilter;
        const matchesQuery = !query || 
            (e.firstName || '').toLowerCase().includes(query) || 
            (e.lastName || '').toLowerCase().includes(query) || 
            (e.idNumber || '').toLowerCase().includes(query) || 
            (e.position || '').toLowerCase().includes(query);
        return matchesStatus && matchesDept && matchesQuery;
    });
  },

  renderList: function () {
    const emps = this.getFilteredEmployees();
    return `
        <div class="card">
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Company</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${emps.map(emp => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        ${emp.photo
                          ? `<img src="${emp.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
                          : `<div class="avatar" style="width:32px;height:32px;font-size:0.8rem;background:var(--primary-light);color:white;display:flex;justify-content:center;align-items:center;">${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}</div>`
                        }
                        <div>
                          <div style="font-weight: 500; font-size: 0.85rem;">${emp.firstName} ${emp.lastName}</div>
                          <small style="color: var(--gray-500); font-size: 0.75rem;">${emp.email}</small>
                        </div>
                      </div>
                    </td>
                    <td style="font-size: 0.85rem;">${emp.companyName || 'Acme Corp'}</td>
                    <td style="font-size: 0.85rem;">${emp.department}</td>
                    <td style="font-size: 0.85rem;">${emp.position}</td>
                    <td style="font-size: 0.85rem;">${window.formatCurrency(emp.basicSalary || 0)}</td>
                    <td><span class="badge badge-${emp.status === 'Terminated' ? 'danger' : 'success'}" style="font-size: 0.7rem;">${emp.status}</span></td>
                    <td>
                    <div style="display:flex;gap:4px;">
                      <button class="btn-icon" title="View Profile" onclick="Employees.viewEmployee(${emp.id})"><i class="fas fa-eye"></i></button>
                      <button class="btn-icon" title="Edit" onclick="Employees.editEmployee(${emp.id})"><i class="fas fa-edit"></i></button>
                      <button class="btn-icon" title="Salary History" onclick="Employees.showSalaryHistory(${emp.id})"><i class="fas fa-chart-line"></i></button>
                      <button class="btn-icon" title="Emergency Contacts" onclick="Employees.showEmergencyContacts(${emp.id})"><i class="fas fa-phone-alt"></i></button>
                      ${emp.status !== 'Terminated' ? `<button class="btn-icon text-danger" title="Terminate" onclick="Employees.showTerminationWizard(${emp.id})"><i class="fas fa-user-minus"></i></button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            </table>
          </div>
        </div>
      `;
  },

  renderGrid: function () {
    const emps = this.getFilteredEmployees();
    return `
        <div class="grid-3" style="gap: 12px;">
          ${emps.map(emp => `
            <div class="card" style="padding: 12px;">
               <div class="card-body" style="text-align: center; padding: 0;">
                  <div class="avatar avatar-lg" style="background: var(--primary-light); color: white; display: flex; justify-content: center; align-items: center; font-size: 1.5rem; margin: 0 auto 12px; width: 48px; height: 48px;">
                    ${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}
                  </div>
                  <h4 style="margin-bottom: 2px; font-size: 1rem;">${emp.firstName} ${emp.lastName}</h4>
                  <div style="color: var(--gray-500); margin-bottom: 12px; font-size: 0.8rem;">${emp.position}</div>
                  
                  <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;">
                    <span class="badge badge-info" style="font-size: 0.7rem;">${emp.department}</span>
                    <span class="badge badge-success" style="font-size: 0.7rem;">${emp.status}</span>
                  </div>
  
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: left; background: var(--gray-50); padding: 8px; border-radius: 6px; font-size: 0.75rem; margin-bottom: 12px;">
                    <div>
                      <div style="color: var(--gray-500);">ID Number</div>
                      <div style="font-weight: 500;">${emp.idNumber || '-'}</div>
                    </div>
                    <div>
                      <div style="color: var(--gray-500);">Date Hired</div>
                      <div style="font-weight: 500;">${emp.hireDate || '-'}</div>
                    </div>
                  </div>
  
                  <button class="btn btn-primary btn-outline btn-sm" style="width: 100%;" onclick="Employees.viewEmployee(${emp.id})">View Profile</button>
               </div>
            </div>
          `).join('')}
        </div>
      `;
  },

  toggleView: function () {
    this.state.view = this.state.view === 'list' ? 'grid' : 'list';
    this.render(document.getElementById('content'));
  },

  search: function (query) {
    console.log("Searching for:", query);
  },

  filterDepartment: function (dept) {
    console.log("Filtering by dept:", dept);
  },

  showAddWizard: function () {
    const companyOptions = window.DB.companies.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

    const html = `
        <div class="card" style="width: 100%; max-width: 800px; margin: auto; max-height: 90vh; overflow-y: auto;">
           <div class="card-header">
              <h3 class="card-title">Add New Employee</h3>
              <button class="btn btn-outline btn-sm" onclick="closeModal('addEmployeeWizard')"><i class="fas fa-times"></i></button>
           </div>
           <div id="employeeWizardContainer" class="card-body"></div>
        </div>
      `;
    showModal('addEmployeeWizard', html);

    window.currentWizard = new Wizard({
      containerId: 'employeeWizardContainer',
      steps: [
        {
          title: 'Organization',
          template: `
              <div class="grid-2">
                 <div class="form-group">
                    <label class="form-label">Company Entity *</label>
                    <select id="new_company" class="form-control">${companyOptions}</select>
                 </div>
                 <div class="form-group">
                     <label class="form-label">Department *</label>
                     <select id="new_department" class="form-control">
                        <option value="IT">IT</option>
                        <option value="Finance">Finance</option>
                        <option value="HR">HR</option>
                        <option value="Operations">Operations</option>
                        <option value="Sales">Sales</option>
                        <option value="Marketing">Marketing</option>
                     </select>
                 </div>
                 <div class="form-group"><label class="form-label">Position *</label><input type="text" id="new_position" class="form-control" required></div>
                 <div class="form-group"><label class="form-label">Start Date *</label><input type="date" id="new_startDate" class="form-control" required></div>
                 <div class="form-group"><label class="form-label">Basic Salary (R) *</label><input type="number" id="new_salary" class="form-control" required></div>
              </div>
          `,
          validate: () => {
            const fields = ['new_company', 'new_department', 'new_position', 'new_startDate', 'new_salary'];
            const missing = fields.filter(f => !document.getElementById(f).value);
            if (missing.length > 0) { window.showAlert('Incomplete Organization Details', 'Please complete all organization fields marked with (*).'); return false; }
            return true;
          }
        },
        {
          title: 'Personal Details',
          template: `
              <div class="grid-2">
                 <div class="form-group"><label class="form-label">First Name *</label><input type="text" id="new_firstName" class="form-control" required></div>
                 <div class="form-group"><label class="form-label">Last Name *</label><input type="text" id="new_lastName" class="form-control" required></div>
                 <div class="form-group"><label class="form-label">ID Number *</label><input type="text" id="new_idNumber" class="form-control" required></div>
                 <div class="form-group"><label class="form-label">Date of Birth</label><input type="date" id="new_dob" class="form-control"></div>
                 <div class="form-group">
                    <label class="form-label">Gender</label>
                    <select id="new_gender" class="form-control">
                       <option value="Male">Male</option>
                       <option value="Female">Female</option>
                    </select>
                 </div>
              </div>
          `,
          validate: () => {
            const fields = ['new_firstName', 'new_lastName', 'new_idNumber'];
            const missing = fields.filter(f => !document.getElementById(f).value);
            if (missing.length > 0) { window.showAlert('Incomplete Personal Details', 'First Name, Last Name and ID Number are required.'); return false; }
            return true;
          }
        },
        {
          title: 'Contact Info',
          template: `
              <div class="grid-2">
                  <div class="form-group"><label class="form-label">Email *</label><input type="email" id="new_email" class="form-control" required></div>
                  <div class="form-group"><label class="form-label">Phone</label><input type="text" id="new_phone" class="form-control"></div>
                  <div class="form-group" style="grid-column: span 2;"><label class="form-label">Address</label><input type="text" id="new_address" class="form-control"></div>
              </div>
          `,
          validate: () => {
            if (!document.getElementById('new_email').value) { window.showAlert('Missing Email', 'Email address is required for contact purposes.'); return false; }
            return true;
          }
        },
        {
          title: 'Banking & Tax',
          template: `
              <div class="grid-2">
                  <div class="form-group"><label class="form-label">Bank Name *</label><input type="text" id="new_bank" class="form-control" required></div>
                  <div class="form-group"><label class="form-label">Branch Code *</label><input type="text" id="new_branch" class="form-control" required></div>
                  <div class="form-group"><label class="form-label">Account Number *</label><input type="text" id="new_acc" class="form-control" required></div>
                  <div class="form-group">
                     <label class="form-label">Account Type</label>
                     <select id="new_accType" class="form-control">
                        <option value="Savings">Savings</option>
                        <option value="Current">Current</option>
                        <option value="Transmission">Transmission</option>
                     </select>
                  </div>
                  <div class="form-group"><label class="form-label">Tax Number *</label><input type="text" id="new_tax" class="form-control" required></div>
              </div>
          `,
          validate: () => {
            const fields = ['new_bank', 'new_branch', 'new_acc', 'new_tax'];
            const missing = fields.filter(f => !document.getElementById(f).value);
            if (missing.length > 0) { window.showAlert('Incomplete Banking Details', 'All banking and tax details are now mandatory.'); return false; }
            return true;
          }
        }
      ],
      onFinish: (data) => {
        Employees.createEmployeeFromWizard(data);
      }
    });

    window.currentWizard.render();
  },

  createEmployeeFromWizard: function (data) {
    const newEmp = {
      id: window.DB.employees.length + 1,
      employeeNumber: `EMP${String(window.DB.employees.length + 1).padStart(3, '0')}`,
      firstName: data.new_firstName,
      lastName: data.new_lastName,
      email: data.new_email,
      position: data.new_position,
      department: data.new_department,
      companyName: data.new_company,
      idNumber: data.new_idNumber,
      dateOfBirth: data.new_dob,
      gender: data.new_gender,
      phone: data.new_phone,
      address: data.new_address,
      bankName: data.new_bank,
      branchCode: data.new_branch,
      accountNumber: data.new_acc,
      accountType: data.new_accType,
      taxNumber: data.new_tax,
      basicSalary: parseFloat(data.new_salary) || 0,
      hireDate: data.new_startDate,
      status: 'Active',
      initials: data.new_firstName.charAt(0) + data.new_lastName.charAt(0),
      benefits: {
        pensionFund: "Allan Gray",
        pensionPercent: 5,
        medicalAid: "None",
        medicalMembers: 0,
        medicalContribution: 0,
        custom: []
      }
    };

    window.DB.employees.push(newEmp);
    window.DB.save();

    window.Toast.show('Employee created successfully!', 'success');
    window.closeModal('addEmployeeWizard');
    this.render(document.getElementById('content'));
    delete window.currentWizard;
  },

  // Legacy (replaced)
  createEmployee: function () {
    const firstName = document.getElementById('new_firstName').value;
    const lastName = document.getElementById('new_lastName').value;
    const email = document.getElementById('new_email').value;
    const position = document.getElementById('new_position').value;
    const department = document.getElementById('new_department').value;
    const companyName = document.getElementById('new_company').value;
    const idNumber = document.getElementById('new_idNumber').value;

    if (!firstName || !lastName || !email || !idNumber || !companyName) {
      window.Toast.show("Please fill in all required fields (*)", "warning");
      return;
    }

    const newEmp = {
      id: window.DB.employees.length + 1,
      employeeNumber: `EMP${String(window.DB.employees.length + 1).padStart(3, '0')}`,
      firstName,
      lastName,
      email,
      position,
      department,
      companyName,
      idNumber,
      // Extended fields
      dateOfBirth: document.getElementById('new_dob').value,
      gender: document.getElementById('new_gender').value,
      phone: document.getElementById('new_phone').value,
      address: document.getElementById('new_address').value,

      // Banking & Tax
      bankName: document.getElementById('new_bank').value,
      branchCode: document.getElementById('new_branch').value,
      accountNumber: document.getElementById('new_acc').value,
      accountType: document.getElementById('new_accType').value,
      taxNumber: document.getElementById('new_tax').value,

      basicSalary: parseFloat(document.getElementById('new_salary').value) || 0,
      hireDate: document.getElementById('new_startDate').value,
      status: 'Active',
      initials: firstName.charAt(0) + lastName.charAt(0),
      benefits: {
        pensionFund: "Allan Gray", // Mandatory Default
        pensionPercent: 5,
        medicalAid: "None",
        medicalMembers: 0,
        medicalContribution: 0,
        custom: []
      }
    };

    window.DB.employees.push(newEmp);
    window.DB.save();

    window.Toast.show('Employee created successfully!', 'success');
    window.closeModal('addEmployeeModal');
    this.render(document.getElementById('content'));
  },

  editEmployee: function (id) {
    const emp = window.DB.employees.find(e => e.id === id);
    if (!emp) {
      window.Toast.show('Employee not found', 'error');
      return;
    }

    // Set current employee globally for Profile module
    window.currentEmployee = emp;

    // Navigate to profile page
    window.loadPage('profile');

    // Wait for page to load, then open edit modal with the specific employee
    setTimeout(() => {
      if (typeof Profile !== 'undefined' && Profile.editProfile) {
        Profile.editProfile(id);
      }
    }, 300);
  },

  viewEmployee: function (id) {
    window.currentEmployee = window.DB.employees.find(e => e.id === id);
    if (typeof loadPage === 'function') {
      loadPage('profile');
    } else {
      const container = document.getElementById('content');
      if (window.renderProfile) window.renderProfile(container);
    }
  },

  deleteEmployee: function (id) {
    window.showConfirmation("Delete Employee?", "Are you sure you want to remove this employee?", () => {
      window.DB.employees = window.DB.employees.filter(e => e.id !== id);
      window.DB.save();
      window.Toast.show("Employee deleted", "success");
      this.render(document.getElementById('content'));
    });
  },

  // ─── Salary History ────────────────────────────────────────────────────
  showSalaryHistory: function (id) {
    const emp = window.DB.employees.find(e => e.id === id);
    if (!emp) return;
    emp.salaryHistory = emp.salaryHistory || [];

    const html = `
      <div class="card" style="width:100%;max-width:700px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h4>Salary History — ${emp.firstName} ${emp.lastName}</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('salHistModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <button class="btn btn-primary btn-sm" style="margin-bottom:12px" onclick="Employees.addSalaryRecord(${emp.id})">
            <i class="fas fa-plus"></i> Add Adjustment
          </button>
          ${emp.salaryHistory.length === 0 ? '<div class="text-center" style="padding:20px;color:var(--gray-500)">No salary history recorded yet.</div>' : `
            <div class="table-responsive">
              <table>
                <thead><tr><th>Date</th><th>Previous</th><th>New Salary</th><th>Reason</th><th>Approved By</th></tr></thead>
                <tbody>
                  ${emp.salaryHistory.map(h => `<tr>
                    <td>${h.date}</td>
                    <td>${window.formatCurrency(h.fromSalary)}</td>
                    <td style="font-weight:600;color:var(--success)">${window.formatCurrency(h.toSalary)}</td>
                    <td>${h.reason}</td><td>${h.approvedBy}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          `}
          <div style="margin-top:16px;padding:12px;background:var(--gray-50);border-radius:8px;">
            <strong>Current Salary:</strong> ${window.formatCurrency(emp.basicSalary || 0)}
          </div>
        </div>
      </div>`;
    window.showModal('salHistModal', html);
  },

  addSalaryRecord: function (id) {
    const emp = window.DB.employees.find(e => e.id === id);
    if (!emp) return;
    const newSalaryStr = prompt(`Current salary: R${emp.basicSalary}\nEnter new basic salary:`);
    if (!newSalaryStr) return;
    const newSalary = parseFloat(newSalaryStr);
    if (isNaN(newSalary) || newSalary <= 0) { window.Toast.show('Invalid salary amount', 'warning'); return; }
    const reason = prompt('Reason for adjustment (e.g. Annual Review, Promotion):') || 'Adjustment';
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
    window.Toast.show('Salary record updated', 'success');
    closeModal('salHistModal');
    this.showSalaryHistory(id);
  },

  // ─── Emergency Contacts ───────────────────────────────────────────────
  showEmergencyContacts: function (id) {
    const emp = window.DB.employees.find(e => e.id === id);
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
            <div style="background:var(--gray-50);padding:12px;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:600">${c.name}</div>
                <div style="font-size:0.82rem;color:var(--gray-500)">${c.relationship} &bull; ${c.phone}</div>
              </div>
              <button class="btn-icon text-danger" onclick="Employees.removeEmergencyContact(${id},${i})"><i class="fas fa-trash"></i></button>
            </div>
          `).join('') || '<div class="text-center" style="padding:16px;color:var(--gray-500)">No emergency contacts added.</div>'}
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
    const emp = window.DB.employees.find(e => e.id === id);
    const name = document.getElementById('ec_name')?.value?.trim();
    const rel  = document.getElementById('ec_rel')?.value?.trim();
    const phone= document.getElementById('ec_phone')?.value?.trim();
    if (!name || !phone) { window.Toast.show('Name and phone are required', 'warning'); return; }
    emp.emergencyContacts = emp.emergencyContacts || [];
    emp.emergencyContacts.push({ name, relationship: rel || 'Other', phone });
    window.DB.save();
    closeModal('emgCtModal');
    this.showEmergencyContacts(id);
  },

  removeEmergencyContact: function (id, index) {
    const emp = window.DB.employees.find(e => e.id === id);
    if (!emp) return;
    emp.emergencyContacts.splice(index, 1);
    window.DB.save();
    closeModal('emgCtModal');
    this.showEmergencyContacts(id);
  },

  // ─── Termination Wizard ───────────────────────────────────────────────
  showTerminationWizard: function (id) {
    const emp = window.DB.employees.find(e => e.id === id);
    if (!emp) return;
    const dailyRate = (emp.basicSalary || 0) / 22; // approx working days
    const leaveBalance = emp.leaveBalances?.annual || 0;
    const leavePayout = dailyRate * leaveBalance;

    const html = `
      <div class="card" style="width:100%;max-width:600px;margin:auto;">
        <div class="card-header">
          <h4 style="color:var(--danger)"><i class="fas fa-user-minus"></i> Terminate: ${emp.firstName} ${emp.lastName}</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('terminateModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> This action will mark the employee as Terminated and generate a final payslip.</div>
          <div class="form-group">
            <label class="form-label">Termination Reason</label>
            <select id="term_reason" class="form-control">
              <option value="Resignation">Resignation</option>
              <option value="Retrenchment">Retrenchment</option>
              <option value="Dismissal">Dismissal</option>
              <option value="Contract End">Contract End</option>
              <option value="Retirement">Retirement</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Last Day of Service</label>
            <input type="date" id="term_lastday" class="form-control" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Notice Period (days)</label>
            <input type="number" id="term_notice" class="form-control" value="30">
          </div>
          <div style="background:var(--gray-50);padding:16px;border-radius:8px;margin-bottom:16px;">
            <h5 style="margin-bottom:12px">Final Pay Calculation</h5>
            <table style="width:100%;font-size:0.85rem;">
              <tr><td>Basic Salary (pro-rata)</td><td style="text-align:right;font-weight:600">${window.formatCurrency(emp.basicSalary || 0)}</td></tr>
              <tr><td>Leave Payout (${leaveBalance} days)</td><td style="text-align:right;font-weight:600">${window.formatCurrency(leavePayout)}</td></tr>
              <tr style="border-top:1px solid var(--gray-300)"><td><strong>Estimated Total</strong></td><td style="text-align:right;font-weight:700;color:var(--primary)">${window.formatCurrency((emp.basicSalary || 0) + leavePayout)}</td></tr>
            </table>
          </div>
          <button class="btn btn-danger" style="width:100%" onclick="Employees.processTermination(${id})">Confirm Termination</button>
        </div>
      </div>`;
    window.showModal('terminateModal', html);
  },

  processTermination: function (id) {
    const emp = window.DB.employees.find(e => e.id === id);
    if (!emp) return;
    const reason = document.getElementById('term_reason')?.value || 'Resignation';
    const lastDay = document.getElementById('term_lastday')?.value || new Date().toISOString().split('T')[0];

    emp.status = 'Terminated';
    emp.terminationDate = lastDay;
    emp.terminationReason = reason;

    // Create audit log
    if (!window.DB.auditLogs) window.DB.auditLogs = [];
    window.DB.auditLogs.unshift({
      id: Date.now(), timestamp: new Date().toLocaleString(),
      user: window.currentUser?.name || 'Admin',
      action: `Employee Terminated (${reason})`,
      module: 'Employees',
      details: { employeeId: id, name: `${emp.firstName} ${emp.lastName}`, reason, lastDay }
    });

    window.DB.save();
    window.Toast.show(`${emp.firstName} ${emp.lastName} terminated successfully`, 'success');
    closeModal('terminateModal');
    this.render(document.getElementById('content'));
  },

  // ─── Disciplinary Cases ───────────────────────────────────────────────
  showDisciplinaryCases: function () {
    window.DB.disciplinaryCases = window.DB.disciplinaryCases || [];
    const cases = window.DB.disciplinaryCases;

    const html = `
      <div class="card" style="width:100%;max-width:800px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h4><i class="fas fa-gavel"></i> Disciplinary & Grievance Cases</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('discModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <button class="btn btn-primary btn-sm" style="margin-bottom:16px" onclick="Employees.addDisciplinaryCase()">
            <i class="fas fa-plus"></i> New Case
          </button>
          ${cases.length === 0 ? '<div class="text-center" style="padding:24px;color:var(--gray-500)">No cases recorded.</div>' : `
            <div class="table-responsive">
              <table>
                <thead><tr><th>Date</th><th>Employee</th><th>Type</th><th>Details</th><th>Outcome</th><th>Status</th></tr></thead>
                <tbody>
                  ${cases.map(c => {
                    const emp = window.DB.employees.find(e => e.id === c.employeeId);
                    return `<tr>
                      <td>${c.date}</td>
                      <td>${emp ? emp.firstName + ' ' + emp.lastName : 'Unknown'}</td>
                      <td><span class="badge badge-${c.type === 'Dismissal' ? 'danger' : c.type === 'Warning' ? 'warning' : 'info'}">${c.type}</span></td>
                      <td style="max-width:200px;">${c.details}</td>
                      <td>${c.outcome || 'Pending'}</td>
                      <td><span class="badge badge-${c.status === 'Closed' ? 'success' : 'warning'}">${c.status}</span></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>`;
    window.showModal('discModal', html);
  },

  addDisciplinaryCase: function () {
    const empOptions = window.DB.employees.map(e => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('');
    const html = `
      <div class="card" style="width:100%;max-width:550px;margin:auto;">
        <div class="card-header"><h4>New Disciplinary Case</h4><button class="btn btn-outline btn-sm" onclick="closeModal('addDiscModal')"><i class="fas fa-times"></i></button></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Employee</label><select id="disc_emp" class="form-control">${empOptions}</select></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Type</label>
              <select id="disc_type" class="form-control">
                <option>Verbal Warning</option><option>Written Warning</option><option>Final Warning</option>
                <option>Suspension</option><option>Dismissal</option><option>Grievance</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Date</label><input type="date" id="disc_date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></div>
          </div>
          <div class="form-group"><label class="form-label">Details</label><textarea id="disc_details" class="form-control" rows="3" placeholder="Describe the incident..."></textarea></div>
          <div class="form-group"><label class="form-label">Outcome</label><input type="text" id="disc_outcome" class="form-control" placeholder="e.g. Counselled, Warning Issued"></div>
          <button class="btn btn-primary" style="width:100%" onclick="Employees.saveDiscCase()">Save Case</button>
        </div>
      </div>`;
    window.showModal('addDiscModal', html);
  },

  saveDiscCase: function () {
    window.DB.disciplinaryCases = window.DB.disciplinaryCases || [];
    window.DB.disciplinaryCases.unshift({
      id: Date.now(),
      employeeId: parseInt(document.getElementById('disc_emp').value),
      type: document.getElementById('disc_type').value,
      date: document.getElementById('disc_date').value,
      details: document.getElementById('disc_details').value,
      outcome: document.getElementById('disc_outcome').value || 'Pending',
      status: 'Open',
      createdBy: window.currentUser?.name || 'Admin'
    });
    window.DB.save();
    window.Toast.show('Case recorded', 'success');
    closeModal('addDiscModal');
    this.showDisciplinaryCases();
  },

  // ─── Bulk CSV Import ──────────────────────────────────────────────────
  showBulkImport: function () {
    const html = `
      <div class="card" style="width:100%;max-width:700px;margin:auto;">
        <div class="card-header">
          <h4><i class="fas fa-file-csv"></i> Bulk Employee Import (CSV)</h4>
          <button class="btn btn-outline btn-sm" onclick="closeModal('bulkImportModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            <div>Upload a CSV file with columns: <code>FirstName, LastName, Email, IDNumber, Department, Position, BasicSalary, Company, HireDate</code><br>
            <a href="#" onclick="Employees.downloadTemplate()">Download template CSV</a></div>
          </div>
          <div style="border:2px dashed var(--gray-300);border-radius:8px;padding:32px;text-align:center;margin-bottom:16px;">
            <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:var(--gray-400);margin-bottom:8px;"></i>
            <div style="margin-bottom:8px;">Drop CSV file here or</div>
            <input type="file" id="csvFileInput" accept=".csv" style="display:none;" onchange="Employees.parseCSV(this.files[0])">
            <button class="btn btn-outline" onclick="document.getElementById('csvFileInput').click()">Browse File</button>
          </div>
          <div id="csvPreview"></div>
        </div>
      </div>`;
    window.showModal('bulkImportModal', html);
  },

  downloadTemplate: function () {
    const csv = 'FirstName,LastName,Email,IDNumber,Department,Position,BasicSalary,Company,HireDate\nJohn,Doe,john@example.com,8001015009087,IT,Developer,35000,Acme Corp,2024-01-15';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'employee_import_template.csv';
    a.click();
  },

  parseCSV: function (file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.trim().split('\n').map(l => l.split(',').map(v => v.trim().replace(/^"|"$/g, '')));
      const headers = lines[0].map(h => h.toLowerCase().replace(/\s+/g, ''));
      const preview = lines.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] || ''; });
        return obj;
      });

      const container = document.getElementById('csvPreview');
      if (!container) return;
      if (!preview.length) { container.innerHTML = '<div class="alert alert-warning">No data rows found.</div>'; return; }

      container.innerHTML = `
        <div style="margin-bottom:8px;font-weight:600;">Preview (${preview.length} employees found):</div>
        <div style="max-height:200px;overflow-y:auto;margin-bottom:12px;">
          <table style="width:100%;font-size:0.8rem;">
            <thead><tr><th>Name</th><th>Email</th><th>Dept</th><th>Position</th><th>Salary</th></tr></thead>
            <tbody>${preview.map(p => `<tr><td>${p.firstname || ''} ${p.lastname || ''}</td><td>${p.email || ''}</td><td>${p.department || ''}</td><td>${p.position || ''}</td><td>R${p.basicsalary || 0}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="Employees.importCSVData(${JSON.stringify(preview).replace(/"/g, '&quot;')})">Import ${preview.length} Employees</button>
      `;
      window._csvImportData = preview;
    };
    reader.readAsText(file);
  },

  importCSVData: function (data) {
    const rows = window._csvImportData || data;
    if (!rows || !rows.length) return;
    let added = 0;
    rows.forEach(row => {
      const salary = parseFloat(row.basicsalary || row.salary || 0);
      const newEmp = {
        id: Math.max(0, ...window.DB.employees.map(e => e.id)) + 1 + added,
        firstName: row.firstname || row.name?.split(' ')[0] || '',
        lastName: row.lastname || row.name?.split(' ').slice(1).join(' ') || '',
        email: row.email || '',
        idNumber: row.idnumber || '',
        department: row.department || '',
        position: row.position || '',
        basicSalary: salary,
        companyName: row.company || '',
        hireDate: row.hiredate || new Date().toISOString().split('T')[0],
        status: 'Active',
        race: '', gender: '', phone: '',
        benefits: { pensionFund: 'Allan Gray', pensionPercent: 5 },
        leaveBalances: { annual: 15, sick: 30, family: 3 }
      };
      window.DB.employees.push(newEmp);
      added++;
    });
    window.DB.save();
    window.Toast.show(`${added} employees imported successfully`, 'success');
    closeModal('bulkImportModal');
    this.render(document.getElementById('content'));
  },
};

window.renderEmployees = function (container) {
  Employees.render(container);
};