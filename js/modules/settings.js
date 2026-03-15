const Settings = {
   render: function (container) {
      if (!window.DB.settings) {
         window.DB.settings = {
            companyName: "Acme Corp SA",
            primaryColor: "#4f46e5",
            timezone: "Africa/Johannesburg (GMT+2)",
            notifications: { email: true, sms: true, inApp: true }
         };
      }

      const html = `
      <div class="page-title-box">
        <h2>System Administration</h2>
        <div style="color: var(--gray-500);">Advanced configuration and controls</div>
      </div>

      <div class="tabs" style="margin-bottom: 24px; border-bottom: 1px solid var(--gray-200);">
        <button class="tab-btn active" onclick="Settings.switchTab('general')"><i class="fas fa-building"></i> Company</button>
        <button class="tab-btn" onclick="Settings.switchTab('users')"><i class="fas fa-users-cog"></i> Users & Roles</button>
        <button class="tab-btn" onclick="Settings.switchTab('payroll')"><i class="fas fa-money-check-alt"></i> Payroll Config</button>
        <button class="tab-btn" onclick="Settings.switchTab('workflows')"><i class="fas fa-project-diagram"></i> Workflows</button>
        <button class="tab-btn" onclick="Settings.switchTab('logs')"><i class="fas fa-history"></i> System Logs</button>
        <button class="tab-btn" onclick="Settings.switchTab('integrations')"><i class="fas fa-plug"></i> Integrations</button>
      </div>

      <div id="settingsContent">
        ${this.renderGeneralTab()}
      </div>
    `;
      container.innerHTML = html;
   },

   switchTab: function (tabName) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      event.currentTarget.classList.add('active');

      const container = document.getElementById('settingsContent');
      switch (tabName) {
         case 'general': container.innerHTML = this.renderGeneralTab(); break;
         case 'users': container.innerHTML = this.renderUsersTab(); break;
         case 'payroll': container.innerHTML = this.renderPayrollConfigTab(); break;
         case 'workflows': container.innerHTML = this.renderWorkflowsTab(); break;
         case 'logs': container.innerHTML = this.renderLogsTab(); break;
         case 'integrations': container.innerHTML = this.renderIntegrationsTab(); break;
      }
   },

   // --- 1. Company Tab ---
   renderGeneralTab: function () {
      const s = window.DB.settings;
      return `
      <div class="card">
         <div class="card-header">
            <h4>Branding & Details</h4>
            <button class="btn btn-sm btn-primary" onclick="Settings.saveGeneral()">Save Changes</button>
         </div>
         <div class="card-body">
            <div class="grid-2">
               <div class="form-group">
                  <label class="form-label">Company Name</label>
                  <input type="text" id="set_companyName" class="form-control" value="${s.companyName}">
               </div>
               <div class="form-group">
                  <label class="form-label">Primary Color</label>
                  <input type="color" id="set_primaryColor" class="form-control" style="height: 40px;" value="${s.primaryColor}">
               </div>
            </div>
         </div>
      </div>

      <div class="grid-2">
         <div class="card">
             <div class="card-header"><h4>Departments</h4><button class="btn btn-sm btn-outline"><i class="fas fa-plus"></i></button></div>
             <div class="card-body" style="padding: 0;">
                <table style="width: 100%;">
                   <tr style="background: var(--gray-50);"><th style="padding: 8px 16px;">Name</th><th style="padding: 8px 16px;">Code</th></tr>
                   ${window.DB.departments.map(d => `
                      <tr><td style="padding: 12px 16px;">${d.name}</td><td style="padding: 12px 16px;"><code>${d.code}</code></td></tr>
                   `).join('')}
                </table>
             </div>
         </div>
         <div class="card">
             <div class="card-header"><h4>Locations</h4><button class="btn btn-sm btn-outline"><i class="fas fa-plus"></i></button></div>
             <div class="card-body" style="padding: 0;">
                <table style="width: 100%;">
                   <tr style="background: var(--gray-50);"><th style="padding: 8px 16px;">Name</th><th style="padding: 8px 16px;">Type</th></tr>
                   ${window.DB.locations.map(d => `
                      <tr><td style="padding: 12px 16px;">${d.name}</td><td style="padding: 12px 16px;">${d.type}</td></tr>
                   `).join('')}
                </table>
             </div>
         </div>
      </div>
    `;
   },

   saveGeneral: function () {
      const newName = document.getElementById('set_companyName').value;
      const newColor = document.getElementById('set_primaryColor').value;

      window.DB.settings.companyName = newName;
      window.DB.settings.primaryColor = newColor;

      // Create log
      window.DB.systemLogs.unshift({
         id: Date.now(),
         timestamp: new Date().toLocaleString(),
         user: "Admin User",
         action: "Updated Settings",
         module: "System",
         details: "Updated Company Name/Color"
      });

      window.DB.save();
      document.documentElement.style.setProperty('--primary', newColor);
      Toast.show('Settings saved successfully!', 'success');
   },

   // --- 2. Users Tab ---
   renderUsersTab: function () {
      return `
         <div class="card">
            <div class="card-header">
               <h4>System Users</h4>
               <button class="btn btn-primary" onclick="Toast.show('Feature coming soon')">Add User</button>
            </div>
            <div class="table-responsive">
               <table>
                  <thead>
                     <tr><th>User</th><th>Role</th><th>Email</th><th>Last Login</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                     ${window.DB.users.map(u => `
                        <tr>
                           <td>
                              <div style="font-weight: 500;">${u.name}</div>
                              <div style="font-size: 0.8rem; color: var(--gray-500);">@${u.username}</div>
                           </td>
                           <td><span class="badge badge-info">${u.role}</span></td>
                           <td>${u.email}</td>
                           <td>${u.lastLogin}</td>
                           <td><span class="badge badge-success">${u.status}</span></td>
                           <td><button class="btn btn-sm btn-outline">Edit</button></td>
                        </tr>
                     `).join('')}
                  </tbody>
               </table>
            </div>
         </div>

         <div class="card">
            <div class="card-header"><h4>Roles & Permissions</h4></div>
            <div class="table-responsive">
               <table>
                  <thead><tr><th>Role Name</th><th>Description</th><th>Permissions</th></tr></thead>
                  <tbody>
                     ${window.DB.roles.map(r => `
                        <tr>
                           <td><strong>${r.name}</strong></td>
                           <td>${r.description}</td>
                           <td><code style="font-size: 0.8rem;">${r.permissions.join(', ')}</code></td>
                        </tr>
                     `).join('')}
                  </tbody>
               </table>
            </div>
         </div>
       `;
   },

   // --- 3. Payroll Config Tab ---
   renderPayrollConfigTab: function () {
      return `
         <div class="card">
            <div class="card-header"><h4>SARS Tax Tables (2025)</h4> <button class="btn btn-sm btn-outline">Update Tables</button></div>
            <div class="table-responsive">
               <table>
                  <thead><tr><th>Bracket (Min - Max)</th><th>Rate</th><th>Rebate</th></tr></thead>
                  <tbody>
                     ${window.DB.taxTables.map(t => `
                        <tr>
                           <td>R ${t.min.toLocaleString()} - R ${t.max.toLocaleString()}</td>
                           <td>${(t.rate * 100).toFixed(0)}%</td>
                           <td>R ${t.rebate.toLocaleString()}</td>
                        </tr>
                     `).join('')}
                  </tbody>
               </table>
            </div>
         </div>
         
         <div class="grid-2">
            <div class="card">
               <div class="card-header"><h4>Allowances</h4></div>
               <div class="card-body">
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                     <span class="badge badge-primary">Travel</span>
                     <span class="badge badge-primary">Housing</span>
                     <span class="badge badge-primary">Communication</span>
                     <span class="badge badge-primary">Tool</span>
                     <button class="btn btn-xs btn-outline">+</button>
                  </div>
               </div>
            </div>
            <div class="card">
               <div class="card-header"><h4>Deductions</h4></div>
               <div class="card-body">
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                     <span class="badge badge-warning">Medical Aid</span>
                     <span class="badge badge-warning">Pension Fund</span>
                     <span class="badge badge-warning">Garnishee</span>
                     <span class="badge badge-warning">Study Loan</span>
                     <button class="btn btn-xs btn-outline">+</button>
                  </div>
               </div>
            </div>
         </div>
       `;
   },

   // --- 4. Workflows Tab ---
   renderWorkflowsTab: function () {
      return `
         <div class="card">
            <div class="card-header"><h4>Approval Workflows</h4> <button class="btn btn-primary">Create New Rule</button></div>
            <div class="table-responsive">
               <table>
                  <thead><tr><th>Rule Name</th><th>Trigger</th><th>Condition</th><th>Action</th><th>Status</th></tr></thead>
                  <tbody>
                     ${window.DB.workflowRules.map(w => `
                        <tr>
                           <td style="font-weight: 500;">${w.name}</td>
                           <td>${w.trigger}</td>
                           <td><code>${w.condition}</code></td>
                           <td>${w.action}</td>
                           <td>
                              <label class="switch">
                                 <input type="checkbox" ${w.status === 'Active' ? 'checked' : ''}>
                                 <span class="slider round"></span>
                              </label>
                           </td>
                        </tr>
                     `).join('')}
                  </tbody>
               </table>
            </div>
         </div>
         
         <div class="card">
            <div class="card-header"><h4>Email Templates</h4></div>
            <div class="card-body">
               <div class="grid-3">
                  <div style="border: 1px solid var(--gray-200); padding: 12px; border-radius: 8px;">
                     <strong>Welcome Email</strong>
                     <div style="font-size: 0.8rem; color: var(--gray-500); margin-top: 4px;">Sent to new hires</div>
                  </div>
                  <div style="border: 1px solid var(--gray-200); padding: 12px; border-radius: 8px;">
                     <strong>Payslip Notification</strong>
                     <div style="font-size: 0.8rem; color: var(--gray-500); margin-top: 4px;">Sent monthly</div>
                  </div>
                  <div style="border: 1px solid var(--gray-200); padding: 12px; border-radius: 8px;">
                     <strong>Leave Approval</strong>
                     <div style="font-size: 0.8rem; color: var(--gray-500); margin-top: 4px;">Sent to manager</div>
                  </div>
               </div>
            </div>
         </div>
       `;
   },

   // --- 5. System Logs Tab ---
   renderLogsTab: function () {
      return `
         <div class="card">
            <div class="card-header">
               <h4>Audit Trail</h4>
               <button class="btn btn-outline btn-sm" onclick="Toast.show('Exporting CSV...')">Export CSV</button>
            </div>
            <div class="table-responsive">
               <table>
                  <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Module</th><th>Details</th></tr></thead>
                  <tbody>
                     ${window.DB.systemLogs.map(l => `
                        <tr>
                           <td style="color: var(--gray-600); font-size: 0.85rem;">${l.timestamp}</td>
                           <td>${l.user}</td>
                           <td><span style="font-weight: 600;">${l.action}</span></td>
                           <td><span class="badge badge-info">${l.module}</span></td>
                           <td style="color: var(--gray-600);">${l.details}</td>
                        </tr>
                     `).join('')}
                  </tbody>
               </table>
            </div>
         </div>
       `;
   },

   renderIntegrationsTab: function () {
      return `
      <div class="card">
         <div class="card-header"><h4>Connected Services</h4></div>
         <div class="card-body">
            <div style="display: flex; gap: 20px; border: 1px solid var(--gray-200); padding: 20px; border-radius: 8px; margin-bottom: 16px; align-items: center;">
               <div style="width: 48px; height: 48px; background: #9acd32; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">QB</div>
               <div style="flex: 1;">
                  <h4 style="margin-bottom: 4px;">QuickBooks Online</h4>
                  <div style="font-size: 0.85rem; color: var(--success);">Connected &bull; Last sync: 10 mins ago</div>
               </div>
               <button class="btn btn-outline btn-sm">Configure</button>
            </div>

            <div style="display: flex; gap: 20px; border: 1px solid var(--gray-200); padding: 20px; border-radius: 8px; margin-bottom: 16px; align-items: center;">
               <div style="width: 48px; height: 48px; background: #0077b5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;"><i class="fab fa-linkedin"></i></div>
               <div style="flex: 1;">
                  <h4 style="margin-bottom: 4px;">LinkedIn Recruiter</h4>
                  <div style="font-size: 0.85rem; color: var(--gray-500);">Not connected</div>
               </div>
               <button class="btn btn-primary btn-sm">Connect</button>
            </div>
         </div>
      </div>
    `;
   }
};

window.renderSettings = function (container) {
   Settings.render(container);
};
