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
      let trendData = []; // Store calculated trends

      // Calculate real payroll data if available
      if (window.DB.payrollRuns && window.DB.payrollRuns.length > 0) {
         let runs = window.DB.payrollRuns.filter(r => r.status === 'Finalized');
         if (companyFilter) {
            runs = runs.filter(r => r.company === companyFilter);
         }

         if (runs.length > 0) {
            // Sum for current metric (simplified: take the latest run)
            // In a real app we'd group by month. Here we just take the last run's total.
            const lastRun = runs[runs.length - 1];
            payrollCost = (lastRun.totalNet / 1000000).toFixed(2);

            // Generate trend data from runs (mocking history based on current if sparse)
            // If we have only 1 run, we mock the history variation
            const baseVal = lastRun.totalNet;
            trendData = [
               baseVal * 0.9, baseVal * 0.92, baseVal * 0.95,
               baseVal * 1.1, baseVal * 0.88, baseVal
            ];
         } else {
            // No runs for this company
            payrollCost = "0.00";
            trendData = [0, 0, 0, 0, 0, 0];
         }
      } else {
         // Fallback if no runs exist at all
         payrollCost = "0.00";
         trendData = [0, 0, 0, 0, 0, 0];
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
            ${this.renderMetricCard('Payroll Cost (Jan)', `R ${payrollCost}M`, 'Latest Run', 'wallet', 'wallet', 'success')}
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
      this.renderCharts(employees, trendData);
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
         const ctx1 = document.getElementById('payrollTrendChart')?.getContext('2d');
         const ctx2 = document.getElementById('deptDistChart')?.getContext('2d');

         if (!ctx1 || !ctx2) return; // Canvas not found (navigated away?)

         // Clean Chart Config
         Chart.defaults.font.family = "'Inter', sans-serif";
         Chart.defaults.color = '#64748b';

         // Destroy existing charts if they exist to prevent "Canvas is already in use" errors
         if (window.payrollChart1) window.payrollChart1.destroy();
         if (window.payrollChart2) window.payrollChart2.destroy();

         window.payrollChart1 = new Chart(ctx1, {
            type: 'bar',
            data: {
               labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
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

         window.payrollChart2 = new Chart(ctx2, {
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
