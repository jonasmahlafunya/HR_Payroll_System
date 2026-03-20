
const Analytics = {
  render: function (container) {
    const emps = window.DB.employees;
    const active = emps.filter(e => e.status === 'Active');
    const terminated = emps.filter(e => e.status === 'Terminated');
    const avgSalary = active.length > 0 ? active.reduce((s, e) => s + (e.basicSalary || 0), 0) / active.length : 0;
    const turnover = emps.length > 0 ? (terminated.length / emps.length * 100).toFixed(1) : 0;

    // Salary distribution bands
    const bands = { '< R10k': 0, 'R10k–30k': 0, 'R30k–50k': 0, 'R50k–100k': 0, '> R100k': 0 };
    active.forEach(e => {
      const s = e.basicSalary || 0;
      if (s < 10000) bands['< R10k']++;
      else if (s < 30000) bands['R10k–30k']++;
      else if (s < 50000) bands['R30k–50k']++;
      else if (s < 100000) bands['R50k–100k']++;
      else bands['> R100k']++;
    });

    container.innerHTML = `
      <div class="page-title-box" style="margin-bottom:24px;">
        <h2><i class="fas fa-brain"></i> Advanced Analytics</h2>
        <div style="color:var(--gray-500)">Real-time workforce intelligence</div>
      </div>

      <div class="grid-4" style="margin-bottom:24px;">
        <div class="kpi-card" style="border-left:4px solid var(--primary)">
          <div class="kpi-label">Headcount</div>
          <div class="kpi-value">${active.length}</div>
          <div style="font-size:0.75rem;color:var(--gray-500)">${terminated.length} terminated</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid var(--success)">
          <div class="kpi-label">Avg Salary</div>
          <div class="kpi-value" style="font-size:1.1rem">${window.formatCurrency(avgSalary)}</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid var(--danger)">
          <div class="kpi-label">Turnover Rate</div>
          <div class="kpi-value">${turnover}%</div>
        </div>
        <div class="kpi-card" style="border-left:4px solid var(--warning)">
          <div class="kpi-label">Monthly Payroll</div>
          <div class="kpi-value" style="font-size:1rem">${window.formatCurrency(active.reduce((s, e) => s + (e.basicSalary || 0), 0))}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:24px;">
        <div class="card">
          <div class="card-header"><h4>Salary Distribution</h4></div>
          <div class="card-body">
            ${Object.entries(bands).map(([band, count]) => `
              <div style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.82rem;">
                  <span>${band}</span><span style="font-weight:600">${count} employees</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${active.length > 0 ? (count / active.length * 100) : 0}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h4>Department Cost Share</h4></div>
          <div class="card-body">
            ${(() => {
              const costs = {};
              active.forEach(e => { costs[e.department || 'Other'] = (costs[e.department || 'Other'] || 0) + (e.basicSalary || 0); });
              const total = Object.values(costs).reduce((s, c) => s + c, 0);
              const colors = ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)'];
              return Object.entries(costs).map(([dept, cost], i) => `
                <div style="margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:0.82rem;">
                    <span>${dept}</span><span style="font-weight:600">${total>0?(cost/total*100).toFixed(0):0}% — ${window.formatCurrency(cost)}</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${total>0?(cost/total*100):0}%;background:${colors[i % colors.length]};"></div>
                  </div>
                </div>
              `).join('');
            })()}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h4>Payroll Runs Summary</h4></div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Period</th><th>Company</th><th>Employees</th><th class="text-right">Total Gross</th><th class="text-right">Total PAYE</th><th class="text-right">Total Net</th><th>Status</th></tr></thead>
            <tbody>
              ${(window.DB.payrollRuns || []).slice(0, 10).map(r => `<tr>
                <td>${r.period}</td>
                <td>${r.company}</td>
                <td>${r.employeeCount}</td>
                <td class="text-right">${window.formatCurrency(r.totalGross || 0)}</td>
                <td class="text-right text-danger">${window.formatCurrency(r.totalPAYE || 0)}</td>
                <td class="text-right" style="font-weight:600;color:var(--success)">${window.formatCurrency(r.totalNet || 0)}</td>
                <td><span class="badge badge-${r.status === 'Finalized' ? 'success' : 'warning'}">${r.status}</span></td>
              </tr>`).join('') || '<tr><td colspan="7" class="text-center" style="padding:20px;color:var(--gray-500)">No payroll runs found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};

window.renderAnalytics = function (container) { Analytics.render(container); };
