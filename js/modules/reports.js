
const Reports = {
  render: function (container) {
    container.innerHTML = `
      <div class="page-title-box">
        <h2><i class="fas fa-chart-bar"></i> Reports & Analytics</h2>
        <div style="color:var(--gray-500)">Live data from payroll runs and employee records</div>
      </div>

      <div class="tabs" style="margin-bottom:24px;border-bottom:1px solid var(--gray-200);">
        <button class="tab-btn active" onclick="Reports.switchTab('overview', event)"><i class="fas fa-home"></i> Overview</button>
        <button class="tab-btn" onclick="Reports.switchTab('variance', event)"><i class="fas fa-chart-line"></i> Variance Analysis</button>
        <button class="tab-btn" onclick="Reports.switchTab('eea', event)"><i class="fas fa-users"></i> EEA</button>
        <button class="tab-btn" onclick="Reports.switchTab('wsp', event)"><i class="fas fa-graduation-cap"></i> WSP / ATR</button>
        <button class="tab-btn" onclick="Reports.switchTab('costcentre', event)"><i class="fas fa-chart-pie"></i> Cost Centre</button>
        <button class="tab-btn" onclick="Reports.switchTab('ytd', event)"><i class="fas fa-calendar"></i> YTD Recon</button>
        <button class="tab-btn" onclick="Reports.switchTab('headcount', event)"><i class="fas fa-people-arrows"></i> Headcount</button>
      </div>

      <div id="reportContent">${this.renderOverview()}</div>
    `;
    setTimeout(() => this.renderOverviewCharts(), 100);
  },

  switchTab: function (tab, event) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event?.currentTarget) event.currentTarget.classList.add('active');
    const map = {
      overview: () => { document.getElementById('reportContent').innerHTML = this.renderOverview(); setTimeout(() => this.renderOverviewCharts(), 100); },
      variance: () => { document.getElementById('reportContent').innerHTML = this.renderVarianceAnalysis(); },
      eea: () => { document.getElementById('reportContent').innerHTML = this.renderEEA(); },
      wsp: () => { document.getElementById('reportContent').innerHTML = this.renderWSP(); },
      costcentre: () => { document.getElementById('reportContent').innerHTML = this.renderCostCentre(); },
      ytd: () => { document.getElementById('reportContent').innerHTML = this.renderYTD(); setTimeout(() => this.renderYTDCharts(), 100); },
      headcount: () => { document.getElementById('reportContent').innerHTML = this.renderHeadcount(); setTimeout(() => this.renderHeadcountCharts(), 100); },
    };
    (map[tab] || map.overview)();
  },

  // ─── Tab: Overview ──────────────────────────────────────────────────────────
  renderOverview: function () {
    const totalEmp = window.DB.employees.filter(e => e.status === 'Active').length;
    const totalPayroll = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized').reduce((s, r) => s + (r.totalNet || 0), 0);
    const totalRuns = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized').length;
    const avgSalary = totalEmp > 0 ? (window.DB.employees.filter(e => e.status === 'Active').reduce((s, e) => s + (e.basicSalary || 0), 0) / totalEmp) : 0;

    return `
      <div class="grid-4" style="margin-bottom:24px;">
        <div class="kpi-card"><div class="kpi-label">Active Employees</div><div class="kpi-value">${totalEmp}</div></div>
        <div class="kpi-card"><div class="kpi-label">Total Payroll Paid</div><div class="kpi-value" style="font-size:1.3rem;">${window.formatCurrency(totalPayroll)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Payroll Runs</div><div class="kpi-value">${totalRuns}</div></div>
        <div class="kpi-card"><div class="kpi-label">Avg Basic Salary</div><div class="kpi-value" style="font-size:1.3rem;">${window.formatCurrency(avgSalary)}</div></div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-header"><h4>Headcount by Department</h4></div><div class="card-body" style="height:280px;position:relative;"><canvas id="deptChart"></canvas></div></div>
        <div class="card"><div class="card-header"><h4>Monthly Payroll Trend</h4></div><div class="card-body" style="height:280px;position:relative;"><canvas id="payrollChart"></canvas></div></div>
      </div>
    `;
  },

  renderOverviewCharts: function () {
    if (typeof Chart === 'undefined') return;

    // Dept chart from real data
    const deptCounts = {};
    window.DB.employees.filter(e => e.status === 'Active').forEach(e => {
      deptCounts[e.department || 'Unknown'] = (deptCounts[e.department || 'Unknown'] || 0) + 1;
    });
    ChartManager.createChart('deptChart', {
      type: 'doughnut',
      data: { labels: Object.keys(deptCounts), datasets: [{ data: Object.values(deptCounts), backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'] }] },
      options: { responsive: true, maintainAspectRatio: false }
    });

    // Payroll trend
    const runs = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized').slice(-6);
    ChartManager.createChart('payrollChart', {
      type: 'bar',
      data: { labels: runs.map(r => r.period), datasets: [{ label: 'Net Payroll (ZAR)', data: runs.map(r => r.totalNet || 0), backgroundColor: '#4f46e5', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  },

  // ─── Tab: EEA ───────────────────────────────────────────────────────────────
  renderEEA: function () {
    const emps = window.DB.employees.filter(e => e.status === 'Active');
    const byRace = {}, byGender = {};
    emps.forEach(e => {
      const race = e.race || 'Not Specified';
      const gender = e.gender || 'Not Specified';
      byRace[race] = (byRace[race] || 0) + 1;
      byGender[gender] = (byGender[gender] || 0) + 1;
    });

    // EE groups per EEA
    const eeGroups = ['African', 'Coloured', 'Indian/Asian', 'White'];
    const designated = emps.filter(e => eeGroups.includes(e.race) || e.gender === 'Female' || e.disability).length;
    const totalEmp = emps.length;

    return `
      <div class="page-title-box">
        <h4>EEA — Employment Equity Report</h4>
        <button class="btn btn-primary btn-sm" onclick="Reports.exportEEA()"><i class="fas fa-download"></i> Export CSV</button>
      </div>
      <div class="alert alert-info"><i class="fas fa-info-circle"></i> EEA4 Report — Submitted annually to the Department of Employment & Labour. Designated employers (50+ employees) must submit by 1 October.</div>

      <div class="grid-3" style="margin-bottom:20px;">
        <div class="card" style="text-align:center;padding:20px;">
          <div style="font-size:0.75rem;color:var(--gray-500)">Total Workforce</div>
          <div style="font-size:2rem;font-weight:700">${totalEmp}</div>
        </div>
        <div class="card" style="text-align:center;padding:20px;">
          <div style="font-size:0.75rem;color:var(--gray-500)">Designated Groups</div>
          <div style="font-size:2rem;font-weight:700;color:var(--success)">${designated}</div>
        </div>
        <div class="card" style="text-align:center;padding:20px;">
          <div style="font-size:0.75rem;color:var(--gray-500)">EE Compliance %</div>
          <div style="font-size:2rem;font-weight:700;color:var(--primary)">${totalEmp > 0 ? Math.round((designated / totalEmp) * 100) : 0}%</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h4>Race Distribution</h4></div>
          <div class="table-responsive">
            <table>
              <thead><tr><th>Race Group</th><th class="text-right">Count</th><th class="text-right">%</th></tr></thead>
              <tbody>
                ${Object.entries(byRace).map(([r, c]) => `<tr><td>${r}</td><td class="text-right">${c}</td><td class="text-right">${Math.round((c / totalEmp) * 100)}%</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h4>Gender Distribution</h4></div>
          <div class="table-responsive">
            <table>
              <thead><tr><th>Gender</th><th class="text-right">Count</th><th class="text-right">%</th></tr></thead>
              <tbody>
                ${Object.entries(byGender).map(([g, c]) => `<tr><td>${g}</td><td class="text-right">${c}</td><td class="text-right">${Math.round((c / totalEmp) * 100)}%</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px;">
        <div class="card-header"><h4>Employee Detail (EEA)</h4></div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Race</th><th>Gender</th><th>Disability</th><th>Salary Band</th></tr></thead>
            <tbody>
              ${emps.map(e => `<tr>
                <td style="font-weight:500">${e.firstName} ${e.lastName}</td>
                <td>${e.department || '—'}</td>
                <td><span class="badge badge-gray">${e.race || 'Not Specified'}</span></td>
                <td>${e.gender || '—'}</td>
                <td>${e.disability ? '<span class="badge badge-info">Yes</span>' : 'No'}</td>
                <td>${window.formatCurrency(e.basicSalary || 0)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  exportEEA: function () {
    const emps = window.DB.employees.filter(e => e.status === 'Active');
    const header = ['Employee Name', 'Department', 'Position', 'Race', 'Gender', 'Disability', 'Salary', 'Hire Date'];
    const rows = emps.map(e => [`${e.firstName} ${e.lastName}`, e.department, e.position, e.race || '', e.gender || '', e.disability ? 'Yes' : 'No', e.basicSalary, e.hireDate]);
    this._downloadCSV('EEA_Report.csv', [header, ...rows]);
    window.Toast.show('EEA report downloaded', 'success');
  },

  // ─── Tab: WSP / ATR ─────────────────────────────────────────────────────────
  renderWSP: function () {
    const trainings = window.DB.trainingRecords || [];
    const emps = window.DB.employees.filter(e => e.status === 'Active');
    const trained = [...new Set(trainings.filter(t => t.status === 'Completed').map(t => t.employeeId))];

    return `
      <div class="page-title-box">
        <h4>WSP / ATR — Skills Development Report</h4>
        <button class="btn btn-primary btn-sm" onclick="Reports.exportWSP()"><i class="fas fa-download"></i> Export CSV</button>
      </div>
      <div class="alert alert-info"><i class="fas fa-info-circle"></i> Workplace Skills Plan (WSP) and Annual Training Report (ATR) submitted to SETA by 30 April annually.</div>

      <div class="grid-3" style="margin-bottom:20px;">
        <div class="card" style="text-align:center;padding:20px;"><div style="font-size:0.75rem;color:var(--gray-500)">Training Records</div><div style="font-size:2rem;font-weight:700">${trainings.length}</div></div>
        <div class="card" style="text-align:center;padding:20px;"><div style="font-size:0.75rem;color:var(--gray-500)">Employees Trained</div><div style="font-size:2rem;font-weight:700;color:var(--success)">${trained.length}</div></div>
        <div class="card" style="text-align:center;padding:20px;"><div style="font-size:0.75rem;color:var(--gray-500)">Coverage</div><div style="font-size:2rem;font-weight:700;color:var(--primary)">${emps.length > 0 ? Math.round((trained.length / emps.length) * 100) : 0}%</div></div>
      </div>

      <div class="card">
        <div class="card-header"><h4>Training Records</h4></div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Employee</th><th>Course</th><th>Provider</th><th>Date</th><th>Duration</th><th>Cost</th><th>Status</th></tr></thead>
            <tbody>
              ${trainings.length ? trainings.map(t => {
      const emp = window.DB.employees.find(e => e.id === t.employeeId);
      return `<tr>
                  <td>${emp ? `${emp.firstName} ${emp.lastName}` : '—'}</td>
                  <td style="font-weight:500">${t.course}</td>
                  <td>${t.provider || '—'}</td>
                  <td>${t.date}</td>
                  <td>${t.duration || '—'}</td>
                  <td>${t.cost ? window.formatCurrency(t.cost) : '—'}</td>
                  <td><span class="badge badge-${t.status === 'Completed' ? 'success' : 'warning'}">${t.status}</span></td>
                </tr>`;
    }).join('') : '<tr><td colspan="7" class="text-center" style="padding:20px;color:var(--gray-500)">No training records. Add via the Training module.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  exportWSP: function () {
    const trainings = window.DB.trainingRecords || [];
    const header = ['Employee', 'Department', 'Course', 'Provider', 'Date', 'Duration', 'Cost', 'Status'];
    const rows = trainings.map(t => {
      const emp = window.DB.employees.find(e => e.id === t.employeeId);
      return [emp ? `${emp.firstName} ${emp.lastName}` : '', emp?.department || '', t.course, t.provider || '', t.date, t.duration || '', t.cost || 0, t.status];
    });
    this._downloadCSV('WSP_ATR_Report.csv', [header, ...rows]);
    window.Toast.show('WSP/ATR report downloaded', 'success');
  },

  // ─── Tab: Cost Centre ────────────────────────────────────────────────────────
  renderCostCentre: function () {
    const emps = window.DB.employees.filter(e => e.status === 'Active');
    const deptCost = {};
    emps.forEach(e => {
      const dept = e.department || 'Unassigned';
      deptCost[dept] = (deptCost[dept] || { count: 0, gross: 0 });
      deptCost[dept].count++;
      deptCost[dept].gross += (e.basicSalary || 0);
    });
    const total = Object.values(deptCost).reduce((s, d) => s + d.gross, 0);

    return `
      <div class="page-title-box">
        <h4>Payroll Cost-Centre Allocation</h4>
        <button class="btn btn-primary btn-sm" onclick="Reports.exportCostCentre()"><i class="fas fa-download"></i> Export CSV</button>
      </div>

      <div class="card">
        <div class="card-header"><h4>Monthly Cost by Department</h4></div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Department</th><th class="text-right">Headcount</th><th class="text-right">Monthly Gross</th><th class="text-right">% of Total</th><th>Cost Bar</th></tr></thead>
            <tbody>
              ${Object.entries(deptCost).sort((a, b) => b[1].gross - a[1].gross).map(([dept, d]) => {
      const pct = total > 0 ? (d.gross / total * 100) : 0;
      return `<tr>
                  <td style="font-weight:500">${dept}</td>
                  <td class="text-right">${d.count}</td>
                  <td class="text-right">${window.formatCurrency(d.gross)}</td>
                  <td class="text-right">${pct.toFixed(1)}%</td>
                  <td style="min-width:150px;">
                    <div class="progress-bar" style="height:10px;">
                      <div class="progress-fill" style="width:${pct}%;background:var(--primary);"></div>
                    </div>
                  </td>
                </tr>`;
    }).join('')}
              <tr style="background:var(--gray-50);font-weight:700;">
                <td>TOTAL</td><td class="text-right">${emps.length}</td>
                <td class="text-right">${window.formatCurrency(total)}</td>
                <td class="text-right">100%</td><td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  exportCostCentre: function () {
    const emps = window.DB.employees.filter(e => e.status === 'Active');
    const header = ['Department', 'Employee', 'Position', 'Basic Salary', 'Company'];
    const rows = emps.map(e => [e.department || 'Unassigned', `${e.firstName} ${e.lastName}`, e.position, e.basicSalary, e.companyName || '']);
    this._downloadCSV('Cost_Centre_Report.csv', [header, ...rows]);
    window.Toast.show('Cost centre report downloaded', 'success');
  },

  // ─── Tab: YTD Tax Reconciliation ────────────────────────────────────────────
  renderYTD: function () {
    const slips = window.DB.payslips || [];
    const empMap = {};
    slips.forEach(p => {
      if (!empMap[p.employeeId]) {
        const emp = window.DB.employees.find(e => e.id === p.employeeId);
        empMap[p.employeeId] = { name: emp ? `${emp.firstName} ${emp.lastName}` : '—', gross: 0, paye: 0, uif: 0, pension: 0, net: 0 };
      }
      empMap[p.employeeId].gross += (p.gross || 0);
      empMap[p.employeeId].paye += (p.paye || 0);
      empMap[p.employeeId].uif += (p.uif || 0);
      empMap[p.employeeId].pension += (p.pension || 0);
      empMap[p.employeeId].net += (p.net || 0);
    });
    const rows = Object.values(empMap);
    const totals = rows.reduce((s, r) => ({ gross: s.gross + r.gross, paye: s.paye + r.paye, uif: s.uif + r.uif, pension: s.pension + r.pension, net: s.net + r.net }), { gross: 0, paye: 0, uif: 0, pension: 0, net: 0 });

    return `
      <div class="page-title-box">
        <h4>Year-to-Date Tax Reconciliation</h4>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="Reports.exportYTD()"><i class="fas fa-download"></i> Export CSV</button>
          <button class="btn btn-outline btn-sm" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h4>YTD Summary — Tax Year 2025</h4></div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Employee</th><th class="text-right">YTD Gross</th><th class="text-right">YTD PAYE</th><th class="text-right">YTD UIF</th><th class="text-right">YTD Pension</th><th class="text-right">YTD Net</th><th>Effective Tax Rate</th></tr></thead>
            <tbody>
              ${rows.length ? rows.map(r => `<tr>
                <td style="font-weight:500">${r.name}</td>
                <td class="text-right">${window.formatCurrency(r.gross)}</td>
                <td class="text-right text-danger">${window.formatCurrency(r.paye)}</td>
                <td class="text-right text-warning">${window.formatCurrency(r.uif)}</td>
                <td class="text-right">${window.formatCurrency(r.pension)}</td>
                <td class="text-right" style="font-weight:700;color:var(--success)">${window.formatCurrency(r.net)}</td>
                <td>${r.gross > 0 ? (r.paye / r.gross * 100).toFixed(1) + '%' : '—'}</td>
              </tr>`).join('') : '<tr><td colspan="7" class="text-center" style="padding:20px;color:var(--gray-500)">No finalized payslips found.</td></tr>'}
              ${rows.length ? `<tr style="background:var(--gray-50);font-weight:700;">
                <td>TOTALS</td>
                <td class="text-right">${window.formatCurrency(totals.gross)}</td>
                <td class="text-right text-danger">${window.formatCurrency(totals.paye)}</td>
                <td class="text-right text-warning">${window.formatCurrency(totals.uif)}</td>
                <td class="text-right">${window.formatCurrency(totals.pension)}</td>
                <td class="text-right" style="color:var(--success)">${window.formatCurrency(totals.net)}</td>
                <td>${totals.gross > 0 ? (totals.paye / totals.gross * 100).toFixed(1) + '%' : '—'}</td>
              </tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>

      <div id="ytdChart" style="margin-top:20px;"></div>
    `;
  },

  renderYTDCharts: function () { },

  exportYTD: function () {
    const slips = window.DB.payslips || [];
    const empMap = {};
    slips.forEach(p => {
      if (!empMap[p.employeeId]) {
        const emp = window.DB.employees.find(e => e.id === p.employeeId);
        empMap[p.employeeId] = { name: emp ? `${emp.firstName} ${emp.lastName}` : '—', gross: 0, paye: 0, uif: 0, pension: 0, net: 0 };
      }
      empMap[p.employeeId].gross += p.gross || 0;
      empMap[p.employeeId].paye += p.paye || 0;
      empMap[p.employeeId].uif += p.uif || 0;
      empMap[p.employeeId].pension += p.pension || 0;
      empMap[p.employeeId].net += p.net || 0;
    });
    const rows = Object.values(empMap);
    const header = ['Employee', 'YTD Gross', 'YTD PAYE', 'YTD UIF', 'YTD Pension', 'YTD Net', 'Effective Tax Rate'];
    const data = rows.map(r => [r.name, r.gross.toFixed(2), r.paye.toFixed(2), r.uif.toFixed(2), r.pension.toFixed(2), r.net.toFixed(2), `${r.gross > 0 ? (r.paye / r.gross * 100).toFixed(1) : 0}%`]);
    this._downloadCSV('YTD_Tax_Reconciliation.csv', [header, ...data]);
    window.Toast.show('YTD reconciliation downloaded', 'success');
  },

  // ─── Tab: Headcount ──────────────────────────────────────────────────────────
  renderHeadcount: function () {
    const active = window.DB.employees.filter(e => e.status === 'Active').length;
    const terminated = window.DB.employees.filter(e => e.status === 'Terminated').length;
    const total = window.DB.employees.length;

    // New hires last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const newHires = window.DB.employees.filter(e => {
      if (!e.hireDate) return false;
      return new Date(e.hireDate) >= threeMonthsAgo;
    }).length;

    return `
      <div class="page-title-box">
        <h4>Headcount & Turnover Analysis</h4>
        <button class="btn btn-primary btn-sm" onclick="Reports.exportHeadcount()"><i class="fas fa-download"></i> Export</button>
      </div>

      <div class="grid-4" style="margin-bottom:20px;">
        <div class="card" style="text-align:center;padding:20px;"><div style="font-size:0.75rem;color:var(--gray-500)">Active</div><div style="font-size:2rem;font-weight:700;color:var(--success)">${active}</div></div>
        <div class="card" style="text-align:center;padding:20px;"><div style="font-size:0.75rem;color:var(--gray-500)">Terminated</div><div style="font-size:2rem;font-weight:700;color:var(--danger)">${terminated}</div></div>
        <div class="card" style="text-align:center;padding:20px;"><div style="font-size:0.75rem;color:var(--gray-500)">New Hires (90d)</div><div style="font-size:2rem;font-weight:700;color:var(--primary)">${newHires}</div></div>
        <div class="card" style="text-align:center;padding:20px;"><div style="font-size:0.75rem;color:var(--gray-500)">Turnover Rate</div><div style="font-size:2rem;font-weight:700">${total > 0 ? Math.round((terminated / total) * 100) : 0}%</div></div>
      </div>

      <div class="card">
        <div class="card-header"><h4>Employee Roster</h4></div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Employee</th><th>Dept</th><th>Hire Date</th><th>Tenure</th><th>Status</th></tr></thead>
            <tbody>
              ${window.DB.employees.map(e => {
      const hire = e.hireDate ? new Date(e.hireDate) : null;
      const tenure = hire ? Math.floor((Date.now() - hire.getTime()) / (1000 * 60 * 60 * 24 * (365 / 12))) : 0;
      return `<tr>
                  <td style="font-weight:500">${e.firstName} ${e.lastName}</td>
                  <td>${e.department || '—'}</td>
                  <td>${e.hireDate || '—'}</td>
                  <td>${hire ? `${tenure} months` : '—'}</td>
                  <td><span class="badge badge-${e.status === 'Terminated' ? 'danger' : 'success'}">${e.status}</span></td>
                </tr>`;
    }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderHeadcountCharts: function () { },

  exportHeadcount: function () {
    const header = ['Employee', 'Department', 'Position', 'Hire Date', 'Status', 'Salary'];
    const rows = window.DB.employees.map(e => [`${e.firstName} ${e.lastName}`, e.department, e.position, e.hireDate, e.status, e.basicSalary]);
    this._downloadCSV('Headcount_Report.csv', [header, ...rows]);
    window.Toast.show('Headcount report downloaded', 'success');
  },

  // ─── Tab: Variance Analysis ────────────────────────────────────────────────
  renderVarianceAnalysis: function () {
    const runs = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized' || r.status === 'Paid').sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));

    if (runs.length < 2) {
      return `
        <div class="page-title-box"><h4>Variance Analysis</h4></div>
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> At least two finalized payroll runs are needed to perform a variance analysis.
        </div>`;
    }

    return `
      <div class="page-title-box">
        <h4>Variance Analysis — Month-on-Month Comparison</h4>
        <div style="display:flex;gap:10px;align-items:center;">
          <select id="var_run1" class="form-control" style="width:200px;" onchange="Reports.updateVariance()">
            ${runs.map((r, i) => `<option value="${r.id}" ${i === 1 ? 'selected' : ''}>${r.period} (${r.company})</option>`).join('')}
          </select>
          <span style="color:var(--gray-400)">vs</span>
          <select id="var_run2" class="form-control" style="width:200px;" onchange="Reports.updateVariance()">
            ${runs.map((r, i) => `<option value="${r.id}" ${i === 0 ? 'selected' : ''}>${r.period} (${r.company})</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" onclick="Reports.exportVariance()"><i class="fas fa-download"></i> Export</button>
        </div>
      </div>
      <div id="varianceResults">${this.calculateAndRenderVariance(runs[1].id, runs[0].id)}</div>
    `;
  },

  updateVariance: function () {
    const id1 = document.getElementById('var_run1').value;
    const id2 = document.getElementById('var_run2').value;
    document.getElementById('varianceResults').innerHTML = this.calculateAndRenderVariance(id1, id2);
  },

  calculateAndRenderVariance: function (id1, id2) {
    const runs = window.DB.payrollRuns || [];
    const run1 = runs.find(r => r.id === id1);
    const run2 = runs.find(r => r.id === id2);
    if (!run1 || !run2) return '';

    const slips = window.DB.payslips || [];
    const slips1 = slips.filter(s => s.runId === id1);
    const slips2 = slips.filter(s => s.runId === id2);

    const allEmpIds = [...new Set([...slips1.map(s => s.employeeId), ...slips2.map(s => s.employeeId)])];
    const employees = window.DB.employees || [];

    const rows = allEmpIds.map(empId => {
      const s1 = slips1.find(s => s.employeeId === empId) || { gross: 0, paye: 0, net: 0 };
      const s2 = slips2.find(s => s.employeeId === empId) || { gross: 0, paye: 0, net: 0 };
      const emp = employees.find(e => e.id === empId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';

      return {
        name,
        gross1: s1.gross, gross2: s2.gross, grossVar: s2.gross - s1.gross,
        paye1: s1.paye, paye2: s2.paye, payeVar: s2.paye - s1.paye,
        net1: s1.net, net2: s2.net, netVar: s2.net - s1.net
      };
    });

    return `
      <div class="card">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th class="text-right">${run1.period} Gross</th>
                <th class="text-right">${run2.period} Gross</th>
                <th class="text-right">Variance</th>
                <th class="text-right">Net Variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => {
      const badge = r.grossVar === 0 ? 'gray' : (Math.abs(r.grossVar) > 1000 ? 'danger' : 'warning');
      return `
                <tr>
                  <td style="font-weight:500">${r.name}</td>
                  <td class="text-right">${window.formatCurrency(r.gross1)}</td>
                  <td class="text-right">${window.formatCurrency(r.gross2)}</td>
                  <td class="text-right" style="font-weight:700; color:${r.grossVar < 0 ? 'var(--danger)' : (r.grossVar > 0 ? 'var(--success)' : 'inherit')}">
                    ${r.grossVar > 0 ? '+' : ''}${window.formatCurrency(r.grossVar)}
                  </td>
                  <td class="text-right" style="color:${r.netVar < 0 ? 'var(--danger)' : (r.netVar > 0 ? 'var(--success)' : 'inherit')}">
                    ${r.netVar > 0 ? '+' : ''}${window.formatCurrency(r.netVar)}
                  </td>
                  <td><span class="badge badge-${badge}">${r.grossVar === 0 ? 'Stable' : (Math.abs(r.grossVar) > 1000 ? 'High' : 'Moderate')}</span></td>
                </tr>`;
    }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  exportVariance: function () {
    const id1 = document.getElementById('var_run1').value;
    const id2 = document.getElementById('var_run2').value;
    const run1 = (window.DB.payrollRuns || []).find(r => r.id === id1);
    const run2 = (window.DB.payrollRuns || []).find(r => r.id === id2);
    if (!run1 || !run2) return;

    const slips = window.DB.payslips || [];
    const slips1 = slips.filter(s => s.runId === id1);
    const slips2 = slips.filter(s => s.runId === id2);
    const allEmpIds = [...new Set([...slips1.map(s => s.employeeId), ...slips2.map(s => s.employeeId)])];
    const employees = window.DB.employees || [];

    const header = ['Employee', `${run1.period} Gross`, `${run2.period} Gross`, 'Gross Variance', 'Net Variance'];
    const rows = allEmpIds.map(empId => {
      const s1 = slips1.find(s => s.employeeId === empId) || { gross: 0, net: 0 };
      const s2 = slips2.find(s => s.employeeId === empId) || { gross: 0, net: 0 };
      const emp = employees.find(e => e.id === empId);
      return [
        emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        s1.gross.toFixed(2), s2.gross.toFixed(2), (s2.gross - s1.gross).toFixed(2), (s2.net - s1.net).toFixed(2)
      ];
    });

    this._downloadCSV(`Variance_Report_${run1.period}_vs_${run2.period}.csv`, [header, ...rows]);
  },

  // ─── CSV Utility ─────────────────────────────────────────────────────────────
  _downloadCSV: function (filename, rows) {
    const csv = rows.map(row => row.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
};

window.renderReports = function (container) {
  Reports.render(container);
};
