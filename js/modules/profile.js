// ─── Profile Module ───────────────────────────────────────────────────────────
// Handles BOTH "My Profile" (logged-in user editing their own account)
// AND "Employee Profile" (HR viewing/editing a specific employee).
//
// ROUTING RULES:
//   window.currentEmployeeId is set  → show that employee's profile
//   window.currentEmployeeId is null/undefined → show the logged-in user's profile
//
// This prevents the bug where clicking an employee from the list would land
// on the logged-in user's profile instead of the selected employee.

const Profile = {

  _empId: null,   // the employee being viewed this render

  render: function (container) {
    // ── Determine which employee to show ────────────────────────────────────
    const currentUser = window.currentUser;

    // If a specific employee was requested (set by Employees module / company detail)
    let emp = null;
    if (window.currentEmployeeId) {
      emp = (window.DB.employees || []).find(e => e.id === window.currentEmployeeId);
    }

    // Fall back: try to match logged-in user to an employee record
    if (!emp && currentUser) {
      emp = (window.DB.employees || []).find(e =>
        (e.email && e.email.toLowerCase() === (currentUser.email || '').toLowerCase()) ||
        (e.firstName + ' ' + e.lastName).toLowerCase() === (currentUser.name || '').toLowerCase()
      );
    }

    // If still nothing, use the logged-in user object directly (non-employee admin)
    const isOwnProfile = !window.currentEmployeeId;
    this._empId = emp ? emp.id : null;

    if (!emp && !currentUser) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-title">No profile available</div></div>`;
      return;
    }

    // ── Render ───────────────────────────────────────────────────────────────
    const displayName = emp
      ? `${emp.firstName} ${emp.lastName}`
      : (currentUser?.name || 'Administrator');
    const position  = emp?.position || currentUser?.role || 'System User';
    const company   = emp?.companyName || '';
    const dept      = emp?.department  || '';
    const startDate = emp?.startDate   || '';
    const status    = emp?.status      || 'Active';
    const photo     = emp?.photo       || null;
    const initials  = displayName.split(' ').map(p=>p.charAt(0)).join('').slice(0,2).toUpperCase();

    // Payslip history
    const payslips  = (window.DB.payslips || []).filter(p => emp ? p.employeeId === emp.id : false);
    const lastPayslip = payslips[payslips.length - 1];

    // Leave requests
    const leaves    = (window.DB.leaveRequests || []).filter(l => emp ? l.employeeId == emp.id : false);

    // Leave balance (simple: 20 annual days, minus approved taken)
    const takenDays = leaves
      .filter(l => l.status === 'Approved' && l.leaveType === 'Annual')
      .reduce((s, l) => s + (l.days || parseInt((new Date(l.endDate)-new Date(l.startDate))/(86400000))+1 || 1), 0);
    const leaveBalance = Math.max(0, 20 - takenDays);

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <div>
          <h2 style="font-size:1.25rem;margin:0;">
            ${isOwnProfile ? 'My Profile' : 'Employee Profile'}
          </h2>
          ${!isOwnProfile ? `
            <button class="btn btn-outline btn-xs" style="margin-top:4px;"
              onclick="window.currentEmployeeId=null;loadPage('employees');">
              <i class="fas fa-arrow-left"></i> Back to Employees
            </button>` : ''}
        </div>
        <button class="btn btn-primary btn-sm" onclick="Profile.editProfile()">
          <i class="fas fa-edit"></i> Edit Profile
        </button>
      </div>

      <div style="display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start;">

        <!-- Left card — identity -->
        <div>
          <div class="card" style="text-align:center;padding:24px 16px;">
            <div style="position:relative;display:inline-block;margin-bottom:12px;">
              <div id="profilePhoto"
                style="width:90px;height:90px;border-radius:50%;margin:0 auto;
                       background:var(--primary-soft);color:var(--primary);font-weight:700;
                       font-size:1.6rem;display:flex;align-items:center;justify-content:center;
                       overflow:hidden;border:3px solid var(--primary-soft);">
                ${photo
                  ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;">`
                  : initials}
              </div>
              ${emp ? `
                <label for="profilePhotoInput"
                  style="position:absolute;bottom:0;right:0;width:26px;height:26px;border-radius:50%;
                         background:var(--primary);color:white;display:flex;align-items:center;
                         justify-content:center;cursor:pointer;font-size:0.7rem;">
                  <i class="fas fa-camera"></i>
                </label>
                <input type="file" id="profilePhotoInput" style="display:none;" accept="image/*"
                       onchange="Profile.uploadPhoto(this)">` : ''}
            </div>
            <h3 style="font-size:1rem;margin:0 0 4px;">${displayName}</h3>
            <div style="color:var(--gray-500);font-size:0.82rem;">${position}</div>
            ${company ? `<div style="font-size:0.75rem;color:var(--primary);margin-top:4px;">${company}</div>` : ''}
            ${dept ? `<div style="font-size:0.75rem;color:var(--gray-400);">${dept}</div>` : ''}
            <div style="margin-top:12px;">
              <span class="badge badge-${status==='Active'?'success':status==='Terminated'?'danger':'warning'}">
                ${status}
              </span>
            </div>

            ${emp ? `
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--gray-100);">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;">
                  <div>
                    <div style="font-size:0.68rem;color:var(--gray-400);text-transform:uppercase;">Start Date</div>
                    <div style="font-size:0.8rem;font-weight:600;">${startDate||'—'}</div>
                  </div>
                  <div>
                    <div style="font-size:0.68rem;color:var(--gray-400);text-transform:uppercase;">Leave Balance</div>
                    <div style="font-size:0.8rem;font-weight:600;color:var(--success);">${leaveBalance} days</div>
                  </div>
                  <div>
                    <div style="font-size:0.68rem;color:var(--gray-400);text-transform:uppercase;">Emp No.</div>
                    <div style="font-size:0.8rem;font-weight:600;">${emp.employeeNumber||emp.id||'—'}</div>
                  </div>
                  <div>
                    <div style="font-size:0.68rem;color:var(--gray-400);text-transform:uppercase;">Type</div>
                    <div style="font-size:0.8rem;font-weight:600;">${emp.employmentType||'—'}</div>
                  </div>
                </div>
              </div>` : ''}
          </div>

          ${lastPayslip && emp ? `
            <div class="card" style="padding:14px;">
              <div style="font-size:0.72rem;text-transform:uppercase;color:var(--gray-400);margin-bottom:8px;letter-spacing:0.5px;">
                Last Payslip
              </div>
              <div style="font-size:0.85rem;font-weight:700;color:var(--primary);margin-bottom:4px;">
                ${window.formatCurrency(lastPayslip.net || 0)}
              </div>
              <div style="font-size:0.72rem;color:var(--gray-500);">${lastPayslip.period||'—'}</div>
              <button class="btn btn-outline btn-xs" style="margin-top:10px;width:100%;"
                onclick="loadPage('payslips')">
                <i class="fas fa-file-pdf"></i> View Payslips
              </button>
            </div>` : ''}
        </div>

        <!-- Right: tabs -->
        <div class="card">
          <div class="tabs" style="padding:0 20px;border-bottom:1px solid var(--gray-200);">
            <button class="tab-btn active" id="profTab_details" onclick="Profile._switchTab('details')">
              <i class="fas fa-user"></i> Details
            </button>
            ${emp ? `
              <button class="tab-btn" id="profTab_banking" onclick="Profile._switchTab('banking')">
                <i class="fas fa-university"></i> Banking
              </button>
              <button class="tab-btn" id="profTab_leave" onclick="Profile._switchTab('leave')">
                <i class="fas fa-calendar-alt"></i> Leave History
              </button>
              <button class="tab-btn" id="profTab_payslips" onclick="Profile._switchTab('payslips')">
                <i class="fas fa-file-invoice-dollar"></i> Payslips
              </button>` : ''}
          </div>
          <div id="profileTabContent" style="padding:20px;"></div>
        </div>
      </div>`;

    this._switchTab('details');
  },

  _switchTab: function (tab) {
    ['details','banking','leave','payslips'].forEach(t => {
      const btn = document.getElementById(`profTab_${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });
    const content = document.getElementById('profileTabContent');
    if (!content) return;

    const emp = this._empId ? (window.DB.employees||[]).find(e => e.id === this._empId) : null;
    const cu  = window.currentUser;

    if (tab === 'details') {
      const email = emp?.email || cu?.email || '';
      const phone = emp?.phone || emp?.cellphone || '';
      const id    = emp?.idNumber || '';
      const dob   = emp?.dateOfBirth || '';
      const gender= emp?.gender || '';
      const nat   = emp?.nationality || '';
      const addr  = emp?.address || emp?.residentialAddress || '';
      const pos   = emp?.position || cu?.role || '';
      const dept  = emp?.department || '';

      content.innerHTML = `
        <div class="grid-2" style="gap:16px;">
          ${[
            ['Email',       email,  'fas fa-envelope'],
            ['Phone',       phone,  'fas fa-phone'],
            ['ID Number',   id,     'fas fa-id-card'],
            ['Date of Birth', dob,  'fas fa-birthday-cake'],
            ['Gender',      gender, 'fas fa-venus-mars'],
            ['Nationality', nat,    'fas fa-flag'],
            ['Position',    pos,    'fas fa-briefcase'],
            ['Department',  dept,   'fas fa-sitemap'],
            ['Address',     addr,   'fas fa-map-marker-alt'],
          ].map(([label, val, icon]) => `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;
                        border-bottom:1px solid var(--gray-100);">
              <div style="width:28px;height:28px;border-radius:6px;background:var(--primary-soft);
                          color:var(--primary);display:flex;align-items:center;justify-content:center;
                          font-size:0.72rem;flex-shrink:0;">
                <i class="${icon}"></i>
              </div>
              <div>
                <div style="font-size:0.68rem;color:var(--gray-400);text-transform:uppercase;">${label}</div>
                <div style="font-size:0.85rem;font-weight:500;">${val || '—'}</div>
              </div>
            </div>`).join('')}
        </div>`;

    } else if (tab === 'banking' && emp) {
      content.innerHTML = `
        <div class="grid-2" style="gap:16px;">
          ${[
            ['Bank Name',     emp.bankName      || '—'],
            ['Account Number',emp.accountNumber || '—'],
            ['Branch Code',   emp.branchCode    || '—'],
            ['Account Type',  emp.accountType   || '—'],
          ].map(([label, val]) => `
            <div style="padding:12px;background:var(--gray-50);border-radius:8px;border:1px solid var(--gray-200);">
              <div style="font-size:0.7rem;color:var(--gray-400);text-transform:uppercase;margin-bottom:4px;">${label}</div>
              <div style="font-size:0.95rem;font-weight:600;">${val}</div>
            </div>`).join('')}
        </div>`;

    } else if (tab === 'leave' && emp) {
      const leaves = (window.DB.leaveRequests||[]).filter(l => l.employeeId == emp.id);
      content.innerHTML = leaves.length ? `
        <div class="table-responsive">
          <table>
            <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Reason</th></tr></thead>
            <tbody>
              ${leaves.map(l => `
                <tr>
                  <td>${l.leaveType||'Leave'}</td>
                  <td>${l.startDate||'—'}</td>
                  <td>${l.endDate||'—'}</td>
                  <td>${l.days||'—'}</td>
                  <td><span class="badge badge-${l.status==='Approved'?'success':l.status==='Rejected'?'danger':'warning'}">${l.status}</span></td>
                  <td style="font-size:0.78rem;max-width:160px;">${l.reason||'—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `
        <div style="text-align:center;padding:40px;color:var(--gray-400);">
          <i class="fas fa-calendar" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
          No leave history
        </div>`;

    } else if (tab === 'payslips' && emp) {
      const payslips = (window.DB.payslips||[]).filter(p => p.employeeId == emp.id);
      content.innerHTML = payslips.length ? `
        <div class="table-responsive">
          <table>
            <thead><tr><th>Period</th><th class="text-right">Gross</th><th class="text-right">Deductions</th><th class="text-right">Net Pay</th><th></th></tr></thead>
            <tbody>
              ${payslips.map(p => `
                <tr>
                  <td style="font-weight:600;">${p.period||'—'}</td>
                  <td class="text-right">${window.formatCurrency(p.gross||p.basic||0)}</td>
                  <td class="text-right" style="color:var(--danger);">
                    ${window.formatCurrency((p.paye||0)+(p.uif||0)+(p.medical||0)+(p.pension||0))}
                  </td>
                  <td class="text-right" style="font-weight:700;color:var(--success);">${window.formatCurrency(p.net||0)}</td>
                  <td><button class="btn btn-xs btn-outline" onclick="loadPage('payslips')">
                    <i class="fas fa-eye"></i>
                  </button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `
        <div style="text-align:center;padding:40px;color:var(--gray-400);">
          <i class="fas fa-file-invoice-dollar" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
          No payslips generated yet
        </div>`;
    }
  },

  editProfile: function () {
    const emp = this._empId ? (window.DB.employees||[]).find(e => e.id === this._empId) : null;
    const cu  = window.currentUser;
    const companies   = window.DB.companies || [];
    const departments = window.DB.departments || [];

    if (!emp && !cu) return;

    const html = `
      <div class="card" style="width:100%;max-width:700px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title">${emp ? `Edit: ${emp.firstName} ${emp.lastName}` : 'Edit My Profile'}</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('editProfileModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="tabs" style="margin-bottom:16px;">
            <button class="tab-btn active" id="epTab_personal" onclick="Profile._switchEditTab('personal')">Personal</button>
            ${emp ? `
              <button class="tab-btn" id="epTab_employment" onclick="Profile._switchEditTab('employment')">Employment</button>
              <button class="tab-btn" id="epTab_banking" onclick="Profile._switchEditTab('banking')">Banking</button>` : ''}
            <button class="tab-btn" id="epTab_account" onclick="Profile._switchEditTab('account')">Account / Password</button>
          </div>
          <div id="editProfileContent"></div>
          <button class="btn btn-primary" style="width:100%;margin-top:20px;" onclick="Profile.saveProfile()">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>`;
    window.showModal('editProfileModal', html);
    this._switchEditTab('personal');
  },

  _switchEditTab: function (tab) {
    ['personal','employment','banking','account'].forEach(t => {
      const btn = document.getElementById(`epTab_${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });
    const emp         = this._empId ? (window.DB.employees||[]).find(e => e.id === this._empId) : null;
    const cu          = window.currentUser;
    const companies   = window.DB.companies || [];
    const departments = window.DB.departments || [];
    const content     = document.getElementById('editProfileContent');
    if (!content) return;

    if (tab === 'personal') {
      const fn  = emp?.firstName  || cu?.name?.split(' ')[0] || '';
      const ln  = emp?.lastName   || cu?.name?.split(' ').slice(1).join(' ') || '';
      content.innerHTML = `
        <div class="grid-2">
          <div class="form-group"><label class="form-label">First Name</label>
            <input id="ep_firstName" class="form-control" value="${fn}"></div>
          <div class="form-group"><label class="form-label">Last Name</label>
            <input id="ep_lastName" class="form-control" value="${ln}"></div>
          <div class="form-group"><label class="form-label">Email</label>
            <input id="ep_email" type="email" class="form-control" value="${emp?.email||cu?.email||''}"></div>
          <div class="form-group"><label class="form-label">Phone</label>
            <input id="ep_phone" class="form-control" value="${emp?.phone||emp?.cellphone||''}"></div>
          <div class="form-group"><label class="form-label">ID Number</label>
            <input id="ep_idNumber" class="form-control" value="${emp?.idNumber||''}"></div>
          <div class="form-group"><label class="form-label">Date of Birth</label>
            <input id="ep_dob" type="date" class="form-control" value="${emp?.dateOfBirth||''}"></div>
          <div class="form-group"><label class="form-label">Gender</label>
            <select id="ep_gender" class="form-control">
              <option value="">— Select —</option>
              ${['Male','Female','Other'].map(g=>`<option ${(emp?.gender||'')==g?'selected':''}>${g}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Nationality</label>
            <input id="ep_nationality" class="form-control" value="${emp?.nationality||'South African'}"></div>
          <div class="form-group" style="grid-column:span 2;"><label class="form-label">Residential Address</label>
            <input id="ep_address" class="form-control" value="${emp?.address||emp?.residentialAddress||''}"></div>
        </div>`;

    } else if (tab === 'employment' && emp) {
      content.innerHTML = `
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Company</label>
            <select id="ep_company" class="form-control">
              ${companies.map(c=>`<option value="${c.name}" data-id="${c.id}" ${emp.companyName===c.name?'selected':''}>${c.name}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Department</label>
            <input id="ep_dept" class="form-control" value="${emp.department||''}"
              list="deptList_ep">
            <datalist id="deptList_ep">
              ${departments.map(d=>`<option value="${d.name||d}"></option>`).join('')}
            </datalist></div>
          <div class="form-group"><label class="form-label">Position</label>
            <input id="ep_position" class="form-control" value="${emp.position||''}"></div>
          <div class="form-group"><label class="form-label">Employee Number</label>
            <input id="ep_empNo" class="form-control" value="${emp.employeeNumber||''}"></div>
          <div class="form-group"><label class="form-label">Start Date</label>
            <input id="ep_startDate" type="date" class="form-control" value="${emp.startDate||''}"></div>
          <div class="form-group"><label class="form-label">Employment Type</label>
            <select id="ep_empType" class="form-control">
              ${['Permanent','Fixed Term','Part-Time','Casual','Contractor'].map(t=>
                `<option ${emp.employmentType===t?'selected':''}>${t}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Basic Salary (R)</label>
            <input id="ep_salary" type="number" class="form-control" value="${emp.basicSalary||0}"></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select id="ep_status" class="form-control">
              ${['Active','On Leave','Suspended','Terminated'].map(s=>
                `<option ${emp.status===s?'selected':''}>${s}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Tax Number</label>
            <input id="ep_taxNo" class="form-control" value="${emp.taxNumber||''}"></div>
          <div class="form-group"><label class="form-label">UIF Number</label>
            <input id="ep_uif" class="form-control" value="${emp.uifNumber||''}"></div>
        </div>`;

    } else if (tab === 'banking' && emp) {
      content.innerHTML = `
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Bank Name</label>
            <input id="ep_bank" class="form-control" value="${emp.bankName||''}" list="bankList_ep">
            <datalist id="bankList_ep">
              ${['Standard Bank','FNB','ABSA','Nedbank','Capitec','African Bank','TymeBank','Discovery Bank']
                .map(b=>`<option value="${b}"></option>`).join('')}
            </datalist></div>
          <div class="form-group"><label class="form-label">Account Number</label>
            <input id="ep_accNo" class="form-control" value="${emp.accountNumber||''}"></div>
          <div class="form-group"><label class="form-label">Branch Code</label>
            <input id="ep_branchCode" class="form-control" value="${emp.branchCode||''}"></div>
          <div class="form-group"><label class="form-label">Account Type</label>
            <select id="ep_accType" class="form-control">
              ${['Cheque/Current','Savings','Transmission'].map(t=>
                `<option ${emp.accountType===t?'selected':''}>${t}</option>`).join('')}
            </select></div>
        </div>`;

    } else if (tab === 'account') {
      content.innerHTML = `
        <div class="alert alert-info" style="margin-bottom:16px;font-size:0.82rem;">
          <i class="fas fa-info-circle"></i> 
          Changes here update your system login credentials.
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Display Name</label>
            <input id="ep_displayName" class="form-control" value="${cu?.name||''}"></div>
          <div class="form-group"><label class="form-label">Login Email</label>
            <input id="ep_loginEmail" type="email" class="form-control" value="${cu?.email||''}"></div>
          <div class="form-group"><label class="form-label">New Password</label>
            <input id="ep_newPass" type="password" class="form-control" placeholder="Leave blank to keep current"></div>
          <div class="form-group"><label class="form-label">Confirm Password</label>
            <input id="ep_confirmPass" type="password" class="form-control"></div>
        </div>`;
    }
  },

  saveProfile: function () {
    const emp = this._empId ? (window.DB.employees||[]).find(e => e.id === this._empId) : null;
    const cu  = window.currentUser;
    const g   = id => document.getElementById(id)?.value?.trim() || '';

    let savedAnything = false;

    // ── Personal fields ──────────────────────────────────────────────────────
    if (emp) {
      const firstName = g('ep_firstName');
      const lastName  = g('ep_lastName');
      if (firstName) { emp.firstName = firstName; savedAnything = true; }
      if (lastName)  { emp.lastName  = lastName;  savedAnything = true; }

      const fields = {
        email: 'ep_email', phone: 'ep_phone', cellphone: 'ep_phone',
        idNumber: 'ep_idNumber', dateOfBirth: 'ep_dob',
        gender: 'ep_gender', nationality: 'ep_nationality',
        address: 'ep_address', residentialAddress: 'ep_address',
        // Employment
        department: 'ep_dept', position: 'ep_position',
        employeeNumber: 'ep_empNo', startDate: 'ep_startDate',
        employmentType: 'ep_empType', taxNumber: 'ep_taxNo',
        uifNumber: 'ep_uif',
        // Banking
        bankName: 'ep_bank', accountNumber: 'ep_accNo',
        branchCode: 'ep_branchCode', accountType: 'ep_accType',
        // Status
        status: 'ep_status'
      };
      Object.entries(fields).forEach(([prop, inputId]) => {
        const val = g(inputId);
        if (val) { emp[prop] = val; savedAnything = true; }
      });

      // Company (select with data-id)
      const compSel = document.getElementById('ep_company');
      if (compSel?.value) {
        emp.companyName = compSel.value;
        emp.companyId   = compSel.options[compSel.selectedIndex]?.dataset?.id || emp.companyId;
        savedAnything = true;
      }

      // Salary
      const salEl = document.getElementById('ep_salary');
      if (salEl?.value) {
        const s = parseFloat(salEl.value);
        if (!isNaN(s) && s >= 0) { emp.basicSalary = s; savedAnything = true; }
      }
    }

    // ── Account / password fields ────────────────────────────────────────────
    const newPass    = g('ep_newPass');
    const confirmPas = g('ep_confirmPass');
    const displayName= g('ep_displayName');
    const loginEmail = g('ep_loginEmail');

    if (newPass || confirmPas) {
      if (newPass !== confirmPas) {
        window.showAlert('Password Mismatch', 'New password and confirm password do not match.'); return;
      }
      if (newPass.length < 4) {
        window.showAlert('Password Too Short', 'Password must be at least 4 characters.'); return;
      }
    }

    if (cu) {
      if (displayName) { cu.name  = displayName; savedAnything = true; }
      if (loginEmail)  { cu.email = loginEmail;  savedAnything = true; }

      // Update in users table
      const userRec = (window.DB.users||[]).find(u =>
        u.username === cu.username || u.id === cu.id
      );
      if (userRec) {
        if (displayName) userRec.name  = displayName;
        if (loginEmail)  userRec.email = loginEmail;
        if (newPass)     userRec.password = newPass;
        savedAnything = true;
      }

      // Persist updated currentUser to localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('hrpms_user') || '{}');
        if (displayName) stored.name  = displayName;
        if (loginEmail)  stored.email = loginEmail;
        localStorage.setItem('hrpms_user', JSON.stringify(stored));
      } catch(_) {}
    }

    if (!savedAnything) {
      window.Toast.show('No changes to save.', 'info'); return;
    }

    window.DB.save();
    window.Toast.show('Profile saved successfully!', 'success');
    window.closeModal('editProfileModal');

    // Re-render without clearing currentEmployeeId
    this.render(document.getElementById('content'));

    // Update navbar display name if it changed
    if (displayName) {
      const nameEl = document.getElementById('currentUserName') || document.querySelector('.user-name');
      if (nameEl) nameEl.textContent = displayName;
    }
  },

  uploadPhoto: function (input) {
    if (!input.files || !input.files[0]) return;
    const emp = this._empId ? (window.DB.employees||[]).find(e => e.id === this._empId) : null;
    if (!emp) return;
    const reader = new FileReader();
    reader.onload = e => {
      emp.photo = e.target.result;
      window.DB.save();
      const photoEl = document.getElementById('profilePhoto');
      if (photoEl) photoEl.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
      window.Toast.show('Photo updated', 'success');
    };
    reader.readAsDataURL(input.files[0]);
  }
};

window.renderProfile = function (container) {
  // CRITICAL: only clear currentEmployeeId when the user explicitly navigates
  // to "My Profile" via the sidebar. Don't clear it here — it was set by
  // whoever called loadPage('profile').
  Profile.render(container);
};

window.Profile = Profile;