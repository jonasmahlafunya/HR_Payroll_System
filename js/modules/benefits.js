
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
   ]
};

const Benefits = {
   render: function (container) {
      // Ensure benefits store exists
      window.DB.benefits = window.DB.benefits || [];

      // Auto-enroll existing employees in Provident Fund if missing (Self-healing)
      this.ensureMandatoryBenefits();

      const html = `
        <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 1.25rem;">Benefits Management</h2>
            <div style="color: var(--gray-500); font-size: 0.85rem;">Manage Medical Aid, Pension, and Custom Allowances</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Benefits.showAddBenefitModal()">
             <i class="fas fa-plus"></i> Create Benefit
          </button>
        </div>
  
        <div class="grid-3" style="gap: 12px; margin-bottom: 20px;">
          ${this.renderBenefitCards()}
        </div>
  
        <div class="card">
          <div class="card-header" style="justify-content: space-between;">
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
                   <th>Dependents</th>
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
      container.innerHTML = html;
   },

   ensureMandatoryBenefits: function () {
      let updated = false;
      window.DB.employees.forEach(emp => {
         emp.benefits = emp.benefits || {};
         // Check Provident Fund
         if (!emp.benefits.pensionFund) {
            emp.benefits.pensionFund = "Allan Gray"; // Default Provider
            emp.benefits.pensionPercent = 5; // Default 5%
            updated = true;
         }
      });
      if (updated) window.DB.save();
   },

   renderBenefitCards: function () {
      // Combine Default + Custom
      const defaults = [
         { name: "Medical Aid", provider: "Salary Based", type: "Medical", icon: "heartbeat", color: "danger" },
         { name: "Provident Fund", provider: "Mandatory (5%)", type: "Retirement", icon: "piggy-bank", color: "success" }
      ];

      const all = [...defaults, ...(window.DB.benefits || [])];

      return all.map(b => `
          <div class="card" style="padding: 12px;">
             <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                 <div style="width: 36px; height: 36px; background: var(--gray-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem;" class="text-${b.color || 'info'}">
                    <i class="fas fa-${b.icon || 'star'}"></i>
                 </div>
                 <div>
                    <h4 style="margin: 0; font-size: 0.9rem;">${b.name}</h4>
                    <div style="color: var(--gray-500); font-size: 0.75rem;">${b.provider || 'Internal'}</div>
                 </div>
             </div>
             <div style="font-size: 0.75rem; color: var(--gray-600);">${b.type}</div>
          </div>
       `).join('');
   },

   renderEmployeeRow: function (emp) {
      // Mock custom benefits string
      const custom = emp.benefits?.custom ? emp.benefits.custom.map(c => c.name).join(', ') : '-';
      const medContrib = emp.benefits?.medicalContribution ? `R ${emp.benefits.medicalContribution.toFixed(2)}` : '-';

      return `
            <tr>
              <td>
                 <div style="font-weight: 500; font-size: 0.85rem;">${emp.firstName} ${emp.lastName}</div>
                 <div style="font-size: 0.7rem; color: var(--gray-500);">${emp.position}</div>
              </td>
              <td style="font-size: 0.8rem;">${emp.benefits?.medicalAid || 'None'}</td>
              <td style="font-size: 0.8rem;">${emp.benefits?.medicalMembers || 0}</td>
              <td style="font-size: 0.8rem;">${medContrib}</td>
              <td style="font-size: 0.8rem;">
                 ${emp.benefits?.pensionFund ? `<span class="badge badge-success">Active</span> ${emp.benefits.pensionPercent}%` : '-'}
              </td>
              <td style="font-size: 0.8rem;">${custom}</td>
              <td>
                 <button class="btn btn-sm btn-outline" style="padding: 2px 6px;" onclick="Benefits.editEmployeeBenefits(${emp.id})">Manage</button>
              </td>
            </tr>
        `;
   },

   showAddBenefitModal: function () {
      const html = `
        <div class="card" style="width: 100%; max-width: 500px; margin: auto;">
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
              
              <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" onclick="Benefits.createBenefit()">Create Benefit</button>
           </div>
        </div>
      `;
      showModal('addBenefitModal', html);
   },

   createBenefit: function () {
      const name = document.getElementById('ben_name').value;
      const type = document.getElementById('ben_type').value;
      const calc = document.getElementById('ben_calc').value;
      const val = parseFloat(document.getElementById('ben_val').value) || 0;

      if (!name) { window.Toast.show("Name is required", "error"); return; }

      const newBen = { name, type, calc, val, provider: 'Internal', icon: 'hand-holding-usd', color: 'warning' };

      window.DB.benefits = window.DB.benefits || [];
      window.DB.benefits.push(newBen);
      window.DB.save();

      window.Toast.show("Benefit Created", "success");
      closeModal('addBenefitModal');
      this.render(document.getElementById('content'));
   },

   editEmployeeBenefits: function (empId) {
      const emp = window.DB.employees.find(e => e.id === empId);
      if (!emp) return;

      // Ensure benefits object exists
      emp.benefits = emp.benefits || {};
      const availableBenefits = window.DB.benefits || [];

      const planOptions = Object.keys(MedicalAidPlans).map(plan =>
         `<option value="${plan}" ${emp.benefits.medicalAid === plan ? 'selected' : ''}>${plan}</option>`
      ).join('');

      const html = `
           <div class="card" style="width: 100%; max-width: 600px; margin: auto; max-height: 90vh; overflow-y: auto;">
              <div class="card-header">
                 <h3>Manage Benefits: ${emp.firstName}</h3>
                 <button class="btn btn-outline btn-sm" onclick="closeModal('manageBenModal')"><i class="fas fa-times"></i></button>
              </div>
              <div class="card-body">
                 <div class="alert alert-info" style="font-size: 0.8rem; margin-bottom: 12px;">
                    <strong>Mandatory:</strong> All employees are auto-enrolled in Provident Fund (5%).
                 </div>

                 <h5 style="color: var(--primary); font-size: 0.9rem; margin-bottom: 12px;">Medical Aid (Salary Tiered)</h5>
                 <div class="form-group">
                    <label class="form-label">Select Plan</label>
                    <select id="emp_med_name" class="form-control" onchange="Benefits.calculatePreview(${emp.basicSalary})">
                       <option value="">None</option>
                       ${planOptions}
                    </select>
                 </div>
                 <div class="grid-2">
                    <div class="form-group">
                       <label class="form-label">Number of Dependents</label>
                       <input type="number" id="emp_med_mem" class="form-control" value="${emp.benefits.medicalMembers || 0}" onchange="Benefits.calculatePreview(${emp.basicSalary})">
                    </div>
                    <div class="form-group">
                       <label class="form-label">Total Contribution (Auto-Calc)</label>
                       <input type="text" id="emp_med_contrib_display" class="form-control" value="R ${emp.benefits.medicalContribution || 0}" disabled style="background: #f8fafc; font-weight: bold;">
                       <input type="hidden" id="emp_med_contrib" value="${emp.benefits.medicalContribution || 0}">
                    </div>
                 </div>

                 <h5 style="color: var(--primary); font-size: 0.9rem; margin: 16px 0 12px;">Additional Benefits</h5>
                 <div id="customBenefitsList">
                    ${availableBenefits.map(b => {
         // Check if enrolled
         const enrolled = emp.benefits.custom && emp.benefits.custom.find(c => c.name === b.name);
         return `
                           <div style="background: var(--gray-50); padding: 8px; border-radius: 4px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                              <div>
                                 <div style="font-weight: 500; font-size: 0.85rem;">${b.name}</div>
                                 <div style="font-size: 0.7rem; color: var(--gray-500);">${b.type} (${b.calc})</div>
                              </div>
                              <input type="checkbox" id="ben_chk_${b.name}" ${enrolled ? 'checked' : ''}>
                           </div>
                        `;
      }).join('')}
                    ${availableBenefits.length === 0 ? '<div class="text-muted" style="font-size: 0.8rem;">No custom benefits defined. Create one first.</div>' : ''}
                 </div>
  
                 <button class="btn btn-primary" style="width: 100%; margin-top: 20px;" onclick="Benefits.saveEmployeeBenefits(${emp.id})">Save Changes</button>
              </div>
           </div>
        `;
      showModal('manageBenModal', html);
   },

   calculatePreview: function (basicSalary) {
      const planName = document.getElementById('emp_med_name').value;
      const dependents = parseInt(document.getElementById('emp_med_mem').value) || 0;

      if (!planName || !MedicalAidPlans[planName]) {
         document.getElementById('emp_med_contrib_display').value = "R 0.00";
         document.getElementById('emp_med_contrib').value = 0;
         return;
      }

      const tiers = MedicalAidPlans[planName];
      // Find correct tier
      const tier = tiers.find(t => basicSalary >= t.min && basicSalary <= t.max);

      if (tier) {
         let total = tier.main; // Main member cost
         if (dependents > 0) {
            // First dependent is usually Adult, others Child? 
            // For simplicity: 1st usually Spouse (Adult), Rest Children.
            // Let's assume 1 Adult dependent + (N-1) Children if N > 0?
            // Or just treat all dependents as Average?
            // Let's do: 1 Adult Dependent + (Rest) Children logic for better realism.

            // But usually "Members" field means Dependents? Or Total People?
            // Standard: "Principal + Dependents".
            // If user types '1' dependent.
            total += tier.adult; // 1 Adult
            if (dependents > 1) {
               total += (dependents - 1) * tier.child;
            }
         }
         document.getElementById('emp_med_contrib_display').value = `R ${total.toFixed(2)}`;
         document.getElementById('emp_med_contrib').value = total;
      }
   },

   saveEmployeeBenefits: function (empId) {
      const emp = window.DB.employees.find(e => e.id === empId);
      if (!emp) return;

      // Save Standard
      const planName = document.getElementById('emp_med_name').value;
      emp.benefits.medicalAid = planName;
      emp.benefits.medicalMembers = parseInt(document.getElementById('emp_med_mem').value) || 0;
      emp.benefits.medicalContribution = parseFloat(document.getElementById('emp_med_contrib').value) || 0;

      // Save Custom
      const availableBenefits = window.DB.benefits || [];
      const custom = [];
      availableBenefits.forEach(b => {
         if (document.getElementById(`ben_chk_${b.name}`)?.checked) {
            custom.push({
               name: b.name,
               value: b.val,
               type: b.type,
               calc: b.calc
            });
         }
      });
      emp.benefits.custom = custom;

      // Ensure Provident Logic Preserved/Updated
      if (!emp.benefits.pensionFund) {
         emp.benefits.pensionFund = "Allan Gray";
         emp.benefits.pensionPercent = 5;
      }

      window.DB.save();
      window.Toast.show("Benefits Updated", "success");
      closeModal('manageBenModal');
      this.render(document.getElementById('content'));
   }
};

window.renderBenefits = function (container) {
   Benefits.render(container);
};
