const Profile = {
  render: function (container) {
    const user     = window.currentUser || { name: 'User' };
    const empId    = window.currentEmployeeId || user.employeeId;
    const employee = empId ? window.DB.employees.find(e => e.id == empId) : { firstName: user.name };
    window.currentEmployee = employee;
    delete window.currentEmployeeId;

    if (!employee) {
      container.innerHTML = '<div class="alert alert-warning">Employee profile not found.</div>';
      return;
    }

    const isAdmin = window.currentUser?.role === 'Super Admin' || window.currentUser?.role === 'HR Manager';
    const isTerminated = employee.status === 'Terminated';

    const html = `
      <div class="card" style="border:none;background:transparent;box-shadow:none;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:20px;">

          <!-- Avatar -->
          <div style="width:64px;height:64px;border-radius:50%;background:white;border:4px solid white;
                      box-shadow:var(--shadow-md);font-size:2rem;display:flex;align-items:center;
                      justify-content:center;color:var(--primary);flex-shrink:0;overflow:hidden;">
            ${employee.photo
              ? `<img src="${employee.photo}" style="width:100%;height:100%;object-fit:cover;">`
              : (employee.firstName || 'U').charAt(0)}
          </div>

          <!-- Name & role -->
          <div style="flex:1;min-width:0;">
            <h2 style="font-size:1.45rem;font-weight:800;color:var(--gray-900);letter-spacing:-0.4px;margin-bottom:2px;">
              ${employee.firstName} ${employee.lastName || ''}
            </h2>
            <div style="color:var(--gray-500);font-size:0.88rem;">
              ${employee.position || 'User'} &bull; ${employee.department || 'General'}
              ${isTerminated ? `&nbsp;<span class="badge badge-danger" style="font-size:0.7rem;">Terminated</span>` : ''}
            </div>
          </div>

          <!-- Action buttons -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            <button class="btn btn-outline btn-sm" onclick="Profile.editProfile()">
              <i class="fas fa-edit"></i> Edit Profile
            </button>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('profilePhotoInput').click()">
              <i class="fas fa-camera"></i> Photo
            </button>
            <input type="file" id="profilePhotoInput" style="display:none" accept="image/*"
              onchange="Profile.handlePhotoUpload(this)">

            <!-- Terminate button — admin/HR only, active employees only -->
            ${isAdmin && !isTerminated ? `
              <button class="btn btn-sm" style="background:var(--danger);color:white;border-radius:var(--radius-full);"
                onclick="Profile.terminateEmployee(${employee.id})">
                <i class="fas fa-user-minus"></i> Terminate
              </button>` : ''}
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:24px;">
        <button class="tab-btn active" onclick="Profile.switchTab('personal', event)">
          <i class="fas fa-user"></i> Details
        </button>
        <button class="tab-btn" onclick="Profile.switchTab('banking', event)">
          <i class="fas fa-university"></i> Banking & Tax
        </button>
        <button class="tab-btn" onclick="Profile.switchTab('payslips', event)">
          <i class="fas fa-file-invoice"></i> Payslips
        </button>
        <button class="tab-btn" onclick="Profile.switchTab('documents', event)">
          <i class="fas fa-folder"></i> Documents
        </button>
      </div>

      <div id="profileContent">
        ${this.renderPersonalTab(employee)}
      </div>
    `;
    container.innerHTML = html;
  },

  // ─── Terminate from Profile ───────────────────────────────────────────────
  terminateEmployee: function (empId) {
    const emp = window.DB.employees.find(e => e.id === empId);
    if (!emp) return;

    // Delegate to the Employees module's termination wizard
    if (typeof Employees !== 'undefined' && Employees.showTerminationWizard) {
      Employees.showTerminationWizard(empId);
    } else {
      // Fallback inline termination
      window.showConfirmation(
        `Terminate ${emp.firstName} ${emp.lastName}?`,
        `This will mark the employee as <strong>Terminated</strong>. Do you want to continue?`,
        () => {
          emp.status = 'Terminated';
          emp.terminationDate = new Date().toISOString().split('T')[0];
          window.DB.save();
          window.Toast.show(`${emp.firstName} ${emp.lastName} terminated`, 'success');
          this.render(document.getElementById('content'));
        }
      );
    }
  },

  switchTab: function (tab, e) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (e?.target) e.target.classList.add('active');
    const container = document.getElementById('profileContent');
    const emp = window.currentEmployee;
    switch (tab) {
      case 'personal':  container.innerHTML = this.renderPersonalTab(emp);  break;
      case 'banking':   container.innerHTML = this.renderBankingTab(emp);   break;
      case 'payslips':  container.innerHTML = this.renderPayslipsTab(emp);  break;
      case 'documents': container.innerHTML = this.renderDocumentsTab(emp); break;
    }
  },

  renderPersonalTab: function (emp) {
    return `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header"><h4 class="card-title">Personal Details</h4></div>
        <div class="card-body grid-2">
          ${this.infoRow("Full Name",  `${emp.firstName} ${emp.lastName}`)}
          ${this.infoRow("ID Number",  emp.idNumber)}
          ${this.infoRow("Date of Birth", emp.dateOfBirth)}
          ${this.infoRow("Gender",     emp.gender)}
          ${this.infoRow("Race",       emp.race)}
          ${this.infoRow("Languages",  emp.homeLanguage)}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h4 class="card-title">Contact</h4></div>
        <div class="card-body grid-2">
          ${this.infoRow("Email",   emp.email)}
          ${this.infoRow("Mobile",  emp.phone)}
          ${this.infoRow("Address", emp.address)}
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="card-header">
          <h4 class="card-title"><i class="fas fa-shield-alt text-primary"></i> Data Privacy & POPIA</h4>
        </div>
        <div class="card-body" style="font-size:0.85rem;color:var(--gray-600);">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--gray-200);padding-bottom:8px;margin-bottom:8px;">
            <div><strong>Consent:</strong> Granted for employment & payroll processing</div>
            <span class="badge badge-success">Active</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;">
            <div><strong>Retention:</strong> 5 years post-termination (LRA/BCEA)</div>
            <button class="btn btn-outline btn-sm text-danger" onclick="window.showAlert('Action Restricted','Data cannot be erased while within statutory retention periods.')">
              <i class="fas fa-eraser"></i> Request Deletion
            </button>
          </div>
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
            ${this.infoRow("Bank Name",       emp.bankName)}
            ${this.infoRow("Account Number",  emp.accountNumber)}
            ${this.infoRow("Branch Code",     emp.branchCode)}
            ${this.infoRow("Account Type",    emp.accountType)}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h4 class="card-title">Tax Info</h4></div>
          <div class="card-body">
            ${this.infoRow("Tax Number",   emp.taxNumber)}
            ${this.infoRow("Tax Threshold", emp.taxThreshold)}
            ${this.infoRow("UIF Number",   emp.uifNumber)}
          </div>
        </div>
      </div>`;
  },

  renderPayslipsTab: function (emp) {
    const slips = (window.DB.payslips || []).filter(p => p.employeeId === emp.id);
    if (!slips.length) {
      return `<div class="card"><div class="card-body text-center text-muted" style="padding:32px;">No finalized payslips found for this employee.</div></div>`;
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
                const run  = (window.DB.payrollRuns || []).find(r => r.id === s.runId);
                const period = s.period || (run ? run.period : 'Unknown');
                const date   = run ? new Date(run.finalizedDate || run.date || run.createdDate).toLocaleDateString('en-ZA') : '—';
                return `
                  <tr>
                    <td>${date}</td>
                    <td>${period}</td>
                    <td class="text-right">${window.formatCurrency(s.gross)}</td>
                    <td class="text-right" style="font-weight:700;">${window.formatCurrency(s.net)}</td>
                    <td>
                      <button class="btn btn-sm btn-outline"
                        onclick="Payslips.renderPayslipModal('${s.runId}', ${s.employeeId})">View</button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  renderDocumentsTab: function (emp) {
    return `<div class="card"><div class="card-body text-center text-muted" style="padding:32px;">Document list for this employee.</div></div>`;
  },

  infoRow: function (label, value) {
    return `
      <div style="margin-bottom:12px;">
        <label style="display:block;font-size:0.75rem;color:var(--gray-500);margin-bottom:2px;">${label}</label>
        <div style="font-weight:500;font-size:0.9rem;color:var(--gray-900);">${value || '—'}</div>
      </div>`;
  },

  // ─── Edit Modal ───────────────────────────────────────────────────────────
  editProfile: function (employeeId = null) {
    const user = window.currentUser;
    let emp;
    if (employeeId) {
      emp = window.DB.employees.find(e => e.id === employeeId);
    } else {
      emp = window.currentEmployee
        || (user?.employeeId ? window.DB.employees.find(e => e.id === user.employeeId) : null);
    }

    if (!emp && user) {
      emp = {
        isUserOnly: true,
        id: 'user_' + user.id,
        firstName: user.name.split(' ')[0] || '',
        lastName:  user.name.split(' ').slice(1).join(' ') || '',
        email:     user.email,
        position:  user.role || 'Admin',
        department: 'System Admin'
      };
    } else if (!emp) {
      window.Toast.show("No profile to edit", "warning"); return;
    }

    window.currentEmployee = emp;

    const html = `
      <div class="card" style="width:100%;max-width:800px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h3>Edit Profile: ${emp.firstName} ${emp.lastName || ''}</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('editProfileModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="card-body">
          <div class="tabs" style="margin-bottom:16px;border-bottom:1px solid var(--gray-200);">
            <button class="tab-btn active" onclick="Profile.showEditTab(event,'personal')">Personal</button>
            <button class="tab-btn" onclick="Profile.showEditTab(event,'banking')">Banking</button>
            <button class="tab-btn" onclick="Profile.showEditTab(event,'work')">Work Info</button>
          </div>

          <div id="editTabContent">
            ${this.getEditPersonalHtml(emp)}
          </div>

          <!-- Save button with sync indicator -->
          <div style="margin-top:20px;">
            <button class="btn btn-primary" style="width:100%;" id="profileSaveBtn"
              onclick="Profile.saveProfile('${emp.id}')">
              <i class="fas fa-save"></i> Save &amp; Sync to Database
            </button>
            <div id="profileSaveStatus" style="text-align:center;font-size:0.78rem;color:var(--gray-500);margin-top:8px;display:none;">
              <i class="fas fa-spinner fa-spin"></i> Saving to database…
            </div>
          </div>
        </div>
      </div>`;
    window.showModal('editProfileModal', html);
  },

  showEditTab: function (event, tab) {
    document.querySelectorAll('#editProfileModal .tab-btn').forEach(b => b.classList.remove('active'));
    if (event?.target) event.target.classList.add('active');
    const content = document.getElementById('editTabContent');
    const emp = window.currentEmployee;
    if (tab === 'personal') content.innerHTML = this.getEditPersonalHtml(emp);
    if (tab === 'banking')  content.innerHTML = this.getEditBankingHtml(emp);
    if (tab === 'work')     content.innerHTML = this.getEditWorkHtml(emp);
  },

  getEditPersonalHtml: function (emp) {
    return `
      <div class="grid-2">
        <div class="form-group"><label class="form-label">First Name</label>
          <input type="text" id="edit_fn" class="form-control" value="${emp.firstName || ''}"></div>
        <div class="form-group"><label class="form-label">Last Name</label>
          <input type="text" id="edit_ln" class="form-control" value="${emp.lastName || ''}"></div>
        <div class="form-group"><label class="form-label">ID Number</label>
          <input type="text" id="edit_id" class="form-control" value="${emp.idNumber || ''}"></div>
        <div class="form-group"><label class="form-label">Date of Birth</label>
          <input type="date" id="edit_dob" class="form-control" value="${emp.dateOfBirth || ''}"></div>
        <div class="form-group"><label class="form-label">Gender</label>
          <select id="edit_gen" class="form-control">
            <option value="Male"   ${emp.gender === 'Male'   ? 'selected' : ''}>Male</option>
            <option value="Female" ${emp.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Other"  ${emp.gender === 'Other'  ? 'selected' : ''}>Other</option>
          </select></div>
        <div class="form-group"><label class="form-label">Phone</label>
          <input type="text" id="edit_phone" class="form-control" value="${emp.phone || ''}"></div>
        <div class="form-group" style="grid-column:span 2"><label class="form-label">Email</label>
          <input type="email" id="edit_email" class="form-control" value="${emp.email || ''}"></div>
        <div class="form-group" style="grid-column:span 2"><label class="form-label">Address</label>
          <input type="text" id="edit_addr" class="form-control" value="${emp.address || ''}"></div>
      </div>`;
  },

  getEditBankingHtml: function (emp) {
    return `
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Bank Name</label>
          <input type="text" id="edit_bank" class="form-control" value="${emp.bankName || ''}"></div>
        <div class="form-group"><label class="form-label">Branch Code</label>
          <input type="text" id="edit_branch" class="form-control" value="${emp.branchCode || ''}"></div>
        <div class="form-group"><label class="form-label">Account No</label>
          <input type="text" id="edit_acc" class="form-control" value="${emp.accountNumber || ''}"></div>
        <div class="form-group"><label class="form-label">Account Type</label>
          <select id="edit_type" class="form-control">
            <option value="Savings"      ${emp.accountType === 'Savings'      ? 'selected' : ''}>Savings</option>
            <option value="Current"      ${emp.accountType === 'Current'      ? 'selected' : ''}>Current</option>
            <option value="Transmission" ${emp.accountType === 'Transmission' ? 'selected' : ''}>Transmission</option>
          </select></div>
        <div class="form-group" style="grid-column:span 2"><label class="form-label">Tax Number</label>
          <input type="text" id="edit_tax" class="form-control" value="${emp.taxNumber || ''}"></div>
      </div>`;
  },

  getEditWorkHtml: function (emp) {
    const companyOptions = window.DB.companies.map(c =>
      `<option value="${c.name}" ${emp.companyName === c.name ? 'selected' : ''}>${c.name}</option>`
    ).join('');
    return `
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Company</label>
          <select id="edit_comp" class="form-control">${companyOptions}</select></div>
        <div class="form-group"><label class="form-label">Department</label>
          <input type="text" id="edit_dept" class="form-control" value="${emp.department || ''}"></div>
        <div class="form-group"><label class="form-label">Position</label>
          <input type="text" id="edit_pos" class="form-control" value="${emp.position || ''}"></div>
        <div class="form-group"><label class="form-label">Start Date</label>
          <input type="date" id="edit_date" class="form-control" value="${emp.hireDate || ''}"></div>
      </div>`;
  },

  // ─── Save Profile — explicit DB sync with indicator ───────────────────────
  saveProfile: function (id) {
    // Show saving indicator
    const btn = document.getElementById('profileSaveBtn');
    const status = document.getElementById('profileSaveStatus');
    if (btn)    { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }
    if (status) status.style.display = 'block';

    let emp = window.currentEmployee;
    if (typeof id === 'number' || (typeof id === 'string' && !id.startsWith('user_'))) {
      const dbEmp = window.DB.employees.find(e => e.id == id);
      if (dbEmp) emp = dbEmp;
    }

    if (!emp) {
      window.Toast.show("Employee not found", "warning");
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save & Sync to Database'; }
      if (status) status.style.display = 'none';
      return;
    }

    const getVal = (eid) => { const el = document.getElementById(eid); return el ? el.value : null; };

    // Personal
    const fn = getVal('edit_fn');    if (fn    !== null) emp.firstName   = fn;
    const ln = getVal('edit_ln');    if (ln    !== null) emp.lastName    = ln;
    const idn = getVal('edit_id');   if (idn   !== null) emp.idNumber    = idn;
    const dob = getVal('edit_dob');  if (dob   !== null) emp.dateOfBirth = dob;
    const gen = getVal('edit_gen');  if (gen   !== null) emp.gender      = gen;
    const addr = getVal('edit_addr');if (addr  !== null) emp.address     = addr;
    const email = getVal('edit_email'); if (email !== null) emp.email    = email;
    const phone = getVal('edit_phone'); if (phone !== null) emp.phone    = phone;

    // Banking
    const bank   = getVal('edit_bank');   if (bank   !== null) emp.bankName      = bank;
    const branch = getVal('edit_branch'); if (branch !== null) emp.branchCode    = branch;
    const acc    = getVal('edit_acc');    if (acc    !== null) emp.accountNumber  = acc;
    const accType= getVal('edit_type');   if (accType!== null) emp.accountType   = accType;
    const tax    = getVal('edit_tax');    if (tax    !== null) emp.taxNumber      = tax;

    // Work
    const comp     = getVal('edit_comp'); if (comp    !== null) emp.companyName  = comp;
    const dept     = getVal('edit_dept'); if (dept    !== null) emp.department   = dept;
    const pos      = getVal('edit_pos');  if (pos     !== null) emp.position     = pos;
    const hireDate = getVal('edit_date'); if (hireDate!== null) emp.hireDate     = hireDate;

    // Sync user record if admin user editing self
    if (emp.isUserOnly && window.currentUser) {
      window.currentUser.name  = `${emp.firstName} ${emp.lastName}`.trim();
      window.currentUser.email = emp.email;
      const dbUser = window.DB.users.find(u => u.id === window.currentUser.id);
      if (dbUser) { dbUser.name = window.currentUser.name; dbUser.email = window.currentUser.email; }
    }

    // Update display name in topbar if editing own profile
    if (window.currentUser && (emp.id === window.currentUser.employeeId || emp.isUserOnly)) {
      const nameEl = document.getElementById('current-user');
      if (nameEl) nameEl.textContent = emp.firstName + ' ' + (emp.lastName || '');
    }

    window.currentEmployee = emp;

    // Save to localStorage immediately, then sync to server
    try {
      localStorage.setItem(window.StorageManager.KEY, JSON.stringify(window.DB));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    // Trigger full DB save (localStorage + server sync)
    window.DB.save();

    // Show success after short delay (gives server sync a moment)
    setTimeout(() => {
      if (btn)    { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save & Sync to Database'; }
      if (status) status.style.display = 'none';
      window.Toast.show("Profile saved & syncing to database…", "success");
      window.closeModal('editProfileModal');
      this.render(document.getElementById('content'));
    }, 600);
  },

  handlePhotoUpload: function (input) {
    if (input.files && input.files[0]) {
      const reader  = new FileReader();
      const empId   = window.currentEmployee?.id;
      reader.onload = function (e) {
        const photo = e.target.result;
        const emp   = window.DB.employees.find(e => e.id === empId);
        if (emp) {
          emp.photo = photo;
          window.DB.save();
          Profile.render(document.getElementById('content'));
          window.Toast.show("Photo updated", "success");
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  }
};

window.renderProfile = function (container) {
  Profile.render(container);
};