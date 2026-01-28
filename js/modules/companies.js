const Companies = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Companies</h2>
          <div style="color: var(--gray-500);">Manage your company entities and registration details</div>
        </div>
        <button class="btn btn-primary" onclick="Companies.showAddModal()">
          <i class="fas fa-plus"></i> Add Company
        </button>
      </div>

      <div class="grid-2">
        ${window.DB.companies.map(company => this.renderCompanyCard(company)).join('')}
      </div>
    `;
    container.innerHTML = html;
  },

  renderCompanyCard: function (company) {
    return `
      <div class="card">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 48px; height: 48px; background: var(--gray-100); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--primary);">
              <i class="fas fa-building"></i>
            </div>
            <div>
              <h4 class="card-title" style="margin-bottom: 2px;">${company.name}</h4>
              <span class="badge badge-success">${company.status}</span>
            </div>
          </div>
          <button class="btn btn-outline btn-sm"><i class="fas fa-ellipsis-v"></i></button>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
             <div>
               <label class="form-label" style="font-size: 0.8rem;">Employees</label>
               <div style="font-weight: 600; font-size: 1.1rem;">${company.employees}</div>
             </div>
             <div>
               <label class="form-label" style="font-size: 0.8rem;">Registration</label>
               <div style="font-weight: 500;">${company.registrationNumber}</div>
             </div>
             <div>
               <label class="form-label" style="font-size: 0.8rem;">Tax Ref</label>
               <div style="font-weight: 500;">${company.taxReference}</div>
             </div>
             <div>
               <label class="form-label" style="font-size: 0.8rem;">BEE Level</label>
               <div style="font-weight: 500;">${company.beeLevel || 'N/A'}</div>
             </div>
          </div>

          <div style="background: var(--gray-50); padding: 16px; border-radius: var(--radius-sm);">
            <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Contact Details</div>
            <div style="font-size: 0.9rem; color: var(--gray-600); margin-bottom: 4px;"><i class="fas fa-map-marker-alt" style="width: 20px;"></i> ${company.address}</div>
            <div style="font-size: 0.9rem; color: var(--gray-600);"><i class="fas fa-phone" style="width: 20px;"></i> ${company.contact}</div>
          </div>
        </div>
        <div class="card-body" style="border-top: 1px solid var(--gray-100); display: flex; gap: 12px;">
           <button class="btn btn-outline btn-sm" style="flex: 1;" onclick="Companies.editCompany(${company.id})">Edit Details</button>
           <button class="btn btn-outline btn-sm" style="flex: 1;" onclick="Companies.viewDocuments(${company.id})">Documents</button>
        </div>
      </div>
    `;
  },

  showAddModal: function () {
    const html = `
      <div class="card" style="width: 100%; max-width: 600px; margin: auto;">
        <div class="card-header">
           <h3 class="card-title">Add New Company</h3>
           <button class="btn btn-outline btn-sm" onclick="closeModal('addCompanyModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
           <div class="form-group">
             <label class="form-label">Company Name</label>
             <input type="text" class="form-control" placeholder="Enter company name">
           </div>
           <div class="grid-2">
             <div class="form-group">
               <label class="form-label">Registration Number</label>
               <input type="text" class="form-control" placeholder="YYYY/NNNNNN/NN">
             </div>
             <div class="form-group">
               <label class="form-label">Tax Reference</label>
               <input type="text" class="form-control" placeholder="10 digits">
             </div>
           </div>
           <div class="form-group">
             <label class="form-label">Address</label>
             <textarea class="form-control" rows="3"></textarea>
           </div>
           <button class="btn btn-primary" style="width: 100%;" onclick="closeModal('addCompanyModal'); Toast.show('Company added successfully!', 'success');">Create Company</button>
        </div>
      </div>
    `;
    showModal('addCompanyModal', html);
  },

  editCompany: function (id) {
    const html = `
      <div class="card" style="width: 100%; max-width: 600px; margin: auto;">
         <div class="card-header">
            <h3>Edit Company</h3>
            <button class="btn btn-outline btn-sm" onclick="closeModal('editCompanyModal')"><i class="fas fa-times"></i></button>
         </div>
         <div class="card-body">
            <p>Form to edit company ${id} would go here...</p>
            <button class="btn btn-primary" onclick="closeModal('editCompanyModal')">Save Changes</button>
         </div>
      </div>
    `;
    showModal('editCompanyModal', html);
  }
};

window.renderCompanies = function (container) {
  Companies.render(container);
};
