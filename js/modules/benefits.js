// ─── Medical Aid Premium Tables ─────────────────────────────────────────────
// Rates per member type per income tier
const MedicalAidPlans = {
  "Discovery Coastal": [
    { min: 0, max: 15000, main: 1200, adult: 900, child: 450 },
    { min: 15001, max: 25000, main: 1600, adult: 1200, child: 600 },
    { min: 25001, max: Infinity, main: 2100, adult: 1600, child: 800 }
  ],
  "Discovery Classic": [
    { min: 0, max: 15000, main: 1800, adult: 1350, child: 650 },
    { min: 15001, max: 25000, main: 2400, adult: 1800, child: 900 },
    { min: 25001, max: Infinity, main: 3000, adult: 2200, child: 1100 }
  ],
  "Bonitas Standard": [
    { min: 0, max: 12000, main: 1100, adult: 850, child: 400 },
    { min: 12001, max: 20000, main: 1500, adult: 1100, child: 550 },
    { min: 20001, max: Infinity, main: 2000, adult: 1500, child: 750 }
  ],
  "Momentum Health": [
    { min: 0, max: 15000, main: 1300, adult: 1000, child: 480 },
    { min: 15001, max: 25000, main: 1750, adult: 1350, child: 660 },
    { min: 25001, max: Infinity, main: 2250, adult: 1750, child: 880 }
  ]
};

