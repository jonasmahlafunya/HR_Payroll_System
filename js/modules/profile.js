
const Profile = {
  render: function (container) {
    const user = window.currentUser;
    const employee = window.currentEmployee || (user.employeeId ? window.DB.employees.find(e => e.id === user.employeeId) : { firstName: user.name, position: user.role });

    if (!employee) {
      container.innerHTML = "<div>Employee profile not found.</div>";
      return;
    }

    const html = `
        <div class="card" style="border: none; background: transparent; box-shadow: none; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div class="avatar avatar-xl" style="background: white; border: 4px solid white; box-shadow: var(--shadow-md); font-size: 2rem; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; color: var(--primary);">
               ${(employee.firstName || 'U').charAt(0)}
            </div>
            <div style="flex: 1;">
              <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--gray-900); letter-spacing: -0.5px; margin-bottom: 2px;">${employee.firstName} ${employee.lastName || ''}</h2>
              <div style="color: var(--gray-500); font-size: 0.9rem;">${employee.position || 'User'} &bull; ${employee.department || 'General'}</div>
            </div>
            <div>
               <button class="btn btn-primary btn-sm" onclick="Profile.editProfile()">Edit Profile</button>
            </div>
          </div>
        </div>
  
        <div class="tabs" style="margin-bottom: 16px; border-bottom: 1px solid var(--gray-200);">
          <button class="tab-btn active" onclick="Profile.switchTab('personal')">Personal</button>
          <button class="tab-btn" onclick="Profile.switchTab('banking')">Banking & Tax</button>
          <button class="tab-btn" onclick="Profile.switchTab('payslips')">Payslips</button>
          <button class="tab-btn" onclick="Profile.switchTab('documents')">Documents</button>
        </div>
  
        <div id="profileContent">
          ${this.renderPersonalTab(employee)}
        </div>
      `;
    container.innerHTML = html;
  },

  switchTab: function (tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const container = document.getElementById('profileContent');
    // Resolve employee object again
    const user = window.currentUser;
    const employee = window.currentEmployee || (user.employeeId ? window.DB.employees.find(e => e.id === user.employeeId) : { firstName: user.name });

    switch (tabName) {
      case 'personal': container.innerHTML = this.renderPersonalTab(employee); break;
      case 'banking': container.innerHTML = this.renderBankingTab(employee); break;
      case 'payslips': container.innerHTML = this.renderPayslipsTab(employee); break;
      case 'documents': container.innerHTML = this.renderDocumentsTab(employee); break;
    }
  },

  renderPersonalTab: function (emp) {
    return `
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-header"><h4 class="card-title">Personal Details</h4></div>
          <div class="card-body grid-2">
            ${this.infoRow("Full Name", `${emp.firstName} ${emp.lastName}`)}
            ${this.infoRow("ID Number", emp.idNumber)}
            ${this.infoRow("Date of Birth", emp.dateOfBirth)}
            ${this.infoRow("Gender", emp.gender)}
            ${this.infoRow("Race", emp.race)}
            ${this.infoRow("Languages", emp.homeLanguage)}
          </div>
        </div>
  
        <div class="card">
          <div class="card-header"><h4 class="card-title">Contact</h4></div>
          <div class="card-body grid-2">
            ${this.infoRow("Email", emp.email)}
            ${this.infoRow("Mobile", emp.phone)}
            ${this.infoRow("Address", emp.address)}
          </div>
        </div>
      `;
  },

  renderBankingTab: function (emp) {
    return `
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h4 class="card-title">Banking</h4></div>
            <div class="card-body">
              ${this.infoRow("Bank Name", emp.bankName)}
              ${this.infoRow("Account Number", emp.accountNumber)}
              ${this.infoRow("Branch Code", emp.branchCode)}
              ${this.infoRow("Account Type", emp.accountType)}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h4 class="card-title">Tax Info</h4></div>
            <div class="card-body">
              ${this.infoRow("Tax Number", emp.taxNumber)}
              ${this.infoRow("Tax Threshold", emp.taxThreshold)}
              ${this.infoRow("UIF Number", emp.uifNumber)}
            </div>
          </div>
        </div>
      `;
  },

  renderPayslipsTab: function (emp) {
    // Fetch finalized payslips for this employee
    const slips = window.DB.payslips ? window.DB.payslips.filter(p => p.id === emp.id) : []; // p.id is empId in our data structure

    if (slips.length === 0) {
      return `<div class="card"><div class="card-body text-center text-muted">No finalized payslips found for this employee.</div></div>`;
    }

    return `
         <div class="card">
            <div class="card-header"><h4 class="card-title">Payslip History</h4></div>
            <div class="table-responsive">
               <table>
                  <thead>
                    <tr>
                       <th>Date</th>
                       <th>Period</th>
                       <th class="text-right">Gross Pay</th>
                       <th class="text-right">Net Pay</th>
                       <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${slips.map(s => {
      // Find run to get period
      const run = window.DB.payrollRuns.find(r => r.id === s.runId);
      const period = run ? run.period : 'Unknown';
      const date = run ? new Date(run.date).toLocaleDateString() : '-';
      return `
                           <tr>
                              <td>${date}</td>
                              <td>${period}</td>
                              <td class="text-right">${window.formatCurrency(s.gross)}</td>
                              <td class="text-right" style="font-weight: 700;">${window.formatCurrency(s.net)}</td>
                              <td><button class="btn btn-sm btn-outline" onclick="Payslips.renderPayslipModal('${s.runId}', ${s.id})">View</button></td>
                           </tr>
                        `;
    }).join('')}
                  </tbody>
               </table>
            </div>
         </div>
      `;
  },

  renderDocumentsTab: function (emp) {
    return `<div class="card"><div class="card-body text-center text-muted">Document list placeholder</div></div>`;
  },

  infoRow: function (label, value) {
    return `
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 0.75rem; color: var(--gray-500); margin-bottom: 2px;">${label}</label>
          <div style="font-weight: 500; font-size: 0.9rem; color: var(--gray-900);">${value || '-'}</div>
        </div>
      `;
  },

  // Expanded Edit Modal to include ALL fields
  editProfile: function (employeeId = null) {
    const user = window.currentUser;

    // Priority: 1) Passed employeeId, 2) window.currentEmployee, 3) user.employeeId
    let emp;
    if (employeeId) {
      emp = window.DB.employees.find(e => e.id === employeeId);
    } else {
      emp = window.currentEmployee || (user.employeeId ? window.DB.employees.find(e => e.id === user.employeeId) : null);
    }

    if (!emp) {
      window.Toast.show("No profile to edit", "error");
      return;
    }

    // Update window.currentEmployee to ensure consistency
    window.currentEmployee = emp;

    const html = `
        <div class="card" style="width: 100%; max-width: 800px; margin: auto; max-height: 90vh; overflow-y: auto;">
          <div class="card-header">
             <h3>Edit Profile: ${emp.firstName} ${emp.lastName}</h3>
             <button class="btn btn-outline btn-sm" onclick="closeModal('editProfileModal')"><i class="fas fa-times"></i></button>
          </div>
          <div class="card-body">
             <div class="tabs" style="margin-bottom: 16px; border-bottom: 1px solid var(--gray-200);">
                <button class="tab-btn active" onclick="Profile.showEditTab(event, 'personal')">Personal</button>
                <button class="tab-btn" onclick="Profile.showEditTab(event, 'banking')">Banking</button>
                <button class="tab-btn" onclick="Profile.showEditTab(event, 'work')">Work Info</button>
             </div>
  
             <div id="editTabContent">
                ${this.getEditPersonalHtml(emp)}
             </div>
  
             <button class="btn btn-primary" style="width: 100%; margin-top: 20px;" onclick="Profile.saveProfile(${emp.id})">Save All Changes</button>
          </div>
        </div>
      `;
    window.showModal('editProfileModal', html);
  },

  showEditTab: function (event, tab) {
    // UI Toggle
    const modal = document.getElementById('editProfileModal'); // Scope to modal if possible, but simplified here
    const buttons = document.querySelectorAll('#editProfileModal .tab-btn'); // Need to be specific
    if (buttons.length) buttons.forEach(b => b.classList.remove('active'));
    if (event.target) event.target.classList.add('active');

    const content = document.getElementById('editTabContent');
    const emp = window.currentEmployee; // Relies on closure/global context

    if (tab === 'personal') content.innerHTML = this.getEditPersonalHtml(emp);
    if (tab === 'banking') content.innerHTML = this.getEditBankingHtml(emp);
    if (tab === 'work') content.innerHTML = this.getEditWorkHtml(emp);
  },

  getEditPersonalHtml: function (emp) {
    return `
            <div class="grid-2">
                <div class="form-group"><label class="form-label">First Name</label><input type="text" id="edit_fn" class="form-control" value="${emp.firstName || ''}"></div>
                <div class="form-group"><label class="form-label">Last Name</label><input type="text" id="edit_ln" class="form-control" value="${emp.lastName || ''}"></div>
                <div class="form-group"><label class="form-label">ID Number</label><input type="text" id="edit_id" class="form-control" value="${emp.idNumber || ''}"></div>
                <div class="form-group"><label class="form-label">Date of Birth</label><input type="date" id="edit_dob" class="form-control" value="${emp.dateOfBirth || ''}"></div>
                <div class="form-group"><label class="form-label">Gender</label><select id="edit_gen" class="form-control"><option value="Male">Male</option><option value="Female">Female</option></select></div>
                <div class="form-group"><label class="form-label">Address</label><input type="text" id="edit_addr" class="form-control" value="${emp.address || ''}"></div>
                <div class="form-group"><label class="form-label">Email</label><input type="text" id="edit_email" class="form-control" value="${emp.email || ''}"></div>
                <div class="form-group"><label class="form-label">Phone</label><input type="text" id="edit_phone" class="form-control" value="${emp.phone || ''}"></div>
            </div>
        `;
  },

  getEditBankingHtml: function (emp) {
    return `
             <div class="grid-2">
                <div class="form-group"><label class="form-label">Bank Name</label><input type="text" id="edit_bank" class="form-control" value="${emp.bankName || ''}"></div>
                <div class="form-group"><label class="form-label">Branch Code</label><input type="text" id="edit_branch" class="form-control" value="${emp.branchCode || ''}"></div>
                <div class="form-group"><label class="form-label">Account No</label><input type="text" id="edit_acc" class="form-control" value="${emp.accountNumber || ''}"></div>
                <div class="form-group"><label class="form-label">Acc Type</label><select id="edit_type" class="form-control"><option value="Savings">Savings</option><option value="Current">Current</option></select></div>
                <div class="form-group"><label class="form-label">Tax Number</label><input type="text" id="edit_tax" class="form-control" value="${emp.taxNumber || ''}"></div>
             </div>
        `;
  },

  getEditWorkHtml: function (emp) {
    // Create Company Option List
    const companyOptions = window.DB.companies.map(c => `<option value="${c.name}" ${emp.companyName === c.name ? 'selected' : ''}>${c.name}</option>`).join('');

    return `
             <div class="grid-2">
                <div class="form-group"><label class="form-label">Company</label><select id="edit_comp" class="form-control">${companyOptions}</select></div>
                <div class="form-group"><label class="form-label">Department</label><input type="text" id="edit_dept" class="form-control" value="${emp.department || ''}"></div>
                <div class="form-group"><label class="form-label">Position</label><input type="text" id="edit_pos" class="form-control" value="${emp.position || ''}"></div>
                <div class="form-group"><label class="form-label">Start Date</label><input type="date" id="edit_date" class="form-control" value="${emp.hireDate || ''}"></div>
             </div>
        `;
  },

  saveProfile: function (id) {
    const emp = window.DB.employees.find(e => e.id === id);
    if (!emp) {
      window.Toast.show("Employee not found", "error");
      return;
    }

    // Helper to safely get value if element exists (tab might not be active)
    const getVal = (eid) => {
      const el = document.getElementById(eid);
      return el ? el.value : null;
    };

    // Personal Tab Fields
    const fn = getVal('edit_fn'); if (fn !== null) emp.firstName = fn;
    const ln = getVal('edit_ln'); if (ln !== null) emp.lastName = ln;
    const idn = getVal('edit_id'); if (idn !== null) emp.idNumber = idn;
    const dob = getVal('edit_dob'); if (dob !== null) emp.dateOfBirth = dob;
    const gen = getVal('edit_gen'); if (gen !== null) emp.gender = gen;
    const addr = getVal('edit_addr'); if (addr !== null) emp.address = addr;
    const email = getVal('edit_email'); if (email !== null) emp.email = email;
    const phone = getVal('edit_phone'); if (phone !== null) emp.phone = phone;

    // Banking Tab Fields
    const bank = getVal('edit_bank'); if (bank !== null) emp.bankName = bank;
    const branch = getVal('edit_branch'); if (branch !== null) emp.branchCode = branch;
    const acc = getVal('edit_acc'); if (acc !== null) emp.accountNumber = acc;
    const accType = getVal('edit_type'); if (accType !== null) emp.accountType = accType;
    const tax = getVal('edit_tax'); if (tax !== null) emp.taxNumber = tax;

    // Work Tab Fields
    const comp = getVal('edit_comp'); if (comp !== null) emp.companyName = comp;
    const dept = getVal('edit_dept'); if (dept !== null) emp.department = dept;
    const pos = getVal('edit_pos'); if (pos !== null) emp.position = pos;
    const hireDate = getVal('edit_date'); if (hireDate !== null) emp.hireDate = hireDate;

    // Save to database
    window.DB.save();
    window.Toast.show("Profile saved successfully", "success");
    window.closeModal('editProfileModal');

    // Re-render profile to show updated data
    this.render(document.getElementById('content'));
  }
};

window.renderProfile = function (container) {
  Profile.render(container);
};