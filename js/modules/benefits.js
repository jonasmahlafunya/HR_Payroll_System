const Benefits = {
  render: function (container) {
    const html = `
      <div class="page-title-box">
        <h2>Benefits Management</h2>
        <div style="color: var(--gray-500);">Manage Medical Aid, Pension/Provident Funds, and Risk Benefits</div>
      </div>

      <div class="grid-3" style="margin-bottom: 24px;">
        ${this.benefitCard("Medical Aid", "Discovery Health", "85 Employees", "fas fa-heartbeat", "success")}
        ${this.benefitCard("Pension Fund", "Allan Gray", "120 Employees", "fas fa-piggy-bank", "primary")}
        ${this.benefitCard("Group Life", "Old Mutual", "125 Employees", "fas fa-umbrella", "info")}
      </div>

      <div class="card">
        <div class="card-header">
           <h4 class="card-title">Employee Benefits Enrollment</h4>
           <div class="search-box">
             <input type="text" class="search-input" placeholder="Search...">
           </div>
        </div>
        <div class="table-responsive">
          <table>
             <thead>
               <tr>
                 <th>Employee</th>
                 <th>Medical Scheme</th>
                 <th>Members</th>
                 <th>Pension Fund</th>
                 <th>Risk Cover</th>
                 <th>Actions</th>
               </tr>
             </thead>
             <tbody>
               ${window.DB.employees.map(emp => `
                 <tr>
                   <td>${emp.firstName} ${emp.lastName}</td>
                   <td>${emp.benefits?.medicalAid || 'Not Enrolled'}</td>
                   <td>${emp.benefits?.medicalMembers || '-'}</td>
                   <td>${emp.benefits?.pensionFund || 'Not Enrolled'} (${emp.benefits?.pensionPercent || 0}%)</td>
                   <td><span class="badge badge-success">Active</span></td>
                   <td><button class="btn btn-sm btn-outline">Edit</button></td>
                 </tr>
               `).join('')}
             </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
  },

  benefitCard: function (title, provider, stats, icon, color) {
    return `
      <div class="card">
        <div class="card-body">
           <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
             <div style="width: 50px; height: 50px; background: var(--gray-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;" class="text-${color}">
               <i class="${icon}"></i>
             </div>
             <div>
               <h4 style="margin: 0;">${title}</h4>
               <div style="color: var(--gray-500);">${provider}</div>
             </div>
           </div>
           <div style="font-size: 0.9rem; font-weight: 500;">${stats}</div>
           <div class="progress-bar" style="margin-top: 8px;">
             <div class="progress-fill" style="width: 75%;"></div>
           </div>
        </div>
      </div>
    `;
  }
};

window.renderBenefits = function (container) {
  Benefits.render(container);
};
