const Dashboard = {
   render: function (container) {
      const user = window.currentUser || { name: 'User' };
      const employees = window.DB.employees;

      // Calculate Payroll Cost for current period
      const payrollCost = (window.DB.payrollPeriods[0]?.totalNet / 1000000).toFixed(2);

      // Calculate Leave data
      const onLeave = 3; // Mocked active leave count

      const html = `
      <div class="dashboard-wrapper animate-fade-in">
         <!-- Welcome Banner -->
         <div class="welcome-banner">
            <div>
               <h1 class="welcome-title">Good Morning, ${user.name}</h1>
               <p class="welcome-subtitle">Here's what's happening at Acme Corp today.</p>
            </div>
            <div class="date-badge">
               ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
         </div>

         <!-- Key Metrics Grid -->
         <div class="metrics-grid">
            ${this.renderMetricCard('Total Headcount', employees.length, '12% Increase', 'up', 'users', 'primary')}
            ${this.renderMetricCard('Payroll Cost (Jan)', `R ${payrollCost}M`, 'Target: R 4.5M', '', 'wallet', 'success')}
            ${this.renderMetricCard('eNPS Score', '+42', 'Excellent', 'smile', 'heart', 'warning')}
            ${this.renderMetricCard('On Leave Today', onLeave, '3 Returning', '', 'plane-departure', 'danger')}
         </div>

         <!-- Main Content Grid -->
         <div class="dashboard-layout">
            
            <!-- Left Column: Analytics & Quick Actions -->
            <div class="main-column">
               
               <!-- Payroll Trends Chart -->
               <div class="glass-card">
                  <div class="card-header-clean">
                     <h3>Payroll Trends</h3>
                     <select class="clean-select">
                        <option>Last 6 Months</option>
                        <option>Year to Date</option>
                     </select>
                  </div>
                  <div class="chart-container-lg">
                     <canvas id="payrollTrendChart"></canvas>
                  </div>
               </div>

               <!-- Quick Actions Hub -->
               <div class="glass-card">
                  <div class="card-header-clean"><h3>Quick Actions</h3></div>
                  <div class="action-grid">
                     <button class="action-card" onclick="window.loadPage('payroll')">
                        <div class="icon-box icon-primary"><i class="fas fa-bolt"></i></div>
                        <span>Run Payroll</span>
                     </button>
                     <button class="action-card" onclick="window.loadPage('employees'); setTimeout(Employees.showAddModal, 500);">
                        <div class="icon-box icon-info"><i class="fas fa-user-plus"></i></div>
                        <span>Add Hire</span>
                     </button>
                     <button class="action-card" onclick="window.loadPage('leave')">
                        <div class="icon-box icon-warning"><i class="fas fa-calendar-check"></i></div>
                        <span>Leave Request</span>
                     </button>
                     <button class="action-card" onclick="window.loadPage('reports')">
                        <div class="icon-box icon-success"><i class="fas fa-file-export"></i></div>
                        <span>Export Report</span>
                     </button>
                  </div>
               </div>

            </div>

            <!-- Right Column: Distribution & Feed -->
            <div class="side-column">
               
               <!-- Department Distribution -->
               <div class="glass-card">
                  <div class="card-header-clean"><h3>Workforce by Dept</h3></div>
                  <div class="chart-container-sm">
                     <canvas id="deptDistChart"></canvas>
                  </div>
               </div>

               <!-- Activity Feed -->
               <div class="glass-card">
                  <div class="card-header-clean">
                     <h3>Pending Tasks</h3>
                     <span class="badge-count">3</span>
                  </div>
                  <div class="task-list">
                     ${this.renderTaskItem('Thabo Mokoena', 'Annual Leave (5 days)', 'plane', 'warning')}
                     ${this.renderTaskItem('Sarah Van der Merwe', 'Expense Claim (R450)', 'file-invoice-dollar', 'info')}
                     ${this.renderTaskItem('Michael Chen', 'Security Training', 'signature', 'success')}
                  </div>
               </div>

            </div>
         </div>
      </div>
      `;
      container.innerHTML = html;
      this.renderCharts();
   },

   renderMetricCard: function (label, value, subtext, trendIcon, icon, color) {
      return `
       <div class="glass-card metric-card">
          <div class="metric-content">
             <span class="metric-label">${label}</span>
             <h2 class="metric-value">${value}</h2>
             <div class="metric-footer">
                ${trendIcon ? `<i class="fas fa-${trendIcon}"></i>` : ''} ${subtext}
             </div>
          </div>
          <div class="metric-icon icon-${color}">
             <i class="fas fa-${icon}"></i>
          </div>
       </div>
       `;
   },

   renderTaskItem: function (title, subtitle, icon, color) {
      return `
       <div class="task-item">
          <div class="task-icon bg-${color}-soft text-${color}">
             <i class="fas fa-${icon}"></i>
          </div>
          <div class="task-info">
             <div class="task-title">${title}</div>
             <div class="task-subtitle">${subtitle}</div>
          </div>
          <button class="btn-icon-sm"><i class="fas fa-chevron-right"></i></button>
       </div>
       `;
   },

   renderCharts: function () {
      // Clean Chart Config
      Chart.defaults.font.family = "'Inter', sans-serif";
      Chart.defaults.color = '#64748b';

      const ctx1 = document.getElementById('payrollTrendChart').getContext('2d');
      new Chart(ctx1, {
         type: 'bar',
         data: {
            labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
            datasets: [{
               label: 'Net Payroll',
               data: [3100000, 3150000, 3120000, 3250000, 3800000, 3189030],
               backgroundColor: '#4f46e5',
               borderRadius: 6,
               barThickness: 32
            }]
         },
         options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
               y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#f1f5f9' } },
               x: { grid: { display: false } }
            }
         }
      });

      const ctx2 = document.getElementById('deptDistChart').getContext('2d');
      new Chart(ctx2, {
         type: 'doughnut',
         data: {
            labels: ['IT', 'Finance', 'HR', 'Ops'],
            datasets: [{
               data: [45, 25, 10, 20],
               backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899'],
               borderWidth: 0
            }]
         },
         options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
               legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
            }
         }
      });
   }
};

window.renderDashboard = function (container) {
   Dashboard.render(container);
};
