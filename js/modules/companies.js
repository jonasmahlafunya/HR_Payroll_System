const Companies = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <h2 style="font-size:1.25rem;">Companies</h2>
          <div style="color:var(--gray-500);font-size:0.85rem;">Manage company entities and their employees</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Companies.showAddWizard()">
          <i class="fas fa-plus"></i> Add Company
        </button>
      </div>
      <div class="grid-3" style="gap:16px;">
        ${window.DB.companies.map(company => this.renderCompanyCard(company)).join('')}
      </div>`;
    container.innerHTML = html;
  },

  // ─── Company Card ──────────────────────────────────────────────────────────
  renderCompanyCard: function (company) {
    const empCount = window.DB.employees.filter(
      e => e.companyName === company.name || e.companyId == company.id
    ).length;

    return `
      <div class="card" style="padding:12px;">
        <div class="card-header" style="padding:0 0 8px 0;border-bottom:1px solid var(--gray-100);margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;background:var(--gray-100);border-radius:6px;
                        display:flex;align-items:center;justify-content:center;font-size:1rem;color:var(--primary);flex-shrink:0;">
              ${company.logo
        ? `<img src="${company.logo}" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`
        : `<i class="fas fa-building"></i>`}
            </div>
            <div style="overflow:hidden;">
              <h4 class="card-title" style="margin-bottom:0;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${company.name}
              </h4>
              <div style="font-size:0.7rem;color:var(--gray-500);">${company.registrationNumber || 'N/A'}</div>
            </div>
          </div>
          <span class="badge badge-success" style="font-size:0.6rem;padding:2px 6px;">${company.status}</span>
        </div>

        <div class="card-body" style="padding:0;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;font-size:0.75rem;">
            <div>
              <div style="color:var(--gray-500);">Employees</div>
              <div style="font-weight:600;color:var(--primary);">${empCount}</div>
            </div>
            <div>
              <div style="color:var(--gray-500);">Tax Ref</div>
              <div style="font-weight:600;">${company.taxReference || '—'}</div>
            </div>
          </div>

          <div style="background:var(--gray-50);padding:8px;border-radius:4px;font-size:0.7rem;">
            <div style="margin-bottom:2px;"><i class="fas fa-envelope text-muted"></i> ${company.email || 'No Email'}</div>
            <div><i class="fas fa-phone text-muted"></i> ${company.contact || '—'}</div>
          </div>

          <div style="display:flex;gap:6px;margin-top:10px;">
            <button class="btn btn-primary btn-sm" style="flex:1.4;font-size:0.7rem;padding:5px;"
              onclick="Companies.viewCompanyDetail(${company.id}, 'employees')">
              <i class="fas fa-users"></i> Employees
            </button>
            <button class="btn btn-outline btn-sm" style="flex:1;font-size:0.7rem;padding:5px;"
              onclick="Companies.editCompany(${company.id})">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-outline btn-sm"
              style="flex:1;font-size:0.7rem;padding:5px;color:var(--danger);border-color:var(--danger);"
              onclick="Companies.deleteCompany(${company.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>`;
  },

  // ─── Company Detail Modal ──────────────────────────────────────────────────
  viewCompanyDetail: function (companyId, initialTab = 'overview') {
    const company = window.DB.companies.find(c => c.id === companyId);
    if (!company) return;

    const empCount = window.DB.employees.filter(
      e => e.companyName === company.name || e.companyId == company.id
    ).length;

    const html = `
      <div class="card" style="width:100%;max-width:980px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header" style="background:var(--gray-50);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:var(--primary-soft);border-radius:8px;
                        display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:1.1rem;">
              <i class="fas fa-building"></i>
            </div>
            <div>
              <h3 style="margin:0;font-size:1rem;">${company.name}</h3>
              <div style="font-size:0.75rem;color:var(--gray-500);">
                Reg: ${company.registrationNumber || '—'} &bull; Tax Ref: ${company.taxReference || '—'}
              </div>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="closeModal('companyDetailModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Tab Bar -->
        <div class="tabs" style="padding:0 20px;margin-bottom:0;border-bottom:1px solid var(--gray-200);">
          <button class="tab-btn active" id="cdTab_overview"
            onclick="Companies.switchDetailTab('overview', ${companyId})">
            <i class="fas fa-info-circle"></i> Overview
          </button>
          <button class="tab-btn" id="cdTab_employees"
            onclick="Companies.switchDetailTab('employees', ${companyId})">
            <i class="fas fa-users"></i> Employees
            <span class="badge badge-primary" style="margin-left:4px;font-size:0.65rem;padding:2px 6px;">
              ${empCount}
            </span>
          </button>
          <button class="tab-btn" id="cdTab_payroll"
            onclick="Companies.switchDetailTab('payroll', ${companyId})">
            <i class="fas fa-money-bill-wave"></i> Payroll Runs
          </button>
        </div>

        <!-- Tab Content -->
        <div id="companyDetailContent" style="padding:20px;">
          <!-- Content loads here -->
        </div>
      </div>`;
    window.showModal('companyDetailModal', html);

    // Switch to initial tab
    this.switchDetailTab(initialTab, companyId);
  },

  switchDetailTab: function (tab, companyId) {
    ['overview', 'employees', 'payroll'].forEach(t => {
      const btn = document.getElementById(`cdTab_${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });
    const content = document.getElementById('companyDetailContent');
    const company = window.DB.companies.find(c => c.id === companyId);
    if (!company || !content) return;
    if (tab === 'overview') content.innerHTML = this.renderDetailOverview(company);
    else if (tab === 'employees') content.innerHTML = this.renderDetailEmployees(company);
    else if (tab === 'payroll') content.innerHTML = this.renderDetailPayroll(company);
  },

  // ─── Detail: Overview ─────────────────────────────────────────────────────
  renderDetailOverview: function (company) {
    const emps = window.DB.employees.filter(e => e.companyName === company.name || e.companyId == company.id);
    const activeEmps = emps.filter(e => e.status === 'Active');
    const totalPayroll = activeEmps.reduce((s, e) => s + (e.basicSalary || 0), 0);
    const runs = (window.DB.payrollRuns || []).filter(r => r.companyId == company.id);

    return `
      <div class="grid-4" style="margin-bottom:20px;">
        <div class="kpi-card" style="border-left:4px solid var(--primary)">
          <div class="kpi-label">Active Employees</div><div class="kpi-value">${activeEmps.length}</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid var(--success)">
          <div class="kpi-label">Monthly Payroll</div>
          <div class="kpi-value" style="font-size:1.1rem">${window.formatCurrency(totalPayroll)}</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid var(--warning)">
          <div class="kpi-label">Payroll Runs</div><div class="kpi-value">${runs.length}</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid var(--info)">
          <div class="kpi-label">BEE Level</div>
          <div class="kpi-value" style="font-size:1.1rem">${company.beeLevel || '—'}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h4 class="card-title">Company Information</h4></div>
          <div class="card-body" style="font-size:0.85rem;">
            ${[
        ['Registration No.', company.registrationNumber],
        ['Tax Reference', company.taxReference],
        ['UIF Number', company.uifNumber],
        ['SDL Number', company.sdlNumber],
        ['SARS Branch Code', company.sarsBranchCode],
        ['Address', company.address],
        ['Contact', company.contact],
        ['Email', company.email],
        ['Country', company.country || 'ZA'],
      ].map(([lbl, val]) => `
              <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gray-100);">
                <span style="color:var(--gray-500)">${lbl}</span>
                <span style="font-weight:500;text-align:right">${val || '—'}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h4 class="card-title">Banking Details</h4></div>
          <div class="card-body" style="font-size:0.85rem;">
            ${[
        ['Bank Name', company.banking?.bankName],
        ['Account Number', company.banking?.accountNumber],
        ['Branch Code', company.banking?.branchCode],
        ['Account Type', company.banking?.accountType],
      ].map(([lbl, val]) => `
              <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gray-100);">
                <span style="color:var(--gray-500)">${lbl}</span>
                <span style="font-weight:500">${val || '—'}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  },

  // ─── Detail: Employees Tab — with Terminate button ─────────────────────────
  renderDetailEmployees: function (company) {
    const emps = window.DB.employees.filter(
      e => e.companyName === company.name || e.companyId == company.id
    );

    const deptCounts = {};
    emps.forEach(e => {
      const d = e.department || 'Unassigned';
      deptCounts[d] = (deptCounts[d] || 0) + 1;
    });

    const isAdmin = window.currentUser?.role === 'Super Admin' || window.currentUser?.role === 'HR Manager';

    return `
      <!-- Summary strip -->
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <div class="badge badge-primary" style="padding:5px 12px;font-size:0.78rem;">
          <i class="fas fa-users"></i> Total: ${emps.length}
        </div>
        <div class="badge badge-success" style="padding:5px 12px;font-size:0.78rem;">
          Active: ${emps.filter(e => e.status === 'Active').length}
        </div>
        <div class="badge badge-danger" style="padding:5px 12px;font-size:0.78rem;">
          Terminated: ${emps.filter(e => e.status === 'Terminated').length}
        </div>
        ${Object.entries(deptCounts).map(([dept, count]) =>
      `<div class="badge badge-gray" style="padding:5px 12px;font-size:0.78rem;">${dept}: ${count}</div>`
    ).join('')}
      </div>

      <!-- Search bar -->
      <div class="search-box" style="margin-bottom:14px;">
        <input type="text" class="search-input" style="width:280px;"
          placeholder="Search employees..."
          onkeyup="Companies.filterDetailEmployees(this.value)">
      </div>

      ${emps.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-users"></i></div>
          <div class="empty-state-title">No Employees Found</div>
          <div class="empty-state-desc">No employees are linked to ${company.name} yet.</div>
          <button class="btn btn-primary btn-sm" style="margin-top:12px"
            onclick="closeModal('companyDetailModal'); loadPage('employees'); setTimeout(()=>Employees.showAddWizard(),400);">
            <i class="fas fa-plus"></i> Add Employee
          </button>
        </div>
      ` : `
        <div class="table-responsive">
          <table id="companyEmpTable">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Emp No.</th>
                <th>Department</th>
                <th>Position</th>
                <th class="text-right">Basic Salary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${emps.map(emp => {
      const isTerminated = emp.status === 'Terminated';
      return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:9px;">
                        ${emp.photo
          ? `<img src="${emp.photo}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">`
          : `<div style="width:30px;height:30px;border-radius:50%;background:var(--primary-soft);
                                 color:var(--primary);display:flex;align-items:center;justify-content:center;
                                 font-weight:700;font-size:0.72rem;flex-shrink:0;">
                               ${(emp.firstName || '?').charAt(0)}${(emp.lastName || '').charAt(0)}
                             </div>`}
                        <div>
                          <div style="font-weight:600;font-size:0.85rem;">${emp.firstName} ${emp.lastName}</div>
                          <div style="font-size:0.73rem;color:var(--gray-500);">${emp.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style="font-size:0.82rem;font-family:monospace;">${emp.employeeNumber || '—'}</td>
                    <td style="font-size:0.82rem;">${emp.department || '—'}</td>
                    <td style="font-size:0.82rem;">${emp.position || '—'}</td>
                    <td class="text-right" style="font-size:0.82rem;font-weight:600;">
                      ${window.formatCurrency(emp.basicSalary || 0)}
                    </td>
                    <td>
                      <span class="badge badge-${isTerminated ? 'danger' : emp.status === 'Active' ? 'success' : 'warning'}">
                        ${emp.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex;gap:4px;align-items:center;">

                        <!-- View Profile -->
                        <button class="btn-icon" title="View Profile"
                          onclick="closeModal('companyDetailModal'); window.currentEmployeeId=${emp.id}; loadPage('profile');">
                          <i class="fas fa-eye"></i>
                        </button>

                        <!-- Edit -->
                        <button class="btn-icon" title="Edit Employee"
                          onclick="closeModal('companyDetailModal'); Employees.editEmployee(${emp.id});">
                          <i class="fas fa-edit"></i>
                        </button>

                        <!-- ── Terminate — admin/HR only, active employees only ── -->
                        ${isAdmin && !isTerminated ? `
                          <button class="btn-icon" title="Terminate Employee"
                            style="color:var(--danger);border-color:rgba(220,38,38,0.3);"
                            onclick="Companies.terminateEmployee(${emp.id}, ${company.id})">
                            <i class="fas fa-user-minus"></i>
                          </button>` : ''}

                      </div>
                    </td>
                  </tr>`;
    }).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top:14px;">
          <button class="btn btn-primary btn-sm"
            onclick="closeModal('companyDetailModal'); loadPage('employees'); setTimeout(()=>Employees.showAddWizard(),400);">
            <i class="fas fa-plus"></i> Add New Employee to ${company.name}
          </button>
        </div>
      `}`;
  },

  // ─── Terminate employee from Companies view ────────────────────────────────
  terminateEmployee: function (empId, companyId) {
    const emp = window.DB.employees.find(e => e.id === empId);
    if (!emp) return;

    window.showConfirmation(
      `Terminate ${emp.firstName} ${emp.lastName}?`,
      `<div style="font-size:0.88rem;">
        Are you sure you want to terminate <strong>${emp.firstName} ${emp.lastName}</strong>?<br><br>
        This will mark the employee as <span class="badge badge-danger">Terminated</span> and record today as the termination date.
        You can run a final payroll separately.
       </div>`,
      () => {
        emp.status = 'Terminated';
        emp.terminationDate = new Date().toISOString().split('T')[0];
        emp.terminationReason = 'Terminated via Company Employees tab';

        // Audit log
        window.DB.auditLogs = window.DB.auditLogs || [];
        window.DB.auditLogs.unshift({
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          user: window.currentUser?.name || 'Admin',
          action: 'Employee Terminated',
          module: 'Companies',
          details: { employeeId: empId, name: `${emp.firstName} ${emp.lastName}`, companyId }
        });

        window.DB.save();
        window.Toast.show(`${emp.firstName} ${emp.lastName} has been terminated`, 'success');

        // Refresh the employees tab inside the still-open modal
        const content = document.getElementById('companyDetailContent');
        const company = window.DB.companies.find(c => c.id === companyId);
        if (content && company) {
          content.innerHTML = this.renderDetailEmployees(company);
          // Keep the Employees tab active
          ['overview', 'employees', 'payroll'].forEach(t => {
            const btn = document.getElementById(`cdTab_${t}`);
            if (btn) btn.classList.toggle('active', t === 'employees');
          });
        }
      }
    );
  },

  filterDetailEmployees: function (query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#companyEmpTable tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  // ─── Detail: Payroll Tab ──────────────────────────────────────────────────
  renderDetailPayroll: function (company) {
    const runs = (window.DB.payrollRuns || []).filter(r => r.companyId == company.id);
    return `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Period</th><th>Type</th><th>Employees</th>
              <th class="text-right">Total Gross</th>
              <th class="text-right">Total PAYE</th>
              <th class="text-right">Total Net</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${runs.length ? runs.map(r => `
              <tr>
                <td style="font-weight:600">${r.period}</td>
                <td><span class="badge badge-gray">${r.type || 'Regular'}</span></td>
                <td>${r.employeeCount || r.count || 0}</td>
                <td class="text-right">${window.formatCurrency(r.totalGross || 0)}</td>
                <td class="text-right text-danger">${window.formatCurrency(r.totalPAYE || 0)}</td>
                <td class="text-right" style="font-weight:700;color:var(--success)">
                  ${window.formatCurrency(r.totalNet || r.net || 0)}
                </td>
                <td>
                  <span class="badge badge-${r.status === 'Finalized' ? 'success' : r.status === 'Draft' ? 'warning' : 'info'}">
                    ${r.status}
                  </span>
                </td>
              </tr>`).join('') : `
              <tr><td colspan="7">
                <div class="empty-state" style="padding:32px;">
                  <div class="empty-state-icon"><i class="fas fa-money-bill-wave"></i></div>
                  <div class="empty-state-title">No Payroll Runs</div>
                  <div class="empty-state-desc">No payroll has been processed for ${company.name} yet.</div>
                </div>
              </td></tr>`}
          </tbody>
        </table>
      </div>`;
  },

  // ─── Add Company Wizard ───────────────────────────────────────────────────
  showAddWizard: function () {
    const html = `
      <div class="card" style="width:100%;max-width:800px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title">Add New Company</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addCompanyWizard')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div id="companyWizardContainer" class="card-body"></div>
      </div>`;
    window.showModal('addCompanyWizard', html);

    window.currentWizard = new Wizard({
      containerId: 'companyWizardContainer',
      steps: [
        {
          title: 'General Info',
          template: `
            <div class="form-group">
              <label class="form-label">Company Name *</label>
              <input type="text" id="comp_name" class="form-control" placeholder="Acme Corp" required>
            </div>
            <div class="form-group">
              <label class="form-label">Registration Number *</label>
              <input type="text" id="comp_reg" class="form-control" placeholder="YYYY/NNNNNN/NN" required>
            </div>`,
          validate: () => {
            const name = document.getElementById('comp_name').value;
            const reg = document.getElementById('comp_reg').value;
            if (!name || !reg) { window.showAlert('Incomplete Details', 'Please fill in all required fields (*).'); return false; }
            if (!new RegExp("^\\d{4}/\\d{6}/\\d{2}$").test(reg)) { window.showAlert('Invalid Format', 'Registration Number must match YYYY/NNNNNN/NN.'); return false; }
            return true;
          }
        },
        {
          title: 'Statutory Details',
          template: `
            <div class="grid-2">
              <div class="form-group"><label class="form-label">Tax Reference *</label><input type="text" id="comp_tax" class="form-control" required></div>
              <div class="form-group"><label class="form-label">VAT Number</label><input type="text" id="comp_vat" class="form-control"></div>
              <div class="form-group"><label class="form-label">UIF Number</label><input type="text" id="comp_uif" class="form-control"></div>
              <div class="form-group"><label class="form-label">SDL Number</label><input type="text" id="comp_sdl" class="form-control"></div>
            </div>`,
          validate: () => {
            if (!document.getElementById('comp_tax').value) { window.showAlert('Missing Tax Reference', 'Tax Reference is required.'); return false; }
            return true;
          }
        },
        {
          title: 'Contact Info',
          template: `
            <div class="grid-2">
              <div class="form-group"><label class="form-label">Contact Person *</label><input type="text" id="comp_contact_person" class="form-control" required></div>
              <div class="form-group"><label class="form-label">Email Address *</label><input type="email" id="comp_email" class="form-control" required></div>
              <div class="form-group"><label class="form-label">Phone *</label><input type="text" id="comp_phone" class="form-control" required></div>
              <div class="form-group"><label class="form-label">Address</label><input type="text" id="comp_address" class="form-control"></div>
            </div>`,
          validate: () => {
            if (!document.getElementById('comp_contact_person').value ||
              !document.getElementById('comp_email').value ||
              !document.getElementById('comp_phone').value) {
              window.showAlert('Missing Contact Info', 'Please fill in Contact Person, Email, and Phone.'); return false;
            }
            return true;
          }
        },
        {
          title: 'Branding',
          template: `
            <div class="form-group">
              <label class="form-label">Upload Logo (Optional)</label>
              <input type="file" id="comp_logo" class="form-control" accept="image/*"
                onchange="Companies.previewLogo(this, 'logo_preview')">
              <div id="logo_preview" style="margin-top:10px;display:none;">
                <img id="logo_preview_img" style="max-width:150px;max-height:80px;border:1px solid var(--gray-200);border-radius:4px;padding:4px;">
              </div>
            </div>`
        }
      ],
      onFinish: (data) => { Companies.createCompanyFromWizard(data); }
    });
    window.currentWizard.render();
  },

  createCompanyFromWizard: function (data) {
    const newComp = {
      id: window.DB.companies.length + 1,
      name: data.comp_name,
      registrationNumber: data.comp_reg,
      taxReference: data.comp_tax,
      vatNumber: data.comp_vat,
      uifNumber: data.comp_uif,
      sdlNumber: data.comp_sdl,
      contact: data.comp_phone,
      email: data.comp_email,
      address: data.comp_address,
      employees: 0,
      status: 'Active',
      logo: null
    };
    const previewImg = document.getElementById('logo_preview_img');
    if (previewImg?.src?.startsWith('data:')) newComp.logo = previewImg.src;
    window.DB.companies.push(newComp);
    window.DB.save();
    window.Toast.show('Company created successfully!', 'success');
    window.closeModal('addCompanyWizard');
    this.render(document.getElementById('content'));
    delete window.currentWizard;
  },

  previewLogo: function (input, previewId) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById(previewId);
        const img = document.getElementById(previewId + '_img');
        if (preview && img) { img.src = e.target.result; preview.style.display = 'block'; }
      };
      reader.readAsDataURL(input.files[0]);
    }
  },

  editCompany: function (id) {
    const comp = window.DB.companies.find(c => c.id === id);
    if (!comp) return;
    const html = `
      <div class="card" style="width:100%;max-width:550px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title">Edit Company</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('editCompanyModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Company Name</label>
            <input type="text" id="edit_comp_name" class="form-control" value="${comp.name}"></div>
          
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Company Email</label>
              <input type="email" id="edit_comp_email" class="form-control" value="${comp.email || ''}"></div>
            <div class="form-group"><label class="form-label">Phone/Contact</label>
              <input type="text" id="edit_comp_phone" class="form-control" value="${comp.contact || ''}"></div>
          </div>

          <div class="grid-2">
            <div class="form-group"><label class="form-label">Reg Number</label>
              <input type="text" id="edit_comp_reg" class="form-control" value="${comp.registrationNumber || ''}"></div>
            <div class="form-group"><label class="form-label">Tax Number</label>
              <input type="text" id="edit_comp_tax" class="form-control" value="${comp.taxNumber || comp.taxReference || ''}"></div>
            <div class="form-group"><label class="form-label">VAT Number</label>
              <input type="text" id="edit_comp_vat" class="form-control" value="${comp.vatNumber || ''}"></div>
            <div class="form-group"><label class="form-label">UIF Number</label>
              <input type="text" id="edit_comp_uif" class="form-control" value="${comp.uifNumber || ''}"></div>
          </div>
          <div class="form-group"><label class="form-label">Address</label>
            <input type="text" id="edit_comp_address" class="form-control" value="${comp.address || ''}"></div>
          <button class="btn btn-primary" style="width:100%;margin-top:16px;"
            onclick="Companies.saveCompany(${id})">Save Changes</button>
        </div>
      </div>`;
    window.showModal('editCompanyModal', html);
  },

  saveCompany: function (id) {
    const comp = window.DB.companies.find(c => c.id === id);
    if (comp) {
      const reg = document.getElementById('edit_comp_reg').value;
      if (reg && !new RegExp("^\\d{4}/\\d{6}/\\d{2}$").test(reg)) {
        window.showAlert('Invalid Format', 'Registration Number must match YYYY/NNNNNN/NN format.');
        return;
      }
      comp.name = document.getElementById('edit_comp_name').value;
      comp.email = document.getElementById('edit_comp_email').value;
      comp.contact = document.getElementById('edit_comp_phone').value;
      comp.registrationNumber = reg;
      comp.taxNumber = document.getElementById('edit_comp_tax').value;
      comp.taxReference = document.getElementById('edit_comp_tax').value;
      comp.vatNumber = document.getElementById('edit_comp_vat').value;
      comp.uifNumber = document.getElementById('edit_comp_uif').value;
      comp.address = document.getElementById('edit_comp_address').value;
      window.DB.save();
      window.Toast.show('Company details updated', 'success');
      window.closeModal('editCompanyModal');
      this.render(document.getElementById('content'));
    }
  },

  deleteCompany: function (id) {
    window.showConfirmation('Delete Company?', 'Are you sure? This will remove the company.', () => {
      window.DB.companies = window.DB.companies.filter(c => c.id !== id);
      window.DB.save();
      window.Toast.show('Company deleted', 'success');
      this.render(document.getElementById('content'));
    });
  }
};

window.renderCompanies = function (container) {
  Companies.render(container);
};