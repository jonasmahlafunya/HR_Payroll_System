const Employees = {
  state: {
    view: 'list', // 'list' or 'grid'
    filter: 'all'
  },

  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Employees</h2>
          <div style="color: var(--gray-500);">Manage your workforce directory</div>
        </div>
        <div style="display: flex; gap: 12px;">
           <button class="btn btn-outline" onclick="Employees.toggleView()"><i class="fas fa-${this.state.view === 'list' ? 'th-large' : 'list'}"></i></button>
           <button class="btn btn-primary" onclick="Employees.showAddModal()">
             <i class="fas fa-plus"></i> Add Employee
           </button>
        </div>
      </div>

      <div class="card" style="margin-bottom: 24px;">
        <div class="card-body" style="padding: 16px;">
          <div style="display: flex; gap: 16px; align-items: center;">
             <div class="search-box" style="flex: 1;">
               <input type="text" class="search-input" placeholder="Search by name, ID, or position..." onkeyup="Employees.search(this.value)">
             </div>
             <select class="form-control" style="width: 200px;" onchange="Employees.filterDepartment(this.value)">
               <option value="all">All Departments</option>
               <option value="IT">IT</option>
               <option value="Finance">Finance</option>
               <option value="HR">HR</option>
               <option value="Operations">Operations</option>
             </select>
             <select class="form-control" style="width: 200px;">
               <option value="active">Active Only</option>
               <option value="inactive">Inactive</option>
             </select>
          </div>
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
                <th>ID Number</th>
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
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div class="avatar" style="background: var(--primary-light); color: white; display: flex; justify-content: center; align-items: center;">
                        ${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}
                      </div>
                      <div>
                        <div style="font-weight: 500;">${emp.firstName} ${emp.lastName}</div>
                        <small style="color: var(--gray-500);">${emp.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>${emp.idNumber || '-'}</td>
                  <td>${emp.department}</td>
                  <td>${emp.position}</td>
                  <td><span class="badge badge-success">${emp.status}</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-outline"><i class="fas fa-pen"></i></button>
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
      <div class="grid-3">
        ${window.DB.employees.map(emp => `
          <div class="card">
             <div class="card-body" style="text-align: center;">
                <div class="avatar avatar-lg" style="background: var(--primary-light); color: white; display: flex; justify-content: center; align-items: center; font-size: 2rem; margin: 0 auto 16px;">
                  ${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}
                </div>
                <h4 style="margin-bottom: 4px;">${emp.firstName} ${emp.lastName}</h4>
                <div style="color: var(--gray-500); margin-bottom: 16px;">${emp.position}</div>
                
                <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 24px;">
                  <span class="badge badge-info">${emp.department}</span>
                  <span class="badge badge-success">${emp.status}</span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: left; background: var(--gray-50); padding: 12px; border-radius: 8px; font-size: 0.9rem; margin-bottom: 20px;">
                  <div>
                    <div style="color: var(--gray-500);">ID Number</div>
                    <div style="font-weight: 500;">${emp.idNumber || '-'}</div>
                  </div>
                  <div>
                    <div style="color: var(--gray-500);">Date Hired</div>
                    <div style="font-weight: 500;">${emp.hireDate || '-'}</div>
                  </div>
                </div>

                <button class="btn btn-primary btn-outline" style="width: 100%;">View Profile</button>
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
    // Implement primitive search for now
    // In a real refined version, we should filter state and re-render
    // For now, let's keep it simple or implement full filtering
    console.log("Searching for:", query);
  },

  filterDepartment: function (dept) {
    console.log("Filtering by dept:", dept);
  },

  showAddModal: function () {
    const html = `
      <div class="card" style="width: 100%; max-width: 800px; margin: auto; max-height: 90vh; overflow-y: auto;">
         <div class="card-header">
            <h3>Add New Employee</h3>
            <button class="btn btn-outline btn-sm" onclick="closeModal('addEmployeeModal')"><i class="fas fa-times"></i></button>
         </div>
         <div class="card-body">
            <h5 style="margin-bottom: 16px; color: var(--primary);">Personal Details</h5>
            <div class="grid-2">
               <div class="form-group"><label class="form-label">First Name</label><input type="text" id="new_firstName" class="form-control"></div>
               <div class="form-group"><label class="form-label">Last Name</label><input type="text" id="new_lastName" class="form-control"></div>
               <div class="form-group"><label class="form-label">Email</label><input type="email" id="new_email" class="form-control"></div>
               <div class="form-group"><label class="form-label">ID Number</label><input type="text" id="new_idNumber" class="form-control"></div>
            </div>

            <h5 style="margin-bottom: 16px; margin-top: 24px; color: var(--primary);">Employment</h5>
            <div class="grid-2">
               <div class="form-group"><label class="form-label">Position</label><input type="text" id="new_position" class="form-control"></div>
               <div class="form-group"><label class="form-label">Department</label><select id="new_department" class="form-control"><option value="IT">IT</option><option value="Finance">Finance</option><option value="HR">HR</option><option value="Operations">Operations</option></select></div>
               <div class="form-group"><label class="form-label">Basic Salary (R)</label><input type="number" id="new_salary" class="form-control"></div>
               <div class="form-group"><label class="form-label">Start Date</label><input type="date" id="new_startDate" class="form-control"></div>
            </div>

            <button class="btn btn-primary" style="width: 100%; margin-top: 24px;" onclick="Employees.createEmployee()">Create Employee Profile</button>
         </div>
      </div>
    `;
    showModal('addEmployeeModal', html);
  },

  createEmployee: function () {
    const firstName = document.getElementById('new_firstName').value;
    const lastName = document.getElementById('new_lastName').value;
    const email = document.getElementById('new_email').value;
    const position = document.getElementById('new_position').value;
    const department = document.getElementById('new_department').value;

    if (!firstName || !lastName || !email) {
      Toast.show("Please fill in all required fields", "warning");
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
      idNumber: document.getElementById('new_idNumber').value,
      basicSalary: document.getElementById('new_salary').value,
      hireDate: document.getElementById('new_startDate').value,
      status: 'Active',
      initials: firstName.charAt(0) + lastName.charAt(0)
    };

    window.DB.employees.push(newEmp);
    window.DB.save(); // Persist to localStorage

    Toast.show('Employee created successfully!', 'success');
    closeModal('addEmployeeModal');

    // Re-render
    this.render(document.getElementById('content'));
  }
};

window.renderEmployees = function (container) {
  Employees.render(container);
};