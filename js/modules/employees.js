
const Employees = {
  state: {
    view: 'list', // 'list' or 'grid'
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
               <select class="form-control" style="width: 180px; font-size: 0.8rem;">
                 <option value="active">Active Only</option>
                 <option value="inactive">Inactive</option>
               </select>
            </div>
        </div>
  
        <div id="employeesContainer">
          ${this.state.view === 'list' ? this.renderList() : this.renderGrid()}
        </div>
      `;
    container.innerHTML = html;
  },

  renderList: function () {
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
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${window.DB.employees.map(emp => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="avatar" style="width: 32px; height: 32px; font-size: 0.8rem; background: var(--primary-light); color: white; display: flex; justify-content: center; align-items: center;">
                          ${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}
                        </div>
                        <div>
                          <div style="font-weight: 500; font-size: 0.85rem;">${emp.firstName} ${emp.lastName}</div>
                          <small style="color: var(--gray-500); font-size: 0.75rem;">${emp.email}</small>
                        </div>
                      </div>
                    </td>
                    <td style="font-size: 0.85rem;">${emp.companyName || 'Acme Corp'}</td>
                    <td style="font-size: 0.85rem;">${emp.department}</td>
                    <td style="font-size: 0.85rem;">${emp.position}</td>
                    <td><span class="badge badge-success" style="font-size: 0.7rem;">${emp.status}</span></td>
                    <td>
                  <div class="action-buttons">
                    <button class="btn-icon" onclick="Employees.viewEmployee(${emp.id})"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon" onclick="Employees.editEmployee(${emp.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon text-danger" onclick="Employees.deleteEmployee(${emp.id})"><i class="fas fa-trash"></i></button>
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
    return `
        <div class="grid-3" style="gap: 12px;">
          ${window.DB.employees.map(emp => `
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
    // Switch to Profile Module and Context
    window.currentUser.employeeId = id; // Mock context switch

    // Update global currentEmployee if needed by Profile module logic
    // The Profile module looks at currentUser.employeeId or window.currentEmployee
    // Let's set window.currentEmployee to be safe
    window.currentEmployee = window.DB.employees.find(e => e.id === id);

    // Reset sidebar active state
    document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-profile').classList.add('active');

    // Render Profile
    const container = document.getElementById('content');
    if (window.renderProfile) window.renderProfile(container);
  },

  deleteEmployee: function (id) {
    window.showConfirmation("Delete Employee?", "Are you sure you want to remove this employee?", () => {
      window.DB.employees = window.DB.employees.filter(e => e.id !== id);
      window.DB.save();
      window.Toast.show("Employee deleted", "success");
      this.render(document.getElementById('content'));
    });
  }
};

window.renderEmployees = function (container) {
  Employees.render(container);
};