const Benefits = {
  state: { activeTab: 'enrollment' },

  render: function (container) {
    window.DB.benefits = window.DB.benefits || [];
    this.ensureMandatoryBenefits();

    const tabs = `
      <div class="tabs-container" style="margin-bottom:20px; border-bottom:1px solid var(--gray-200); display:flex; gap:24px;">
        <div class="tab-item ${this.state.activeTab === 'enrollment' ? 'active' : ''}" 
             onclick="Benefits.switchTab('enrollment')" 
             style="padding:10px 4px; cursor:pointer; font-weight:600; color:${this.state.activeTab === 'enrollment' ? 'var(--primary)' : 'var(--gray-500)'}; border-bottom:2px solid ${this.state.activeTab === 'enrollment' ? 'var(--primary)' : 'transparent'};">
          Employee Enrollment
        </div>
        <div class="tab-item ${this.state.activeTab === 'library' ? 'active' : ''}" 
             onclick="Benefits.switchTab('library')" 
             style="padding:10px 4px; cursor:pointer; font-weight:600; color:${this.state.activeTab === 'library' ? 'var(--primary)' : 'var(--gray-500)'}; border-bottom:2px solid ${this.state.activeTab === 'library' ? 'var(--primary)' : 'transparent'};">
          Benefit Library
        </div>
      </div>
    `;

    let content = '';
    if (this.state.activeTab === 'enrollment') {
      content = `
        <div class="card">
          <div class="card-header">
            <h4 class="card-title">Employee Enrollment</h4>
            <div class="search-box">
              <input type="text" class="search-input" placeholder="Search..." onkeyup="Benefits.filterEnrollment(this.value)">
            </div>
          </div>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Medical Scheme</th>
                  <th>Adults</th>
                  <th>Children</th>
                  <th>Total Med Contrib</th>
                  <th>Provident Fund</th>
                  <th>Custom Benefits</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="benefitsTableBody">
                ${window.DB.employees.map(emp => this.renderEmployeeRow(emp)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      content = this.renderLibrary();
    }

    container.innerHTML = `
      <div class="page-title-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <h2>Benefits Management</h2>
          <div style="color:var(--gray-500);font-size:0.85rem;">Manage Medical Aid, Pension, and Custom Allowances</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Benefits.showAddBenefitModal()">
          <i class="fas fa-plus"></i> Create Benefit
        </button>
      </div>
      ${tabs}
      ${content}
    `;
  },

  switchTab: function (tab) {
    this.state.activeTab = tab;
    this.render(document.getElementById('content'));
  },

  renderLibrary: function () {
    const benefits = window.DB.benefits || [];
    return `
      <div class="card">
        <div class="card-header">
          <h4 class="card-title">Available Benefits</h4>
          <p style="font-size:0.8rem; color:var(--gray-500);">Define global benefits that can be assigned to employees.</p>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Benefit Name</th>
                <th>Type</th>
                <th>Calculation</th>
                <th>Default Value</th>
                <th>Provider</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${benefits.map((b, i) => `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div class="icon-box icon-${b.color || 'primary'}" style="width:32px; height:32px; font-size:0.9rem;">
                        <i class="fas fa-${b.icon || 'gift'}"></i>
                      </div>
                      <div style="font-weight:600;">${b.name}</div>
                    </div>
                  </td>
                  <td><span class="badge badge-info">${b.type}</span></td>
                  <td>${b.calc}</td>
                  <td>${b.calc === 'Fixed' ? `R ${b.val.toFixed(2)}` : `${b.val}%`}</td>
                  <td>${b.provider || 'Internal'}</td>
                  <td>
                    <button class="btn-icon" onclick="Benefits.editLibraryBenefit(${i})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon text-danger" onclick="Benefits.deleteLibraryBenefit(${i})"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--gray-400);">No custom benefits defined. Click "Create Benefit" to add one.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  editLibraryBenefit: function (index) {
    const b = window.DB.benefits[index];
    if (!b) return;

    const html = `
      <div class="card" style="width:100%;max-width:500px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title">Edit Benefit: ${b.name}</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('editBenModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Benefit Name</label>
            <input type="text" id="edit_ben_name" class="form-control" value="${b.name}">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select id="edit_ben_type" class="form-control">
                <option value="Allowance" ${b.type === 'Allowance' ? 'selected' : ''}>Allowance (Taxable)</option>
                <option value="Deduction" ${b.type === 'Deduction' ? 'selected' : ''}>Deduction (Pre-Tax)</option>
                <option value="Reimbursement" ${b.type === 'Reimbursement' ? 'selected' : ''}>Reimbursement (Non-Taxable)</option>
                <option value="CompanyContribution" ${b.type === 'CompanyContribution' ? 'selected' : ''}>Employer Contribution (CTC only)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Calculation</label>
              <select id="edit_ben_calc" class="form-control">
                <option value="Fixed" ${b.calc === 'Fixed' ? 'selected' : ''}>Fixed Amount</option>
                <option value="Percentage" ${b.calc === 'Percentage' ? 'selected' : ''}>Percentage of Basic</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Default Amount / %</label>
            <input type="number" id="edit_ben_val" class="form-control" value="${b.val}">
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:16px;" onclick="Benefits.updateLibraryBenefit(${index})">
            Save Changes
          </button>
        </div>
      </div>`;
    showModal('editBenModal', html);
  },

  updateLibraryBenefit: function (index) {
    const name = document.getElementById('edit_ben_name').value;
    const type = document.getElementById('edit_ben_type').value;
    const calc = document.getElementById('edit_ben_calc').value;
    const val = parseFloat(document.getElementById('edit_ben_val').value) || 0;

    if (!name) { window.Toast.show("Name is required", "warning"); return; }

    window.DB.benefits[index] = { ...window.DB.benefits[index], name, type, calc, val };
    window.DB.save();
    window.Toast.show("Benefit Updated", "success");
    closeModal('editBenModal');
    this.render(document.getElementById('content'));
  },

  deleteLibraryBenefit: function (index) {
    const b = window.DB.benefits[index];
    window.showConfirmation(
      'Delete Benefit',
      `Are you sure you want to delete the "${b.name}" benefit? This will not remove it from employees already enrolled, but it will be removed from the library.`,
      () => {
        window.DB.benefits.splice(index, 1);
        window.DB.save();
        window.Toast.show("Benefit Deleted", "success");
        this.render(document.getElementById('content'));
      }
    );
  },

  filterEnrollment: function (query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#benefitsTableBody tr').forEach(r => {
      r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  ensureMandatoryBenefits: function () {
    let updated = false;
    window.DB.employees.forEach(emp => {
      emp.benefits = emp.benefits || {};
      if (!emp.benefits.pensionFund) {
        emp.benefits.pensionFund = "Allan Gray";
        emp.benefits.pensionPercent = 5;
        updated = true;
      }
    });
    if (updated) window.DB.save();
  },

  renderEmployeeRow: function (emp) {
    const custom = emp.benefits?.custom ? emp.benefits.custom.map(c => c.name).join(', ') : '—';
    const medContrib = emp.benefits?.medicalContribution ? `R ${emp.benefits.medicalContribution.toFixed(2)}` : '—';
    const adults = emp.benefits?.medicalAdults ?? 0;
    const children = emp.benefits?.medicalChildren ?? 0;

    return `
      <tr>
        <td>
          <div style="font-weight:500;font-size:0.85rem;">${emp.firstName} ${emp.lastName}</div>
          <div style="font-size:0.7rem;color:var(--gray-500);">${emp.position || ''}</div>
        </td>
        <td style="font-size:0.8rem;">${emp.benefits?.medicalAid || 'None'}</td>
        <td style="font-size:0.8rem;">${adults}</td>
        <td style="font-size:0.8rem;">${children}</td>
        <td style="font-size:0.8rem;">${medContrib}</td>
        <td style="font-size:0.8rem;">
          ${emp.benefits?.pensionFund
        ? `<span class="badge badge-success">Active</span> ${emp.benefits.pensionPercent}%`
        : '—'}
        </td>
        <td style="font-size:0.8rem;">${custom}</td>
        <td>
          <button class="btn btn-sm btn-outline" style="padding:2px 6px;"
            onclick="Benefits.editEmployeeBenefits(${emp.id})">Manage</button>
        </td>
      </tr>
    `;
  },

  // ─── Create Benefit Modal ─────────────────────────────────────────────────
  showAddBenefitModal: function () {
    const html = `
      <div class="card" style="width:100%;max-width:500px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title">Create New Benefit</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addBenefitModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Benefit Name</label>
            <input type="text" id="ben_name" class="form-control" placeholder="e.g. Travel Allowance">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select id="ben_type" class="form-control">
                <option value="Allowance">Allowance (Taxable)</option>
                <option value="Deduction">Deduction (Pre-Tax)</option>
                <option value="Reimbursement">Reimbursement (Non-Taxable)</option>
                <option value="CompanyContribution">Employer Contribution (CTC only)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Calculation</label>
              <select id="ben_calc" class="form-control">
                <option value="Fixed">Fixed Amount</option>
                <option value="Percentage">Percentage of Basic</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Default Amount / %</label>
            <input type="number" id="ben_val" class="form-control" placeholder="0.00">
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:16px;" onclick="Benefits.createBenefit()">
            Create Benefit
          </button>
        </div>
      </div>`;
    showModal('addBenefitModal', html);
  },

  createBenefit: function () {
    const name = document.getElementById('ben_name').value;
    const type = document.getElementById('ben_type').value;
    const calc = document.getElementById('ben_calc').value;
    const val = parseFloat(document.getElementById('ben_val').value) || 0;
    if (!name) { window.Toast.show("Name is required", "warning"); return; }
    window.DB.benefits = window.DB.benefits || [];
    window.DB.benefits.push({ name, type, calc, val, provider: 'Internal', icon: 'hand-holding-usd', color: 'warning' });
    window.DB.save();
    window.Toast.show("Benefit Created", "success");
    closeModal('addBenefitModal');
    this.render(document.getElementById('content'));
  },

  // ─── Manage Employee Benefits Modal ──────────────────────────────────────
  editEmployeeBenefits: function (empId) {
    const emp = window.DB.employees.find(e => e.id === empId);
    if (!emp) return;
    emp.benefits = emp.benefits || {};
    const availableBenefits = window.DB.benefits || [];

    // Build plan options
    const planOptions = Object.keys(MedicalAidPlans).map(plan =>
      `<option value="${plan}" ${emp.benefits.medicalAid === plan ? 'selected' : ''}>${plan}</option>`
    ).join('');

    // Adult/child current values
    const curAdults = emp.benefits.medicalAdults ?? 0;
    const curChildren = emp.benefits.medicalChildren ?? 0;

    // Helper: build number select (0..max)
    const numSelect = (id, max, cur, onchange = '') => {
      let opts = '';
      for (let i = 0; i <= max; i++) opts += `<option value="${i}" ${i === cur ? 'selected' : ''}>${i}</option>`;
      return `<select id="${id}" class="form-control" onchange="${onchange}">${opts}</select>`;
    };

    // Build custom benefits list with effectiveFrom
    const customBenList = availableBenefits.map(b => {
      const enrolled = emp.benefits.custom?.find(c => c.name === b.name);
      const effDate = enrolled?.effectiveFrom || '';
      return `
        <div style="background:var(--gray-50);padding:10px;border-radius:6px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="ben_chk_${b.name}" ${enrolled ? 'checked' : ''}
                onchange="Benefits.toggleEffectiveDateRow('${b.name}', this.checked)">
              <div>
                <div style="font-weight:500;font-size:0.85rem;">${b.name}</div>
                <div style="font-size:0.72rem;color:var(--gray-500);">${b.type} · ${b.calc} · ${b.calc === 'Fixed' ? `R${b.val}` : `${b.val}%`}</div>
              </div>
            </div>
            <div id="eff_row_${b.name}" style="display:${enrolled ? 'flex' : 'none'};align-items:center;gap:6px;">
              <label style="font-size:0.75rem;color:var(--gray-600);white-space:nowrap;margin:0;">Effective From:</label>
              <input type="date" id="ben_eff_${b.name}" class="form-control"
                style="width:140px;font-size:0.8rem;padding:4px 8px;" value="${effDate}">
            </div>
          </div>
        </div>`;
    }).join('');

    const html = `
      <div class="card" style="width:100%;max-width:620px;margin:auto;max-height:90vh;overflow-y:auto;">
        <div class="card-header">
          <h3>Manage Benefits: ${emp.firstName} ${emp.lastName}</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('manageBenModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="alert alert-info" style="font-size:0.8rem;margin-bottom:12px;">
            <strong>Mandatory:</strong> All employees are auto-enrolled in Provident Fund (5%).
          </div>

          <!-- Medical Aid -->
          <h5 style="color:var(--primary);font-size:0.9rem;margin-bottom:12px;">
            <i class="fas fa-heartbeat"></i> Medical Aid — Salary-Tiered Premiums
          </h5>

          <div class="form-group">
            <label class="form-label">Medical Scheme</label>
            <select id="emp_med_name" class="form-control"
              onchange="Benefits.recalcMedical(${emp.basicSalary})">
              <option value="">None</option>
              ${planOptions}
            </select>
          </div>

          <div class="grid-2" style="margin-bottom:4px;">
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-user-friends" style="color:var(--info)"></i>
                Additional Adults / Spouses
              </label>
              ${numSelect('emp_med_adults', 5, curAdults, `Benefits.recalcMedical(${emp.basicSalary})`)}
              <div class="form-hint">Each adult charged at adult rate</div>
            </div>
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-child" style="color:var(--success)"></i>
                Children / Minor Dependents
              </label>
              ${numSelect('emp_med_children', 10, curChildren, `Benefits.recalcMedical(${emp.basicSalary})`)}
              <div class="form-hint">Each child charged at child rate</div>
            </div>
          </div>

          <!-- Premium Breakdown -->
          <div id="med_preview_box" style="background:var(--gray-50);border:1px solid var(--gray-200);
            border-radius:8px;padding:12px;margin-bottom:16px;">
            ${emp.benefits.medicalAid && MedicalAidPlans[emp.benefits.medicalAid]
        ? this._buildMedPreviewHTML(emp.basicSalary, emp.benefits.medicalAid, curAdults, curChildren)
        : '<div style="font-size:0.8rem;color:var(--gray-500);">Select a plan to see premium breakdown.</div>'}
          </div>
          <input type="hidden" id="emp_med_contrib" value="${emp.benefits.medicalContribution || 0}">

          <!-- Custom Benefits -->
          ${availableBenefits.length ? `
            <h5 style="color:var(--primary);font-size:0.9rem;margin:16px 0 12px;">
              <i class="fas fa-star"></i> Additional Benefits
            </h5>
            ${customBenList}
          ` : ''}

          <button class="btn btn-primary" style="width:100%;margin-top:20px;"
            onclick="Benefits.saveEmployeeBenefits(${emp.id})">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>`;
    showModal('manageBenModal', html);
  },

  // Toggle effective date row when checkbox changes
  toggleEffectiveDateRow: function (benName, checked) {
    const row = document.getElementById(`eff_row_${benName}`);
    if (row) row.style.display = checked ? 'flex' : 'none';
  },

  // ─── Recalculate preview when plan/adults/children change ─────────────────
  recalcMedical: function (basicSalary) {
    const planName = document.getElementById('emp_med_name')?.value;
    const adults = parseInt(document.getElementById('emp_med_adults')?.value || 0);
    const children = parseInt(document.getElementById('emp_med_children')?.value || 0);
    const salary = parseFloat(basicSalary) || 0;

    const box = document.getElementById('med_preview_box');
    if (!box) return;

    if (!planName || !MedicalAidPlans[planName]) {
      box.innerHTML = '<div style="font-size:0.8rem;color:var(--gray-500);">Select a plan to see premium breakdown.</div>';
      document.getElementById('emp_med_contrib').value = 0;
      return;
    }

    box.innerHTML = this._buildMedPreviewHTML(salary, planName, adults, children);
  },

  _buildMedPreviewHTML: function (salary, planName, adults, children) {
    const tiers = MedicalAidPlans[planName];
    const tier = tiers.find(t => salary >= t.min && salary <= t.max) || tiers[tiers.length - 1];

    const mainCost = tier.main;
    const adultCost = adults * tier.adult;
    const childCost = children * tier.child;
    const total = mainCost + adultCost + childCost;

    // Write total to hidden input
    setTimeout(() => {
      const hiddenInput = document.getElementById('emp_med_contrib');
      if (hiddenInput) hiddenInput.value = total;
    }, 0);

    const row = (label, rate, count, cost) => count === 0 ? '' : `
      <tr>
        <td style="padding:4px 8px;font-size:0.8rem;">${label}</td>
        <td style="padding:4px 8px;font-size:0.8rem;text-align:center;">${count}</td>
        <td style="padding:4px 8px;font-size:0.8rem;text-align:right;">R ${rate.toFixed(2)}</td>
        <td style="padding:4px 8px;font-size:0.8rem;text-align:right;font-weight:600;">R ${cost.toFixed(2)}</td>
      </tr>`;

    return `
      <div style="font-size:0.78rem;font-weight:700;color:var(--gray-600);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.4px;">
        ${planName} — Premium Breakdown
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:var(--gray-100);">
            <th style="padding:4px 8px;font-size:0.72rem;text-align:left;">Member</th>
            <th style="padding:4px 8px;font-size:0.72rem;text-align:center;">Count</th>
            <th style="padding:4px 8px;font-size:0.72rem;text-align:right;">Rate</th>
            <th style="padding:4px 8px;font-size:0.72rem;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:4px 8px;font-size:0.8rem;">Main Member</td>
            <td style="padding:4px 8px;font-size:0.8rem;text-align:center;">1</td>
            <td style="padding:4px 8px;font-size:0.8rem;text-align:right;">R ${tier.main.toFixed(2)}</td>
            <td style="padding:4px 8px;font-size:0.8rem;text-align:right;font-weight:600;">R ${mainCost.toFixed(2)}</td>
          </tr>
          ${row('Adult Dependents', tier.adult, adults, adultCost)}
          ${row('Child Dependents', tier.child, children, childCost)}
          <tr style="border-top:2px solid var(--gray-300);">
            <td colspan="3" style="padding:6px 8px;font-size:0.82rem;font-weight:700;">Total Monthly Premium</td>
            <td style="padding:6px 8px;font-size:1rem;font-weight:800;text-align:right;color:var(--primary);">R ${total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size:0.73rem;color:var(--gray-400);margin-top:6px;">
        Salary band: R${tier.min.toLocaleString()} – ${tier.max === Infinity ? 'above' : 'R' + tier.max.toLocaleString()}
      </div>`;
  },

  // ─── Save Employee Benefits ───────────────────────────────────────────────
  saveEmployeeBenefits: function (empId) {
    const emp = window.DB.employees.find(e => e.id === empId);
    if (!emp) return;

    const planName = document.getElementById('emp_med_name').value;
    const adults = parseInt(document.getElementById('emp_med_adults')?.value || 0);
    const children = parseInt(document.getElementById('emp_med_children')?.value || 0);
    const contrib = parseFloat(document.getElementById('emp_med_contrib')?.value || 0);

    emp.benefits.medicalAid = planName;
    emp.benefits.medicalAdults = adults;
    emp.benefits.medicalChildren = children;
    emp.benefits.medicalMembers = 1 + adults + children; // total incl. main
    emp.benefits.medicalContribution = contrib;

    // Save custom benefits with effectiveFrom
    const availableBenefits = window.DB.benefits || [];
    const custom = [];
    availableBenefits.forEach(b => {
      const chk = document.getElementById(`ben_chk_${b.name}`);
      if (chk?.checked) {
        const effInput = document.getElementById(`ben_eff_${b.name}`);
        custom.push({
          name: b.name,
          value: b.val,
          type: b.type,
          calc: b.calc,
          effectiveFrom: effInput?.value || ''
        });
      }
    });
    emp.benefits.custom = custom;

    if (!emp.benefits.pensionFund) {
      emp.benefits.pensionFund = "Allan Gray";
      emp.benefits.pensionPercent = 5;
    }

    window.DB.save();
    window.Toast.show("Benefits Updated & Saved", "success");
    closeModal('manageBenModal');
    this.render(document.getElementById('content'));
  }
};

window.renderBenefits = function (container) {
  Benefits.render(container);
};