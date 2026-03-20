const Dashboard = {
   selectedCompany: null, // Track selected company filter

   render: function (container, companyFilter = null) {
      this.selectedCompany = companyFilter;
      const user = window.currentUser || { name: 'User' };

      // Filter employees by company if filter is active
      let employees = window.DB.employees;
      if (companyFilter) {
         employees = employees.filter(e => e.companyName === companyFilter);
      }

      // Calculate Payroll Cost for current period (filtered)
      let payrollCost = 0;
      let trendData = [0, 0, 0, 0, 0, 0];
      const now = new Date();
      const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'short' });

      if (window.DB.payrollRuns && window.DB.payrollRuns.length > 0) {
         let runs = window.DB.payrollRuns.filter(r => ['Approved', 'Finalized', 'Pending Approval'].includes(r.status));
         if (companyFilter) {
            runs = runs.filter(r => r.company === companyFilter);
         }

         // Current month cost
         const currentPeriod = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
         const currentRuns = runs.filter(r => r.period === currentPeriod);
         const totalMonthlyNet = currentRuns.reduce((sum, r) => sum + (r.totalNet || 0), 0);
         payrollCost = (totalMonthlyNet / 1000).toFixed(1) + "k"; // Display in thousandths for better fit

         // Trend data (last 6 months)
         const monthLabels = [];
         for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            monthLabels.push(d.toLocaleDateString('en-US', { month: 'short' }));

            const monthRun = runs.find(r => r.period === label);
            trendData[5 - i] = monthRun ? monthRun.totalNet : 0;
         }
         this.lastLabels = monthLabels;
      } else {
         payrollCost = "0.0";
         this.lastLabels = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
      }

      // Calculate Leave data
      const onLeave = 3; // Mocked active leave count

      // Company selector options
      const companyOptions = window.DB.companies.map(c =>
         `<option value="${c.name}" ${companyFilter === c.name ? 'selected' : ''}>${c.name}</option>`
      ).join('');

      // 10% Size Reduction applied via transform
      const html = `
      <div class="dashboard-wrapper animate-fade-in" style="transform: scale(0.9); transform-origin: top left; width: 111.11%; margin-bottom: -10%;">
         <!-- Welcome Banner with Company Filter -->
         <div class="welcome-banner">
            <div>
               <h1 class="welcome-title">Good Morning, ${user.name}</h1>
               <p class="welcome-subtitle">Here's what's happening ${companyFilter ? `at ${companyFilter}` : 'across all companies'} today.</p>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
               <div>
                  <label style="font-size: 0.7rem; color: var(--gray-500); display: block; margin-bottom: 4px;">Filter by Company</label>
                  <select class="clean-select" onchange="Dashboard.filterByCompany(this.value)" style="min-width: 180px;">
                     <option value="">All Companies</option>
                     ${companyOptions}
                  </select>
               </div>
               <div class="date-badge">
                  ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
               </div>
            </div>
         </div>

         <!-- Key Metrics Grid -->
         <div class="metrics-grid">
            ${this.renderMetricCard('Total Headcount', employees.length, 'Active Employees', 'users', 'users', 'primary')}
            ${this.renderMetricCard(`Payroll Cost (${currentMonthLabel})`, `R ${payrollCost}`, 'Latest Run', 'wallet', 'wallet', 'success')}
            ${this.renderMetricCard('eNPS Score', '+42', 'Excellent', 'smile', 'heart', 'warning')}
            ${this.renderMetricCard('On Leave Today', onLeave, '3 Returning', '', 'plane-departure', 'danger')}
         </div>

         <!-- Main Content Grid -->
         <div class="dashboard-layout">
            
            <!-- Left Column: Analytics & Quick Actions -->
            <div class="main-column">
               
               <!-- Payroll Trends Chart -->
               <div class="card">
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
               <div class="card">
                  <div class="card-header-clean"><h3>Quick Actions</h3></div>
                  <div class="action-grid">
                     <button class="action-card" onclick="window.loadPage('payroll')">
                        <div class="icon-box icon-primary"><i class="fas fa-bolt"></i></div>
                        <span>Run Payroll</span>
                     </button>
                     <button class="action-card" onclick="window.loadPage('employees'); setTimeout(() => Employees.showAddWizard(), 500);">
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
               <div class="card">
                  <div class="card-header-clean"><h3>Workforce by Dept</h3></div>
                  <div class="chart-container-sm">
                     <canvas id="deptDistChart"></canvas>
                  </div>
               </div>

               <!-- Activity Feed -->
               <div class="card">
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
      this.renderCharts(employees, trendData);
   },

   renderMetricCard: function (label, value, subtext, trendIcon, icon, color) {
      return `
       <div class="card metric-card">
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

   renderCharts: function (employees, trendData) {
      // Safety check for Chart.js
      if (typeof Chart === 'undefined') {
         console.warn('Chart.js not loaded yet. Retrying in 500ms...');
         setTimeout(() => this.renderCharts(employees, trendData), 500);
         return;
      }

      // Calculate Department Distribution
      const deptCounts = {};
      employees.forEach(e => {
         const dept = e.department || 'Other';
         deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      const deptLabels = Object.keys(deptCounts);
      const deptData = Object.values(deptCounts);

      // Default to empty chart if no data
      if (deptLabels.length === 0) {
         deptLabels.push('No Data');
         deptData.push(1);
      }

      // Ensure DOM is ready
      requestAnimationFrame(() => {
         ChartManager.createChart('payrollTrendChart', {
            type: 'bar',
            data: {
               labels: this.lastLabels || ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
               datasets: [{
                  label: 'Net Payroll',
                  data: trendData.length ? trendData : [0, 0, 0, 0, 0, 0],
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
                  y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#f1f5f9' }, ticks: { callback: function (value) { return 'R ' + (value / 1000).toFixed(0) + 'k'; } } },
                  x: { grid: { display: false } }
               }
            }
         });

         ChartManager.createChart('deptDistChart', {
            type: 'doughnut',
            data: {
               labels: deptLabels,
               datasets: [{
                  data: deptData,
                  backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#8b5cf6'],
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
      });
   }
};

window.renderDashboard = function (container) {
   Dashboard.render(container);
};

Dashboard.filterByCompany = function (companyName) {
   const container = document.getElementById('content');
   if (container) {
      this.render(container, companyName || null);
   }
};
