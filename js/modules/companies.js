const Companies = {
  render: function (container) {
    const html = `
        <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 1.25rem;">Companies</h2>
            <div style="color: var(--gray-500); font-size: 0.85rem;">Manage company entities</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Companies.showAddWizard()">
            <i class="fas fa-plus"></i> Add Company
          </button>
        </div>
  
        <div class="grid-3" style="gap: 16px;">
          ${window.DB.companies.map(company => this.renderCompanyCard(company)).join('')}
        </div>
      `;
    container.innerHTML = html;
  },

  // 50% Size Reduced Card
  renderCompanyCard: function (company) {
    return `
        <div class="card" style="padding: 12px;">
          <div class="card-header" style="padding: 0 0 8px 0; border-bottom: 1px solid var(--gray-100); margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; background: var(--gray-100); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1rem; color: var(--primary);">
                ${company.logo ? `<img src="${company.logo}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;">` : `<i class="fas fa-building"></i>`}
              </div>
              <div style="overflow: hidden;">
                <h4 class="card-title" style="margin-bottom: 0; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${company.name}</h4>
                <div style="font-size: 0.7rem; color: var(--gray-500);">${company.registrationNumber || 'N/A'}</div>
              </div>
            </div>
            <span class="badge badge-success" style="font-size: 0.6rem; padding: 2px 6px;">${company.status}</span>
          </div>
          
          <div class="card-body" style="padding: 0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 0.75rem;">
               <div>
                 <div style="color: var(--gray-500);">Employees</div>
                 <div style="font-weight: 600;">${company.employees}</div>
               </div>
               <div>
                 <div style="color: var(--gray-500);">Tax Ref</div>
                 <div style="font-weight: 600;">${company.taxReference}</div>
               </div>
            </div>
  
            <div style="background: var(--gray-50); padding: 8px; border-radius: 4px; font-size: 0.7rem;">
               <div style="margin-bottom: 2px;"><i class="fas fa-envelope text-muted"></i> ${company.email || 'No Email'}</div>
               <div><i class="fas fa-phone text-muted"></i> ${company.contact}</div>
            </div>
            
             <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button class="btn btn-outline btn-sm" style="flex: 1; font-size: 0.7rem; padding: 4px;" onclick="Companies.editCompany(${company.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-outline btn-sm" style="flex: 1; font-size: 0.7rem; padding: 4px; color: var(--danger); border-color: var(--danger);" onclick="Companies.deleteCompany(${company.id})"><i class="fas fa-trash"></i> Delete</button>
             </div>
          </div>
        </div>
      `;
  },
  showAddWizard: function () {
    const html = `
        <div class="card" style="width: 100%; max-width: 800px; margin: auto; max-height: 90vh; overflow-y: auto;">
          <div class="card-header">
             <h3 class="card-title">Add New Company</h3>
             <button class="btn btn-outline btn-sm" onclick="closeModal('addCompanyWizard')"><i class="fas fa-times"></i></button>
          </div>
          <div id="companyWizardContainer" class="card-body"></div>
        </div>
      `;
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
             </div>
          `,
          validate: () => {
            const name = document.getElementById('comp_name').value;
            const reg = document.getElementById('comp_reg').value;
            if (!name || !reg) { window.showAlert('Incomplete Details', 'Please fill in all required fields marked with (*).'); return false; }
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
             </div>
          `,
          validate: () => {
            const tax = document.getElementById('comp_tax').value;
            if (!tax) { window.showAlert('Missing Tax Reference', 'The Tax Reference number is required.'); return false; }
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
             </div>
          `,
          validate: () => {
            const person = document.getElementById('comp_contact_person').value;
            const email = document.getElementById('comp_email').value;
            const phone = document.getElementById('comp_phone').value;
            if (!person || !email || !phone) { window.showAlert('Missing Contact Info', 'Please fill in Contact Person, Email, and Phone.'); return false; }
            return true;
          }
        },
        {
          title: 'Branding',
          template: `
             <div class="form-group">
               <label class="form-label">Upload Logo (Optional)</label>
               <input type="file" id="comp_logo" class="form-control" accept="image/*" onchange="Companies.previewLogo(this, 'logo_preview')">
               <div id="logo_preview" style="margin-top: 10px; display: none;">
                 <img id="logo_preview_img" style="max-width: 150px; max-height: 80px; border: 1px solid var(--gray-200); border-radius: 4px; padding: 4px;">
               </div>
             </div>
          `
        }
      ],
      onFinish: (data) => {
        Companies.createCompanyFromWizard(data);
      }
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
      logo: null // Handle logo separately via preview logic if needed, or simplified here
    };

    // Handle logo if present in preview
    const previewImg = document.getElementById('logo_preview_img');
    if (previewImg && previewImg.src && previewImg.src.startsWith('data:')) {
      newComp.logo = previewImg.src;
    }

    window.DB.companies.push(newComp);
    window.DB.save();
    window.Toast.show('Company created successfully!', 'success');
    window.closeModal('addCompanyWizard');
    this.render(document.getElementById('content'));
    delete window.currentWizard;
  },

  // Legacy method kept for reference if needed, but replaced by wizard
  createCompany: function () {
    // Gather data
    const logoInput = document.getElementById('comp_logo');
    let logoData = null;

    // Convert logo to base64 if uploaded
    if (logoInput && logoInput.files && logoInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        logoData = e.target.result;
        this.saveCompanyData(logoData);
      };
      reader.readAsDataURL(logoInput.files[0]);
    } else {
      this.saveCompanyData(null);
    }
  },

  saveCompanyData: function (logoData) {
    const newCompany = {
      id: window.DB.companies.length + 10,
      name: document.getElementById('comp_name').value,
      registrationNumber: document.getElementById('comp_reg').value,
      taxReference: document.getElementById('comp_tax').value,
      vatNumber: document.getElementById('comp_vat').value,
      uifNumber: document.getElementById('comp_uif').value,
      sdlNumber: document.getElementById('comp_sdl').value,
      email: document.getElementById('comp_email').value,
      contact: document.getElementById('comp_phone').value,
      address: document.getElementById('comp_address').value,
      logo: logoData,
      employees: 0,
      status: 'Active'
    };

    if (!newCompany.name) {
      window.Toast.show("Company Name is required", "warning");
      return;
    }

    window.DB.companies.push(newCompany);
    window.DB.save();

    window.closeModal('addCompanyModal');
    window.Toast.show("Company created successfully", "success");
    this.render(document.getElementById('content'));
  },

  previewLogo: function (input, previewId) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById(previewId);
        const img = document.getElementById(previewId + '_img');
        if (preview && img) {
          img.src = e.target.result;
          preview.style.display = 'block';
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  },

  editCompany: function (id) {
    const comp = window.DB.companies.find(c => c.id === id);
    if (!comp) return;

    const html = `
      <div class="card" style="width: 100%; max-width: 500px; margin: auto;">
         <div class="card-header">
            <h3 class="card-title">Edit Company</h3>
            <button class="btn btn-outline btn-sm" onclick="closeModal('editCompanyModal')"><i class="fas fa-times"></i></button>
         </div>
         <div class="card-body">
            <div class="form-group"><label class="form-label">Company Name</label><input type="text" id="edit_comp_name" class="form-control" value="${comp.name}"></div>
            <div class="grid-2">
               <div class="form-group"><label class="form-label">Reg Number</label><input type="text" id="edit_comp_reg" class="form-control" value="${comp.registrationNumber || ''}"></div>
               <div class="form-group"><label class="form-label">Tax Number</label><input type="text" id="edit_comp_tax" class="form-control" value="${comp.taxNumber || ''}"></div>
            </div>
            <div class="grid-2">
                 <div class="form-group"><label class="form-label">VAT Number</label><input type="text" id="edit_comp_vat" class="form-control" value="${comp.vatNumber || ''}"></div>
                 <div class="form-group"><label class="form-label">UIF Number</label><input type="text" id="edit_comp_uif" class="form-control" value="${comp.uifNumber || ''}"></div>
            </div>
            <div class="form-group"><label class="form-label">Address</label><input type="text" id="edit_comp_address" class="form-control" value="${comp.address || ''}"></div>
            
            <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" onclick="Companies.saveCompany(${id})">Save Changes</button>
         </div>
      </div>
    `;
    window.showModal('editCompanyModal', html);
  },

  saveCompany: function (id) {
    const comp = window.DB.companies.find(c => c.id === id);
    if (comp) {
      comp.name = document.getElementById('edit_comp_name').value;
      comp.registrationNumber = document.getElementById('edit_comp_reg').value;
      comp.taxNumber = document.getElementById('edit_comp_tax').value;
      comp.vatNumber = document.getElementById('edit_comp_vat').value;
      comp.uifNumber = document.getElementById('edit_comp_uif').value;
      comp.address = document.getElementById('edit_comp_address').value;

      window.DB.save();
      window.Toast.show("Company details updated", "success");
      window.closeModal('editCompanyModal');
      this.render(document.getElementById('content'));
    }
  },

  deleteCompany: function (id) {
    window.showConfirmation("Delete Company?", "Are you sure? This will hide the company. (Soft Delete)", () => {
      const comp = window.DB.companies.find(c => c.id === id);
      if (comp) {
        // Check for constraints (employees, runs) - strictly we should blocking, but for now simple delete
        window.DB.companies = window.DB.companies.filter(c => c.id !== id);
        window.DB.save();
        window.Toast.show("Company deleted", "success");
        this.render(document.getElementById('content'));
      }
    });
  }
};

window.renderCompanies = function (container) {
  Companies.render(container);
};
