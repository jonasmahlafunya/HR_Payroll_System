const Companies = {

  render: function (container) {
    const companies = window.DB.companies || [];
    container.innerHTML = `
      <div class="page-title-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <h2 style="font-size:1.25rem;">Companies</h2>
          <div style="color:var(--gray-500);font-size:0.85rem;">Manage company entities</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Companies.showAddWizard()">
          <i class="fas fa-plus"></i> Add Company
        </button>
      </div>

      ${!companies.length ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-building"></i></div>
          <div class="empty-state-title">No Companies Yet</div>
          <div class="empty-state-desc">Add your first company to get started.</div>
          <button class="btn btn-primary btn-sm" style="margin-top:16px" onclick="Companies.showAddWizard()">
            <i class="fas fa-plus"></i> Add Company
          </button>
        </div>` : `
        <div class="grid-3" style="gap:16px;">
          ${companies.map(c => this.renderCard(c)).join('')}
        </div>`}`;
  },

  renderCard: function (company) {
    const empCount = (window.DB.employees || []).filter(e =>
      e.companyName === company.name || e.companyId == company.id
    ).length;

    const freqBadge = company.payFrequency
      ? `<span class="badge badge-info" style="font-size:0.65rem;">${company.payFrequency}</span>`
      : '';

    return `
      <div class="card" style="padding:12px;">
        <div class="card-header" style="padding:0 0 8px 0;border-bottom:1px solid var(--gray-100);margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;background:var(--primary-soft);border-radius:6px;
                        display:flex;align-items:center;justify-content:center;
                        font-size:1rem;color:var(--primary);flex-shrink:0;overflow:hidden;">
              ${company.logo
        ? `<img src="${company.logo}" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`
        : `<i class="fas fa-building"></i>`}
            </div>
            <div style="overflow:hidden;">
              <h4 class="card-title" style="margin-bottom:0;font-size:0.9rem;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${company.name}
              </h4>
              <div style="font-size:0.7rem;color:var(--gray-500);">
                ${company.registrationNumber || 'No reg number'}
              </div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
            <span class="badge badge-${company.status === 'Active' ? 'success' : 'warning'}" style="font-size:0.6rem;padding:2px 6px;">
              ${company.status || 'Active'}
            </span>
            ${freqBadge}
          </div>
        </div>

        <div class="card-body" style="padding:0;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;font-size:0.75rem;">
            <div>
              <div style="color:var(--gray-500);">Employees</div>
              <div style="font-weight:600;color:var(--primary);">${empCount}</div>
            </div>
            <div>
              <div style="color:var(--gray-500);">Pay Frequency</div>
              <div style="font-weight:600;">${company.payFrequency || '—'}</div>
            </div>
            <div>
              <div style="color:var(--gray-500);">Tax Ref</div>
              <div style="font-weight:600;">${company.taxReference || '—'}</div>
            </div>
            <div>
              <div style="color:var(--gray-500);">Pay Day</div>
              <div style="font-weight:600;">${company.payDay ? `Day ${company.payDay}` : '—'}</div>
            </div>
          </div>
          <div style="background:var(--gray-50);padding:8px;border-radius:4px;font-size:0.7rem;margin-bottom:10px;">
            <div style="margin-bottom:2px;"><i class="fas fa-envelope text-muted"></i> ${company.email || 'No email set'}</div>
            <div><i class="fas fa-phone text-muted"></i> ${company.contact || '—'}</div>
          </div>

          <div style="display:flex;gap:6px;">
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
              <label class="form-label">Company Name <span style="color:var(--danger)">*</span></label>
              <input type="text" id="comp_name" class="form-control" placeholder="e.g. Acme Corp SA" required>
            </div>
            <div class="form-group">
              <label class="form-label">Registration Number</label>
              <input type="text" id="comp_reg" class="form-control" placeholder="e.g. 2015/123456/07">
            </div>`,
          validate: () => {
            const name = document.getElementById('comp_name')?.value?.trim();
            if (!name) { window.showAlert('Missing Company Name', 'Company Name is required.'); return false; }
            return true;
          }
        },
        {
          title: 'Pay Schedule',
          template: `
            <div class="alert alert-info" style="font-size:0.82rem;margin-bottom:16px;">
              <i class="fas fa-calendar-alt"></i>
              Set how often this company runs payroll and pays employees.
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Pay Frequency <span style="color:var(--danger)">*</span></label>
                <select id="comp_freq" class="form-control" onchange="Companies._togglePayDay(this.value)">
                  <option value="Monthly">Monthly</option>
                  <option value="Bi-Weekly">Bi-Weekly (every 2 weeks)</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Fortnightly">Fortnightly</option>
                </select>
                <div class="form-hint">How often employees are paid</div>
              </div>
              <div class="form-group" id="payDayGroup">
                <label class="form-label">Pay Day</label>
                <select id="comp_payday" class="form-control">
                  <option value="">— Select day of month —</option>
                  ${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}${[11, 12, 13].includes(i + 1) ? 'th' : i % 10 === 1 ? 'st' : i % 10 === 2 ? 'nd' : i % 10 === 3 ? 'rd' : 'th'} of month</option>`).join('')}
                  <option value="last">Last day of month</option>
                </select>
                <div class="form-hint">Which day of the month salaries are paid</div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Payroll Input Cut-off Day</label>
              <select id="comp_cutoff" class="form-control">
                <option value="">— Select —</option>
                ${Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
              </select>
              <div class="form-hint">Last day employees can submit changes (leave, overtime, etc.)</div>
            </div>`,
          validate: () => true
        },
        {
          title: 'Statutory Details',
          template: `
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">PAYE / Tax Reference</label>
                <input type="text" id="comp_tax" class="form-control" placeholder="e.g. 9123456789">
              </div>
              <div class="form-group">
                <label class="form-label">VAT Number</label>
                <input type="text" id="comp_vat" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">UIF Reference</label>
                <input type="text" id="comp_uif" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">SDL Number</label>
                <input type="text" id="comp_sdl" class="form-control">
              </div>
            </div>`,
          validate: () => true
        },
        {
          title: 'Contact Info',
          template: `
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Email Address <span style="color:var(--danger)">*</span></label>
                <input type="email" id="comp_email" class="form-control" placeholder="payroll@company.co.za">
                <div class="form-hint">Used to send payroll approval emails</div>
              </div>
              <div class="form-group">
                <label class="form-label">Phone / Contact</label>
                <input type="text" id="comp_phone" class="form-control">
              </div>
              <div class="form-group" style="grid-column:span 2;">
                <label class="form-label">Physical Address</label>
                <input type="text" id="comp_address" class="form-control">
              </div>
            </div>`,
          validate: () => {
            const email = document.getElementById('comp_email')?.value?.trim();
            if (!email) { window.showAlert('Missing Email', 'An email address is required.'); return false; }
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
                <img id="logo_preview_img"
                  style="max-width:150px;max-height:80px;border:1px solid var(--gray-200);border-radius:4px;padding:4px;">
              </div>
            </div>`,
          validate: () => true
        }
      ],
      onFinish: (data) => { Companies.createCompanyFromWizard(data); }
    });

    window.currentWizard.render();
  },

  _togglePayDay: function (freq, groupId = 'payDayGroup') {
    const group = document.getElementById(groupId);
    if (group) group.style.display = (freq === 'Weekly' || freq === 'Bi-Weekly') ? 'none' : 'block';
  },

  createCompanyFromWizard: function (data) {
    try {
      const maxId = (window.DB.companies || []).reduce((m, c) => Math.max(m, c.id || 0), 0);
      const newId = maxId + 1;

      const newComp = {
        id: newId,
        name: (data.comp_name || '').trim(),
        registrationNumber: (data.comp_reg || '').trim(),
        taxReference: (data.comp_tax || '').trim(),
        vatNumber: (data.comp_vat || '').trim(),
        uifNumber: (data.comp_uif || '').trim(),
        sdlNumber: (data.comp_sdl || '').trim(),
        email: (data.comp_email || '').trim(),
        contact: (data.comp_phone || '').trim(),
        address: (data.comp_address || '').trim(),
        payFrequency: data.comp_freq || 'Monthly',
        payDay: data.comp_payday || '',
        inputCutOff: data.comp_cutoff || '',
        status: 'Active',
        logo: null
      };

      const previewImg = document.getElementById('logo_preview_img');
      if (previewImg?.src?.startsWith('data:')) newComp.logo = previewImg.src;

      window.DB.companies = window.DB.companies || [];
      window.DB.companies.push(newComp);
      window.DB.save();

      window.Toast.show(`Company "${newComp.name}" created successfully!`, 'success');
      window.closeModal('addCompanyWizard');
      delete window.currentWizard;
      this.render(document.getElementById('content'));
    } catch (err) {
      window.Toast.show('Error creating company: ' + err.message, 'warning');
    }
  },

  previewLogo: function (input, previewId) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = e => {
        const imgObj = new Image();
        imgObj.onload = () => {
          const canvas = document.createElement('canvas');
          let width = imgObj.width;
          let height = imgObj.height;
          const max_size = 300;

          if (width > height && width > max_size) {
            height = Math.round(height * (max_size / width));
            width = max_size;
          } else if (height > max_size) {
            width = Math.round(width * (max_size / height));
            height = max_size;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(imgObj, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          const preview = document.getElementById(previewId);
          const img = document.getElementById(previewId + '_img');
          if (preview && img) {
            img.src = compressed;
            preview.style.display = 'block';
          }
        };
        imgObj.src = e.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
  },

  viewCompanyDetail: function (companyId, initialTab = 'overview') {
    const company = (window.DB.companies || []).find(c => c.id === companyId);
    if (!company) return;
    const empCount = (window.DB.employees || []).filter(
      e => e.companyName === company.name || e.companyId == company.id
    ).length;

    const html = `
      <div class="card" style="width:100%;max-width:980px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header" style="background:var(--gray-50);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:var(--primary-soft);border-radius:8px;
                        display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:1.1rem;overflow:hidden;">
              ${company.logo
        ? `<img src="${company.logo}" style="width:100%;height:100%;object-fit:contain;">`
        : `<i class="fas fa-building"></i>`}
            </div>
            <div>
              <h3 style="margin:0;font-size:1rem;">${company.name}</h3>
              <div style="font-size:0.75rem;color:var(--gray-500);">
                Reg: ${company.registrationNumber || '—'} &bull; Tax Ref: ${company.taxReference || '—'}
                &bull; <span class="badge badge-info" style="font-size:0.65rem;">${company.payFrequency || 'Monthly'}</span>
              </div>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="closeModal('companyDetailModal')">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="tabs" style="padding:0 20px;margin-bottom:0;border-bottom:1px solid var(--gray-200);">
          <button class="tab-btn active" id="cdTab_overview" onclick="Companies.switchDetailTab('overview', ${companyId})">
            <i class="fas fa-info-circle"></i> Overview
          </button>
          <button class="tab-btn" id="cdTab_employees" onclick="Companies.switchDetailTab('employees', ${companyId})">
            <i class="fas fa-users"></i> Employees
            <span class="badge badge-primary" style="margin-left:4px;font-size:0.65rem;padding:2px 6px;">${empCount}</span>
          </button>
          <button class="tab-btn" id="cdTab_payroll" onclick="Companies.switchDetailTab('payroll', ${companyId})">
            <i class="fas fa-money-bill-wave"></i> Payroll Runs
          </button>
        </div>

        <div id="companyDetailContent" style="padding:20px;"></div>
      </div>`;
    window.showModal('companyDetailModal', html);
    this.switchDetailTab(initialTab, companyId);
  },

  switchDetailTab: function (tab, companyId) {
    ['overview', 'employees', 'payroll'].forEach(t => {
      const btn = document.getElementById(`cdTab_${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });
    const content = document.getElementById('companyDetailContent');
    const company = (window.DB.companies || []).find(c => c.id === companyId);
    if (!content || !company) return;
    if (tab === 'overview') content.innerHTML = this.renderDetailOverview(company);
    if (tab === 'employees') content.innerHTML = this.renderDetailEmployees(company);
    if (tab === 'payroll') content.innerHTML = this.renderDetailPayroll(company);
  },

  renderDetailOverview: function (company) {
    const emps = (window.DB.employees || []).filter(e => e.companyName === company.name || e.companyId == company.id);
    const active = emps.filter(e => e.status === 'Active');
    const payroll = active.reduce((s, e) => s + (e.basicSalary || 0), 0);
    const runs = (window.DB.payrollRuns || []).filter(r => r.companyId == company.id);

    return `
      <div class="grid-4" style="margin-bottom:20px;">
        <div class="kpi-card" style="border-left:4px solid var(--primary)">
          <div class="kpi-label">Active Employees</div><div class="kpi-value">${active.length}</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid var(--success)">
          <div class="kpi-label">Monthly Payroll</div>
          <div class="kpi-value" style="font-size:1.1rem">${window.formatCurrency(payroll)}</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid var(--warning)">
          <div class="kpi-label">Payroll Runs</div><div class="kpi-value">${runs.length}</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid var(--info)">
          <div class="kpi-label">Pay Frequency</div>
          <div class="kpi-value" style="font-size:1rem">${company.payFrequency || 'Monthly'}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h4 class="card-title">Company Details</h4></div>
          <div class="card-body" style="font-size:0.85rem;">
            ${[
        ['Registration No.', company.registrationNumber],
        ['Tax Reference', company.taxReference],
        ['UIF Number', company.uifNumber],
        ['SDL Number', company.sdlNumber],
        ['Address', company.address],
        ['Contact', company.contact],
        ['Email', company.email],
      ].map(([lbl, val]) => `
              <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gray-100);">
                <span style="color:var(--gray-500)">${lbl}</span>
                <span style="font-weight:500;text-align:right">${val || '—'}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h4 class="card-title">Pay Schedule</h4></div>
          <div class="card-body" style="font-size:0.85rem;">
            ${[
        ['Pay Frequency', company.payFrequency || 'Monthly'],
        ['Pay Day', company.payDay ? `${company.payDay === 'last' ? 'Last day of month' : `Day ${company.payDay}`}` : '—'],
        ['Input Cut-off Day', company.inputCutOff ? `Day ${company.inputCutOff}` : '—'],
      ].map(([lbl, val]) => `
              <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gray-100);">
                <span style="color:var(--gray-500)">${lbl}</span>
                <span style="font-weight:500;">${val}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  },

  renderDetailEmployees: function (company) {
    const emps = (window.DB.employees || []).filter(
      e => e.companyName === company.name || e.companyId == company.id
    );
    if (!emps.length) return `
      <div class="empty-state" style="padding:40px;">
        <div class="empty-state-icon"><i class="fas fa-users"></i></div>
        <div class="empty-state-title">No Employees</div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px"
          onclick="closeModal('companyDetailModal'); loadPage('employees'); setTimeout(()=>Employees.showAddWizard(),400);">
          <i class="fas fa-plus"></i> Add Employee
        </button>
      </div>`;

    return `
      <div style="margin-bottom:14px;">
        <input type="text" class="search-input" style="width:280px;"
          placeholder="Search employees..."
          onkeyup="Companies.filterDetailEmployees(this.value)">
      </div>
      <div class="table-responsive">
        <table id="companyEmpTable">
          <thead>
            <tr><th>Employee</th><th>Position</th><th class="text-right">Salary</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${emps.map(emp => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:9px;">
                    <div style="width:30px;height:30px;border-radius:50%;background:var(--primary-soft);
                                color:var(--primary);display:flex;align-items:center;justify-content:center;
                                font-weight:700;font-size:0.72rem;flex-shrink:0;">
                      ${(emp.firstName || '?').charAt(0)}${(emp.lastName || '').charAt(0)}
                    </div>
                    <div>
                      <div style="font-weight:600;font-size:0.85rem;">${emp.firstName} ${emp.lastName}</div>
                      <div style="font-size:0.73rem;color:var(--gray-500);">${emp.email || '—'}</div>
                    </div>
                  </div>
                </td>
                <td style="font-size:0.82rem;">${emp.position || '—'}</td>
                <td class="text-right" style="font-size:0.82rem;font-weight:600;">${window.formatCurrency(emp.basicSalary || 0)}</td>
                <td>
                  <span class="badge badge-${emp.status === 'Terminated' ? 'danger' : emp.status === 'Active' ? 'success' : 'warning'}">
                    ${emp.status || 'Active'}
                  </span>
                </td>
                <td>
                  <button class="btn-icon" onclick="closeModal('companyDetailModal'); window.currentEmployeeId=${emp.id}; loadPage('profile');">
                    <i class="fas fa-eye"></i>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:14px;">
        <button class="btn btn-primary btn-sm"
          onclick="closeModal('companyDetailModal'); loadPage('employees'); setTimeout(()=>Employees.showAddWizard(),400);">
          <i class="fas fa-plus"></i> Add Employee
        </button>
      </div>`;
  },

  filterDetailEmployees: function (query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#companyEmpTable tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  renderDetailPayroll: function (company) {
    const runs = (window.DB.payrollRuns || []).filter(r => r.companyId == company.id);
    const statusColors = {
      'Pending Approval': 'warning', 'Approved': 'success',
      'Finalized': 'success', 'Paid': 'teal', 'Draft': 'gray'
    };
    return `
      <div class="table-responsive">
        <table>
          <thead><tr><th>Period</th><th>Frequency</th><th>Status</th><th>Employees</th><th class="text-right">Gross</th><th class="text-right">Net</th></tr></thead>
          <tbody>
            ${runs.length ? runs.map(r => `
              <tr>
                <td style="font-weight:600">${r.period}</td>
                <td><span class="badge badge-gray" style="font-size:0.7rem;">${r.payFrequency || company.payFrequency || 'Monthly'}</span></td>
                <td><span class="badge badge-${statusColors[r.status] || 'gray'}">${r.status}</span></td>
                <td>${r.employeeCount || 0}</td>
                <td class="text-right">${window.formatCurrency(r.totalGross || 0)}</td>
                <td class="text-right" style="font-weight:700;color:var(--success)">${window.formatCurrency(r.totalNet || 0)}</td>
              </tr>`).join('') : `
              <tr><td colspan="6">
                <div class="empty-state" style="padding:32px;">
                  <div class="empty-state-title">No payroll runs yet</div>
                </div>
              </td></tr>`}
          </tbody>
        </table>
      </div>`;
  },

  editCompany: function (id) {
    const comp = (window.DB.companies || []).find(c => c.id === id);
    if (!comp) return;
    const html = `
      <div class="card" style="width:100%;max-width:650px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title">Edit Company</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('editCompanyModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div style="display:flex;gap:16px;margin-bottom:20px;align-items:flex-start;">
            <div style="text-align:center;">
              <div id="edit_logo_preview" style="width:80px;height:80px;border:1px solid var(--gray-200);border-radius:8px;
                          display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--gray-50);margin-bottom:8px;">
                ${comp.logo
        ? `<img src="${comp.logo}" id="edit_logo_preview_img" style="max-width:100%;max-height:100%;object-fit:contain;">`
        : `<i class="fas fa-building" style="font-size:1.5rem;color:var(--gray-400);"></i><img id="edit_logo_preview_img" style="display:none;">`}
              </div>
              <button class="btn btn-outline btn-xs" onclick="document.getElementById('edit_comp_logo').click()">
                <i class="fas fa-camera"></i> Change
              </button>
              <input type="file" id="edit_comp_logo" style="display:none;" accept="image/*"
                     onchange="Companies.previewLogo(this, 'edit_logo_preview')">
            </div>
            <div style="flex:1;">
              <div class="form-group">
                <label class="form-label">Company Name *</label>
                <input type="text" id="edit_comp_name" class="form-control" value="${comp.name || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="edit_comp_email" class="form-control" value="${comp.email || ''}">
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group"><label class="form-label">Pay Frequency</label>
              <select id="edit_comp_freq" class="form-control" onchange="Companies._togglePayDay(this.value, 'edit_payDayGroup')">
                ${['Monthly', 'Bi-Weekly', 'Weekly', 'Fortnightly'].map(f =>
          `<option value="${f}" ${comp.payFrequency === f ? 'selected' : ''}>${f}</option>`).join('')}
              </select></div>
            <div class="form-group" id="edit_payDayGroup" style="display:${(comp.payFrequency === 'Weekly' || comp.payFrequency === 'Bi-Weekly') ? 'none' : 'block'}"><label class="form-label">Pay Day</label>
              <select id="edit_comp_payday" class="form-control">
                <option value="">— Select —</option>
                ${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${comp.payDay == i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}
                <option value="last" ${comp.payDay === 'last' ? 'selected' : ''}>Last day of month</option>
              </select></div>
            <div class="form-group"><label class="form-label">Phone</label>
              <input type="text" id="edit_comp_phone" class="form-control" value="${comp.contact || ''}"></div>
            <div class="form-group"><label class="form-label">Registration No.</label>
              <input type="text" id="edit_comp_reg" class="form-control" value="${comp.registrationNumber || ''}"></div>
            <div class="form-group"><label class="form-label">Tax Reference</label>
              <input type="text" id="edit_comp_tax" class="form-control" value="${comp.taxReference || comp.taxNumber || ''}"></div>
            <div class="form-group"><label class="form-label">VAT Number</label>
              <input type="text" id="edit_comp_vat" class="form-control" value="${comp.vatNumber || ''}"></div>
            <div class="form-group"><label class="form-label">UIF Number</label>
              <input type="text" id="edit_comp_uif" class="form-control" value="${comp.uifNumber || ''}"></div>
            <div class="form-group"><label class="form-label">SDL Number</label>
              <input type="text" id="edit_comp_sdl" class="form-control" value="${comp.sdlNumber || ''}"></div>
          </div>
          <div class="form-group"><label class="form-label">Address</label>
            <input type="text" id="edit_comp_address" class="form-control" value="${comp.address || ''}"></div>
          <button class="btn btn-primary" style="width:100%;margin-top:16px;" onclick="Companies.saveCompany(${id})">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>`;
    window.showModal('editCompanyModal', html);
  },

  saveCompany: function (id) {
    const comp = (window.DB.companies || []).find(c => c.id === id);
    if (!comp) return;
    const name = document.getElementById('edit_comp_name')?.value?.trim();
    if (!name) { window.showAlert('Required', 'Company name cannot be empty.'); return; }

    comp.name = name;
    comp.email = document.getElementById('edit_comp_email')?.value?.trim() || comp.email;
    comp.contact = document.getElementById('edit_comp_phone')?.value?.trim() || comp.contact;
    comp.registrationNumber = document.getElementById('edit_comp_reg')?.value?.trim() || comp.registrationNumber;
    comp.taxReference = document.getElementById('edit_comp_tax')?.value?.trim() || comp.taxReference;
    comp.taxNumber = comp.taxReference;
    comp.vatNumber = document.getElementById('edit_comp_vat')?.value?.trim() || comp.vatNumber;
    comp.uifNumber = document.getElementById('edit_comp_uif')?.value?.trim() || comp.uifNumber;
    comp.sdlNumber = document.getElementById('edit_comp_sdl')?.value?.trim() || comp.sdlNumber;
    comp.address = document.getElementById('edit_comp_address')?.value?.trim() || comp.address;
    comp.payFrequency = document.getElementById('edit_comp_freq')?.value || comp.payFrequency;
    comp.payDay = document.getElementById('edit_comp_payday')?.value || comp.payDay;

    const previewImg = document.getElementById('edit_logo_preview_img');
    if (previewImg && previewImg.src && previewImg.src.startsWith('data:')) {
      comp.logo = previewImg.src;
    }

    window.DB.save();
    window.Toast.show('Company updated successfully', 'success');
    window.closeModal('editCompanyModal');
    this.render(document.getElementById('content'));
  },

  deleteCompany: function (id) {
    const comp = (window.DB.companies || []).find(c => c.id === id);
    if (!comp) return;
    window.showConfirmation('Delete Company?', `Are you sure you want to remove <strong>${comp.name}</strong>?`, () => {
      window.DB.companies = (window.DB.companies || []).filter(c => c.id !== id);
      window.DB.save();
      window.Toast.show('Company deleted', 'success');
      this.render(document.getElementById('content'));
    });
  }
};

window.renderCompanies = function (container) {
  Companies.render(container);
};