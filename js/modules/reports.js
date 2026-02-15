const Reports = {
   render: function (container) {
      const html = `
      <div class="page-title-box">
        <h2>Reports</h2>
        <button class="btn btn-outline btn-sm"><i class="fas fa-download"></i> Export</button>
      </div>

      <div class="grid-2">
         <div class="card">
            <div class="card-header"><h4>Headcount</h4></div>
            <div class="card-body" style="height: 300px; position: relative;">
               <canvas id="deptChart"></canvas>
            </div>
         </div>
         <div class="card">
            <div class="card-header"><h4>Payroll Cost</h4></div>
            <div class="card-body" style="height: 300px; position: relative;">
               <canvas id="payrollChart"></canvas>
            </div>
         </div>
      </div>
    `;
      container.innerHTML = html;

      // Defer chart rendering slightly to allow DOM to update
      setTimeout(this.renderCharts, 100);
   },

   renderCharts: function () {
      if (typeof Chart === 'undefined') return;

      // Destroy existing charts if any to prevent canvas reuse error
      if (window.deptChartInstance) window.deptChartInstance.destroy();
      if (window.payrollChartInstance) window.payrollChartInstance.destroy();

      const ctx1 = document.getElementById('deptChart');
      if (ctx1) {
         window.deptChartInstance = new Chart(ctx1, {
            type: 'doughnut',
            data: {
               labels: ['IT', 'Finance', 'HR', 'Ops'],
               datasets: [{
                  data: [15, 8, 5, 20],
                  backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444']
               }]
            },
            options: { responsive: true, maintainAspectRatio: false }
         });
      }

      const ctx2 = document.getElementById('payrollChart');
      if (ctx2) {
         window.payrollChartInstance = new Chart(ctx2, {
            type: 'bar',
            data: {
               labels: ['Oct', 'Nov', 'Dec', 'Jan'],
               datasets: [{
                  label: 'Cost (ZAR)',
                  data: [4.1, 4.2, 4.2, 4.25],
                  backgroundColor: '#4f46e5',
                  borderRadius: 4
               }]
            },
            options: { responsive: true, maintainAspectRatio: false }
         });
      }
   }
};

window.renderReports = function (container) {
   Reports.render(container);
};
