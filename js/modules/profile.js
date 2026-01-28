const Profile = {
  render: function (container) {
    const user = window.currentUser;
    const employee = window.currentEmployee || {};

    const html = `
      <div class="card" style="border: none; background: transparent; box-shadow: none; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          <div class="avatar avatar-xl" style="background: white; border: 4px solid white; box-shadow: var(--shadow-md); font-size: 2.5rem; display: flex; align-items: center; justify-content: center; color: var(--primary);">
             ${(employee.firstName || user.name).charAt(0)}
          </div>
          <div style="flex: 1;">
            <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--gray-900); letter-spacing: -0.5px; margin-bottom: 4px;">${employee.firstName || user.name} ${employee.lastName || ''}</h2>
            <div style="color: var(--gray-500); font-size: 1rem;">${employee.position || user.role} &bull; ${employee.department || 'General'}</div>
          </div>
          <div>
             <button class="btn btn-primary btn-sm" onclick="Profile.editProfile()">Edit Profile</button>
          </div>
        </div>
      </div>

      <div class="tabs" style="margin-bottom: 20px; border-bottom: 1px solid var(--gray-200);">
        <button class="tab-btn active" onclick="Profile.switchTab('personal')">Personal</button>
        <button class="tab-btn" onclick="Profile.switchTab('banking')">Banking & Tax</button>
        <button class="tab-btn" onclick="Profile.switchTab('documents')">Documents</button>
        <button class="tab-btn" onclick="Profile.switchTab('performance')">Performance</button>
        <button class="tab-btn" onclick="Profile.switchTab('skills')">Skills</button>
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
    const employee = window.currentEmployee || {};

    switch (tabName) {
      case 'personal': container.innerHTML = this.renderPersonalTab(employee); break;
      case 'banking': container.innerHTML = this.renderBankingTab(employee); break;
      case 'documents': container.innerHTML = this.renderDocumentsTab(employee); break;
      case 'performance': container.innerHTML = this.renderPerformanceTab(employee); break;
      case 'skills': container.innerHTML = this.renderSkillsTab(employee); break;
    }
  },

  renderPersonalTab: function (emp) {
    return `
      <div class="card">
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

  renderDocumentsTab: function (emp) {
    return `<div class="card"><div class="card-body text-center text-muted">Document list placeholder</div></div>`;
  },

  renderPerformanceTab: function (emp) {
    return `<div class="card"><div class="card-body text-center text-muted">Performance history placeholder</div></div>`;
  },

  renderSkillsTab: function (emp) {
    return `<div class="card"><div class="card-body text-center text-muted">Skills matrix placeholder</div></div>`;
  },

  infoRow: function (label, value) {
    return `
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 0.8rem; color: var(--gray-500); margin-bottom: 2px;">${label}</label>
        <div style="font-weight: 500; color: var(--gray-900);">${value || '-'}</div>
      </div>
    `;
  },

  editProfile: function () {
    window.showModal('editProfileModal', `<div class="card" style="padding: 20px;"><h3>Edit Profile</h3><p>Edit form stub</p><button class="btn btn-primary" onclick="closeModal('editProfileModal')">Close</button></div>`);
  }
};

window.renderProfile = function (container) {
  Profile.render(container);
};