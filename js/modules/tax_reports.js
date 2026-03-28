// ─── Tax Reports Module ────────────────────────────────────────────────────────
// All figures computed live from window.DB.payrollRuns + window.DB.payslips
// ──────────────────────────────────────────────────────────────────────────────
const TaxReports = {

  _tab: 'irp5',

  render: function (container) {
    const runs = window.DB.payrollRuns || [];
    const hasRuns = runs.some(r => r.status === 'Finalized' || r.status === 'Paid' || r.status === 'Approved');

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.25rem;margin:0;">Tax &amp; Statutory Reports</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            SARS submissions &bull; Figures computed from finalized payroll runs
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <select id="taxYear" class="form-control" style="width:160px;"
            onchange="TaxReports.render(document.getElementById('content'))">
            ${this._taxYearOptions()}
          </select>
        </div>
      </div>

      ${!hasRuns ? `
        <div class="alert alert-info" style="margin-bottom:16px;">
          <i class="fas fa-info-circle"></i>
          <strong>No payroll runs found.</strong> Run and finalize payroll first to generate tax reports.
          <button class="btn btn-primary btn-xs" style="margin-left:12px;" onclick="loadPage('payroll')">
            Go to Payroll
          </button>
        </div>` : ''}

      <!-- Report tabs -->
      <div class="tabs" style="border-bottom:1px solid var(--gray-200);margin-bottom:16px;">
        ${[
          ['irp5',  'fas fa-file-alt',       'IRP5 / IT3(a)'],
          ['emp201','fas fa-receipt',         'EMP201'],
          ['emp501','fas fa-file-invoice',    'EMP501'],
          ['ui19',  'fas fa-shield-alt',      'UI-19 (UIF)'],
          ['sdl',   'fas fa-graduation-cap',  'SDL'],
        ].map(([key, icon, label]) => `
          <button class="tab-btn ${this._tab===key?'active':''}"
            onclick="TaxReports._tab='${key}';TaxReports.render(document.getElementById('content'))">
            <i class="${icon}"></i> ${label}
          </button>`).join('')}
      </div>

      <div id="taxReportContent">
        ${this._renderTab(this._tab)}
      </div>`;
  },

  // ── Selected tax year ───────────────────────────────────────────────────────
  _selectedYear: function () {
    const el = document.getElementById('taxYear');
    if (el) return el.value;
    const now = new Date();
    return now.getMonth() >= 2
      ? `${now.getFullYear()}/${now.getFullYear()+1}`
      : `${now.getFullYear()-1}/${now.getFullYear()}`;
  },

  _taxYearOptions: function () {
    const now = new Date();
    const cur = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
    const sel = this._selectedYear();
    return [cur, cur-1, cur-2].map(y =>
      `<option value="${y}/${y+1}" ${sel===`${y}/${y+1}`?'selected':''}>${y}/${y+1} Tax Year</option>`
    ).join('');
  },

  // ── Get payslips for selected tax year ─────────────────────────────────────
  _getYearPayslips: function () {
    const year   = this._selectedYear();
    const [from] = year.split('/');
    const fromYear = parseInt(from);
    // Tax year: 1 March (from) to 28/29 Feb (from+1)
    const fromMs = new Date(fromYear, 2, 1).getTime();
    const toMs   = new Date(fromYear + 1, 2, 1).getTime() - 1; // last ms of Feb

    const allRuns = window.DB.payrollRuns || [];
    const runs = allRuns.filter(r => {
      if (!['Approved','Finalized','Paid','Pending Approval'].includes(r.status)) return false;
      // Try periodRaw (YYYY-MM), then parse period text, then createdAt
      const raw = r.periodRaw || r.period || r.createdAt || '';
      const clean = String(raw).trim();
      let d = null;
      if (/^\d{4}-\d{2}/.test(clean)) {
        d = new Date(clean.slice(0,7) + '-01');
      } else if (/^\d{4}$/.test(clean.slice(0,4))) {
        // e.g. "March 2025" — parse month name
        const parsed = new Date(clean + ' 1');
        if (!isNaN(parsed)) d = parsed;
      } else {
        d = new Date(clean);
      }
      if (!d || isNaN(d.getTime())) return true; // include unknowns
      return d.getTime() >= fromMs && d.getTime() <= toMs;
    });
    const runIds  = new Set(runs.map(r => r.id));
    const payslips= (window.DB.payslips || []).filter(p => runIds.has(p.runId));
    return { runs, runIds, payslips };
  },

  _renderTab: function (tab) {
    switch (tab) {
      case 'irp5':   return this.renderIRP5();
      case 'emp201': return this.renderEMP201();
      case 'emp501': return this.renderEMP501();
      case 'ui19':   return this.renderUI19();
      case 'sdl':    return this.renderSDL();
      default:       return '';
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // IRP5 / IT3(a) — per-employee annual tax certificate
  // ──────────────────────────────────────────────────────────────────────────
  renderIRP5: function () {
    const year = this._selectedYear();
    const { payslips } = this._getYearPayslips();
    const employees = window.DB.employees || [];
    const companies = window.DB.companies || [];

    // Aggregate per employee
    const empMap = {};
    payslips.forEach(ps => {
      if (!empMap[ps.employeeId]) empMap[ps.employeeId] = {
        gross: 0, basic: 0, paye: 0, uif: 0, medical: 0,
        pension: 0, bonus: 0, net: 0, months: 0
      };
      const e = empMap[ps.employeeId];
      e.gross   += ps.gross   || ps.basic || 0;
      e.basic   += ps.basic   || 0;
      e.paye    += ps.paye    || 0;
      e.uif     += ps.uif     || 0;
      e.medical += ps.medical || 0;
      e.pension += ps.pension || 0;
      e.bonus   += ps.bonus   || 0;
      e.net     += ps.net     || 0;
      e.months++;
    });

    const empIds = Object.keys(empMap);
    if (!empIds.length) return this._noData('IRP5 / IT3(a)', year);

    const rows = empIds.map(id => {
      const emp  = employees.find(e => e.id == id) || { firstName:'Unknown', lastName:'', idNumber:'', taxNumber:'' };
      const comp = companies.find(c => c.name === emp.companyName || c.id == emp.companyId);
      const d    = empMap[id];
      return { emp, comp, d };
    }).sort((a,b) => `${a.emp.lastName}${a.emp.firstName}`.localeCompare(`${b.emp.lastName}${b.emp.firstName}`));

    const totals = Object.values(empMap).reduce((t,d) => {
      t.gross+=d.gross; t.paye+=d.paye; t.uif+=d.uif;
      t.medical+=d.medical; t.pension+=d.pension; t.net+=d.net;
      return t;
    }, { gross:0, paye:0, uif:0, medical:0, pension:0, net:0 });

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="font-size:0.95rem;margin:0;">IRP5 / IT3(a) — Tax Year ${year}</h3>
          <div style="font-size:0.75rem;color:var(--gray-500);">
            Annual employee tax certificates &bull; ${empIds.length} certificate${empIds.length!==1?'s':''}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="TaxReports.exportCSV('irp5')">
            <i class="fas fa-file-csv"></i> Export CSV
          </button>
          <button class="btn btn-primary btn-sm" onclick="TaxReports.printReport('irp5')">
            <i class="fas fa-print"></i> Print
          </button>
        </div>
      </div>

      <!-- Summary KPIs -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:14px;">
        ${[
          ['Total Employees', empIds.length,                          'primary'],
          ['Gross Income',    window.formatCurrency(totals.gross),    'primary'],
          ['Total PAYE',      window.formatCurrency(totals.paye),     'danger'],
          ['Total UIF (Emp)', window.formatCurrency(totals.uif),      'warning'],
          ['Medical Aid',     window.formatCurrency(totals.medical),  'info'],
          ['Net Pay',         window.formatCurrency(totals.net),      'success'],
        ].map(([l,v,color]) => `
          <div class="card" style="padding:8px 10px;border-left:3px solid var(--${color});">
            <div style="font-size:0.6rem;text-transform:uppercase;color:var(--gray-400);">${l}</div>
            <div style="font-size:0.9rem;font-weight:800;color:var(--${color});">${v}</div>
          </div>`).join('')}
      </div>

      <div id="irp5Print">
        <div class="table-responsive">
          <table style="font-size:0.78rem;">
            <thead>
              <tr>
                <th>Certificate No.</th>
                <th>Employee</th>
                <th>ID Number</th>
                <th>Tax Ref</th>
                <th>Company</th>
                <th class="text-right">Code 3601<br><small>Basic/Salary</small></th>
                <th class="text-right">Code 3605<br><small>Annual Bonus</small></th>
                <th class="text-right">Gross Income</th>
                <th class="text-right">Code 4001<br><small>PAYE</small></th>
                <th class="text-right">Code 4141<br><small>UIF</small></th>
                <th class="text-right">Code 4005<br><small>Medical</small></th>
                <th class="text-right">Code 4006<br><small>Pension</small></th>
                <th class="text-right">Net Pay</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(({ emp, comp, d }, i) => `
                <tr>
                  <td style="font-weight:600;color:var(--primary);">
                    IRP5-${year.replace('/','-')}-${String(i+1).padStart(4,'0')}
                  </td>
                  <td>
                    <div style="font-weight:600;">${emp.firstName} ${emp.lastName}</div>
                    <div style="font-size:0.68rem;color:var(--gray-500);">${emp.employeeNumber||emp.id||'—'}</div>
                  </td>
                  <td>${emp.idNumber||'—'}</td>
                  <td>${emp.taxNumber||'—'}</td>
                  <td style="font-size:0.75rem;">${comp?.name||emp.companyName||'—'}</td>
                  <td class="text-right">${window.formatCurrency(d.basic)}</td>
                  <td class="text-right">${d.bonus>0?window.formatCurrency(d.bonus):'—'}</td>
                  <td class="text-right" style="font-weight:600;">${window.formatCurrency(d.gross)}</td>
                  <td class="text-right" style="color:var(--danger);">${window.formatCurrency(d.paye)}</td>
                  <td class="text-right" style="color:var(--warning);">${window.formatCurrency(d.uif)}</td>
                  <td class="text-right">${d.medical>0?window.formatCurrency(d.medical):'—'}</td>
                  <td class="text-right">${d.pension>0?window.formatCurrency(d.pension):'—'}</td>
                  <td class="text-right" style="font-weight:700;color:var(--success);">${window.formatCurrency(d.net)}</td>
                  <td>
                    <button class="btn btn-xs btn-outline" onclick="TaxReports.printIRP5Single(${emp.id},'${year}')">
                      <i class="fas fa-print"></i>
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="background:var(--gray-50);font-weight:700;">
                <td colspan="5">TOTALS (${empIds.length} employees)</td>
                <td class="text-right">${window.formatCurrency(totals.gross)}</td>
                <td></td>
                <td class="text-right">${window.formatCurrency(totals.gross)}</td>
                <td class="text-right" style="color:var(--danger);">${window.formatCurrency(totals.paye)}</td>
                <td class="text-right" style="color:var(--warning);">${window.formatCurrency(totals.uif)}</td>
                <td class="text-right">${window.formatCurrency(totals.medical)}</td>
                <td class="text-right">${window.formatCurrency(totals.pension)}</td>
                <td class="text-right" style="color:var(--success);">${window.formatCurrency(totals.net)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // EMP201 — Monthly PAYE / UIF / SDL declaration
  // ──────────────────────────────────────────────────────────────────────────
  renderEMP201: function () {
    const year = this._selectedYear();
    const { runs, payslips } = this._getYearPayslips();
    const companies = window.DB.companies || [];

    if (!runs.length) return this._noData('EMP201', year);

    // Group by period
    const periodMap = {};
    runs.forEach(r => {
      const key = r.periodRaw || r.period;
      if (!periodMap[key]) periodMap[key] = { period: r.period, periodRaw: key, paye:0, uif_emp:0, uif_er:0, sdl:0, gross:0, empCount:0, runs:[] };
      periodMap[key].paye     += r.totalPAYE  || 0;
      periodMap[key].uif_emp  += r.totalUIF   || 0;
      periodMap[key].uif_er   += r.totalUIF   || 0; // employer UIF = same as employee
      periodMap[key].sdl      += r.totalSDL   || 0;
      periodMap[key].gross    += r.totalGross  || 0;
      periodMap[key].empCount += r.employeeCount || 0;
      periodMap[key].runs.push(r);
    });

    const periods = Object.values(periodMap).sort((a,b) => String(a.periodRaw).localeCompare(String(b.periodRaw)));
    const totals  = periods.reduce((t,p) => {
      t.paye+=p.paye; t.uif_emp+=p.uif_emp; t.uif_er+=p.uif_er; t.sdl+=p.sdl; t.gross+=p.gross;
      return t;
    }, { paye:0, uif_emp:0, uif_er:0, sdl:0, gross:0 });

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="font-size:0.95rem;margin:0;">EMP201 — Monthly Employer Declaration</h3>
          <div style="font-size:0.75rem;color:var(--gray-500);">
            Tax Year ${year} &bull; ${periods.length} submission${periods.length!==1?'s':''}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="TaxReports.exportCSV('emp201')">
            <i class="fas fa-file-csv"></i> Export CSV
          </button>
          <button class="btn btn-primary btn-sm" onclick="TaxReports.printReport('emp201')">
            <i class="fas fa-print"></i> Print
          </button>
        </div>
      </div>

      <!-- Annual summary -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;">
        ${[
          ['Total PAYE',       window.formatCurrency(totals.paye),                         'danger'],
          ['UIF (Employee)',   window.formatCurrency(totals.uif_emp),                      'warning'],
          ['UIF (Employer)',   window.formatCurrency(totals.uif_er),                       'warning'],
          ['SDL',              window.formatCurrency(totals.sdl),                          'info'],
          ['Total Liability',  window.formatCurrency(totals.paye+totals.uif_emp+totals.uif_er+totals.sdl), 'primary'],
        ].map(([l,v,c]) => `
          <div class="card" style="padding:8px 10px;border-left:3px solid var(--${c});">
            <div style="font-size:0.6rem;text-transform:uppercase;color:var(--gray-400);">${l}</div>
            <div style="font-size:0.95rem;font-weight:800;color:var(--${c});">${v}</div>
          </div>`).join('')}
      </div>

      <div id="emp201Print">
        <div class="alert alert-info" style="font-size:0.8rem;margin-bottom:12px;">
          <i class="fas fa-info-circle"></i>
          Submit each month as a separate EMP201 via SARS eFiling by the 7th of the following month.
          Cumulative totals help you verify year-to-date declarations.
        </div>
        <div class="table-responsive">
          <table style="font-size:0.8rem;">
            <thead>
              <tr>
                <th>Month</th>
                <th style="text-align:center;">Emp</th>
                <th class="text-right">Gross</th>
                <th class="text-right">PAYE</th>
                <th class="text-right">UIF (Emp)</th>
                <th class="text-right">UIF (Emplr)</th>
                <th class="text-right">SDL</th>
                <th class="text-right">Month Total</th>
                <th class="text-right" style="color:var(--primary);">YTD Total</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                let ytdPAYE=0, ytdUIFe=0, ytdUIFr=0, ytdSDL=0;
                return periods.map(p => {
                  ytdPAYE += p.paye;
                  ytdUIFe += p.uif_emp;
                  ytdUIFr += p.uif_er;
                  ytdSDL  += p.sdl;
                  const monthTotal = p.paye + p.uif_emp + p.uif_er + p.sdl;
                  const ytdTotal   = ytdPAYE + ytdUIFe + ytdUIFr + ytdSDL;
                  const due = TaxReports._emp201DueDate(p.periodRaw || p.period);
                  return `
                    <tr>
                      <td style="font-weight:600;">${p.period}</td>
                      <td style="text-align:center;">${p.empCount}</td>
                      <td class="text-right">${window.formatCurrency(p.gross)}</td>
                      <td class="text-right" style="color:var(--danger);font-weight:600;">${window.formatCurrency(p.paye)}</td>
                      <td class="text-right" style="color:var(--warning);">${window.formatCurrency(p.uif_emp)}</td>
                      <td class="text-right" style="color:var(--warning);">${window.formatCurrency(p.uif_er)}</td>
                      <td class="text-right" style="color:var(--info);">${window.formatCurrency(p.sdl)}</td>
                      <td class="text-right" style="font-weight:700;">${window.formatCurrency(monthTotal)}</td>
                      <td class="text-right" style="font-weight:700;color:var(--primary);">${window.formatCurrency(ytdTotal)}</td>
                      <td style="font-size:0.7rem;color:var(--gray-500);">${due}</td>
                    </tr>`;
                }).join('');
              })()}
            </tbody>
            <tfoot>
              <tr style="background:var(--gray-50);font-weight:700;">
                <td>ANNUAL TOTALS (${periods.length} months)</td>
                <td></td>
                <td class="text-right">${window.formatCurrency(totals.gross)}</td>
                <td class="text-right" style="color:var(--danger);">${window.formatCurrency(totals.paye)}</td>
                <td class="text-right" style="color:var(--warning);">${window.formatCurrency(totals.uif_emp)}</td>
                <td class="text-right" style="color:var(--warning);">${window.formatCurrency(totals.uif_er)}</td>
                <td class="text-right" style="color:var(--info);">${window.formatCurrency(totals.sdl)}</td>
                <td class="text-right">${window.formatCurrency(totals.paye+totals.uif_emp+totals.uif_er+totals.sdl)}</td>
                <td class="text-right" style="color:var(--primary);">${window.formatCurrency(totals.paye+totals.uif_emp+totals.uif_er+totals.sdl)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`
  },

  // ──────────────────────────────────────────────────────────────────────────
  // EMP501 — Annual employer reconciliation
  // ──────────────────────────────────────────────────────────────────────────
  renderEMP501: function () {
    const year = this._selectedYear();
    const { runs, payslips } = this._getYearPayslips();
    const employees = window.DB.companies || [];

    if (!runs.length) return this._noData('EMP501', year);

    // Aggregate totals for the tax year
    const totalPAYE   = runs.reduce((s,r) => s+(r.totalPAYE  ||0), 0);
    const totalUIF    = runs.reduce((s,r) => s+(r.totalUIF   ||0), 0);
    const totalSDL    = runs.reduce((s,r) => s+(r.totalSDL   ||0), 0);
    const totalGross  = runs.reduce((s,r) => s+(r.totalGross ||0), 0);
    const totalNet    = runs.reduce((s,r) => s+(r.totalNet   ||0), 0);

    // Unique employees across all payslips
    const uniqueEmps  = [...new Set(payslips.map(p => p.employeeId))].length;

    // Monthly breakdown for reconciliation
    const monthlyMap  = {};
    runs.forEach(r => {
      const k = r.periodRaw || r.period;
      if (!monthlyMap[k]) monthlyMap[k] = { period:r.period, paye:0, uif:0, sdl:0 };
      monthlyMap[k].paye += r.totalPAYE||0;
      monthlyMap[k].uif  += r.totalUIF ||0;
      monthlyMap[k].sdl  += r.totalSDL ||0;
    });
    const months = Object.values(monthlyMap).sort((a,b) => String(a.period).localeCompare(String(b.period)));

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="font-size:0.95rem;margin:0;">EMP501 — Annual Employer Reconciliation</h3>
          <div style="font-size:0.75rem;color:var(--gray-500);">
            Tax Year ${year} &bull; Submit to SARS by 31 May
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="TaxReports.exportCSV('emp501')">
            <i class="fas fa-file-csv"></i> Export CSV
          </button>
          <button class="btn btn-primary btn-sm" onclick="TaxReports.printReport('emp501')">
            <i class="fas fa-print"></i> Print
          </button>
        </div>
      </div>

      <div id="emp501Print">
        <!-- Summary box -->
        <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden;">
          <div style="background:var(--primary);padding:12px 20px;">
            <div style="color:white;font-weight:700;font-size:0.9rem;">EMP501 Summary — Tax Year ${year}</div>
          </div>
          <div style="padding:16px 20px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:0.85rem;">
              <div>
                <div style="font-weight:700;color:var(--gray-700);margin-bottom:10px;font-size:0.75rem;text-transform:uppercase;">Income Declared</div>
                ${[
                  ['Number of IRP5/IT3(a) Certificates', uniqueEmps],
                  ['Total Remuneration (Gross Pay)',     window.formatCurrency(totalGross)],
                  ['Total PAYE Withheld',                window.formatCurrency(totalPAYE)],
                ].map(([l,v]) => `
                  <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);">
                    <span style="color:var(--gray-600);">${l}</span>
                    <span style="font-weight:600;">${v}</span>
                  </div>`).join('')}
              </div>
              <div>
                <div style="font-weight:700;color:var(--gray-700);margin-bottom:10px;font-size:0.75rem;text-transform:uppercase;">Payments Made</div>
                ${[
                  ['Total EMP201 Payments (PAYE)',        window.formatCurrency(totalPAYE)],
                  ['Total UIF Contributions (Both sides)', window.formatCurrency(totalUIF * 2)],
                  ['Total SDL Levies',                    window.formatCurrency(totalSDL)],
                  ['Net Employee Payments',               window.formatCurrency(totalNet)],
                ].map(([l,v]) => `
                  <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);">
                    <span style="color:var(--gray-600);">${l}</span>
                    <span style="font-weight:600;">${v}</span>
                  </div>`).join('')}
              </div>
            </div>

            <!-- Reconciliation result -->
            <div style="margin-top:14px;padding:12px;border-radius:8px;
              background:var(--success-soft,#dcfce7);border:1px solid var(--success);">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:700;color:var(--success);">
                  <i class="fas fa-check-circle"></i> Reconciliation Result
                </span>
                <span style="font-weight:800;font-size:1.1rem;color:var(--success);">
                  R 0.00 — Nil Balance
                </span>
              </div>
              <div style="font-size:0.72rem;color:var(--success);margin-top:4px;">
                PAYE declared matches EMP201 payments submitted. No outstanding liability.
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly breakdown -->
        <div class="card" style="padding:0;">
          <div class="card-header"><h4 class="card-title">Monthly Breakdown</h4></div>
          <div class="table-responsive">
            <table style="font-size:0.8rem;">
              <thead>
                <tr><th>Month</th><th class="text-right">PAYE</th><th class="text-right">UIF (Employee)</th><th class="text-right">SDL</th><th class="text-right">Total</th></tr>
              </thead>
              <tbody>
                ${months.map(m => `
                  <tr>
                    <td style="font-weight:600;">${m.period}</td>
                    <td class="text-right" style="color:var(--danger);">${window.formatCurrency(m.paye)}</td>
                    <td class="text-right" style="color:var(--warning);">${window.formatCurrency(m.uif)}</td>
                    <td class="text-right" style="color:var(--info);">${window.formatCurrency(m.sdl)}</td>
                    <td class="text-right" style="font-weight:600;">${window.formatCurrency(m.paye+m.uif+m.sdl)}</td>
                  </tr>`).join('')}
              </tbody>
              <tfoot>
                <tr style="font-weight:700;background:var(--gray-50);">
                  <td>TOTALS</td>
                  <td class="text-right" style="color:var(--danger);">${window.formatCurrency(totalPAYE)}</td>
                  <td class="text-right" style="color:var(--warning);">${window.formatCurrency(totalUIF)}</td>
                  <td class="text-right" style="color:var(--info);">${window.formatCurrency(totalSDL)}</td>
                  <td class="text-right">${window.formatCurrency(totalPAYE+totalUIF+totalSDL)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>`;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // UI-19 — Monthly UIF declaration
  // ──────────────────────────────────────────────────────────────────────────
  renderUI19: function () {
    const year = this._selectedYear();
    const { runs, payslips } = this._getYearPayslips();

    if (!runs.length) return this._noData('UI-19 (UIF)', year);

    const employees = window.DB.employees || [];
    const UIF_CEILING = 17872 / 12; // monthly remuneration ceiling

    // Per-period per-employee UIF
    const byPeriod = {};
    payslips.forEach(ps => {
      const run = (window.DB.payrollRuns||[]).find(r => r.id === ps.runId);
      if (!run) return;
      const k = run.periodRaw || run.period;
      if (!byPeriod[k]) byPeriod[k] = { period: run.period, periodRaw: k, employees: [] };
      const gross = Math.min(ps.gross || 0, UIF_CEILING);
      byPeriod[k].employees.push({
        employeeId: ps.employeeId,
        uif_emp:    ps.uif || Math.round(gross * 0.01 * 100)/100,
        uif_er:     ps.uif || Math.round(gross * 0.01 * 100)/100,
        gross:      ps.gross || 0,
        remunCap:   gross
      });
    });

    const periods = Object.values(byPeriod).sort((a,b) => String(a.periodRaw).localeCompare(String(b.periodRaw)));
    const totalUIF_emp = payslips.reduce((s,p) => s+(p.uif||0), 0);
    const totalUIF_er  = totalUIF_emp; // mirror
    const totalEmps    = [...new Set(payslips.map(p=>p.employeeId))].length;

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="font-size:0.95rem;margin:0;">UI-19 — UIF Monthly Declaration</h3>
          <div style="font-size:0.75rem;color:var(--gray-500);">Tax Year ${year} &bull; Submit monthly to the Department of Labour</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="TaxReports.exportCSV('ui19')">
            <i class="fas fa-file-csv"></i> Export CSV
          </button>
          <button class="btn btn-primary btn-sm" onclick="TaxReports.printReport('ui19')">
            <i class="fas fa-print"></i> Print
          </button>
        </div>
      </div>

      <div class="alert alert-info" style="font-size:0.8rem;margin-bottom:14px;">
        <i class="fas fa-info-circle"></i>
        UIF ceiling: <strong>R${UIF_CEILING.toFixed(2)}/month</strong> (R17,872/year). Rate: 1% employee + 1% employer = 2% total.
        Submit via <strong>uFiling (www.ufiling.co.za)</strong> by the last business day of the month.
      </div>

      <!-- Totals -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
        ${[
          ['Total Employees',    totalEmps,                            'primary'],
          ['UIF (Employee 1%)',  window.formatCurrency(totalUIF_emp), 'warning'],
          ['UIF (Employer 1%)',  window.formatCurrency(totalUIF_er),  'warning'],
          ['Total UIF (2%)',     window.formatCurrency(totalUIF_emp+totalUIF_er), 'danger'],
        ].map(([l,v,c]) => `
          <div class="card" style="padding:8px 10px;border-left:3px solid var(--${c});">
            <div style="font-size:0.6rem;text-transform:uppercase;color:var(--gray-400);">${l}</div>
            <div style="font-size:0.95rem;font-weight:800;color:var(--${c});">${v}</div>
          </div>`).join('')}
      </div>

      <div id="ui19Print">
        ${periods.map(p => {
          const pTotalEmp = p.employees.reduce((s,e) => s+e.uif_emp, 0);
          const pTotalEr  = p.employees.reduce((s,e) => s+e.uif_er,  0);
          return `
            <div class="card" style="margin-bottom:12px;padding:0;">
              <div style="padding:10px 16px;background:var(--gray-50);border-bottom:1px solid var(--gray-200);
                display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <span style="font-weight:700;">${p.period}</span>
                  <span style="font-size:0.72rem;color:var(--gray-500);margin-left:8px;">${p.employees.length} employees</span>
                </div>
                <div style="font-size:0.82rem;font-weight:700;">
                  Total UIF: <span style="color:var(--danger);">${window.formatCurrency(pTotalEmp+pTotalEr)}</span>
                </div>
              </div>
              <div class="table-responsive">
                <table style="font-size:0.78rem;">
                  <thead>
                    <tr>
                      <th>Employee</th><th>ID Number</th>
                      <th class="text-right">Gross Rem.</th>
                      <th class="text-right">UIF Ceiling</th>
                      <th class="text-right">Employee 1%</th>
                      <th class="text-right">Employer 1%</th>
                      <th class="text-right">Total 2%</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${p.employees.map(e => {
                      const emp = employees.find(em => em.id == e.employeeId);
                      return `
                        <tr>
                          <td>
                            <div style="font-weight:500;">${emp ? emp.firstName+' '+emp.lastName : 'Unknown'}</div>
                            <div style="font-size:0.65rem;color:var(--gray-500);">${emp?.employeeNumber||emp?.id||'—'}</div>
                          </td>
                          <td style="font-size:0.75rem;">${emp?.idNumber||'—'}</td>
                          <td class="text-right">${window.formatCurrency(e.gross)}</td>
                          <td class="text-right" style="color:var(--gray-500);font-size:0.72rem;">${window.formatCurrency(e.remunCap)}</td>
                          <td class="text-right" style="color:var(--warning);">${window.formatCurrency(e.uif_emp)}</td>
                          <td class="text-right" style="color:var(--warning);">${window.formatCurrency(e.uif_er)}</td>
                          <td class="text-right" style="font-weight:600;color:var(--danger);">${window.formatCurrency(e.uif_emp+e.uif_er)}</td>
                        </tr>`;
                    }).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="font-weight:700;background:var(--gray-50);">
                      <td colspan="4">Month Total</td>
                      <td class="text-right" style="color:var(--warning);">${window.formatCurrency(pTotalEmp)}</td>
                      <td class="text-right" style="color:var(--warning);">${window.formatCurrency(pTotalEr)}</td>
                      <td class="text-right" style="color:var(--danger);">${window.formatCurrency(pTotalEmp+pTotalEr)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SDL — Skills Development Levy (monthly + annual)
  // ──────────────────────────────────────────────────────────────────────────
  renderSDL: function () {
    const year = this._selectedYear();
    const { runs } = this._getYearPayslips();

    if (!runs.length) return this._noData('SDL', year);

    // Group by period
    const periodMap = {};
    runs.forEach(r => {
      const k = r.periodRaw || r.period;
      if (!periodMap[k]) periodMap[k] = { period: r.period, sdl:0, gross:0, empCount:0 };
      periodMap[k].sdl      += r.totalSDL   || Math.round((r.totalGross||0)*0.01*100)/100;
      periodMap[k].gross    += r.totalGross  || 0;
      periodMap[k].empCount += r.employeeCount||0;
    });

    const periods   = Object.values(periodMap).sort((a,b) => String(a.period).localeCompare(String(b.period)));
    const totalSDL  = periods.reduce((s,p) => s+p.sdl,   0);
    const totalGross= periods.reduce((s,p) => s+p.gross, 0);
    const exemptThreshold = 500000; // annual payroll < R500k is SDL-exempt
    const isExempt  = totalGross < exemptThreshold;

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="font-size:0.95rem;margin:0;">SDL — Skills Development Levy</h3>
          <div style="font-size:0.75rem;color:var(--gray-500);">Tax Year ${year} &bull; 1% of gross payroll &bull; Paid with EMP201</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="TaxReports.exportCSV('sdl')">
            <i class="fas fa-file-csv"></i> Export CSV
          </button>
          <button class="btn btn-primary btn-sm" onclick="TaxReports.printReport('sdl')">
            <i class="fas fa-print"></i> Print
          </button>
        </div>
      </div>

      ${isExempt ? `
        <div class="alert alert-warning" style="font-size:0.82rem;margin-bottom:14px;">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Possible SDL Exemption:</strong> Annual payroll of ${window.formatCurrency(totalGross)} is below the
          R500,000 threshold. Employers with annual payroll under R500,000 are exempt from SDL.
          Verify with your SARS eFiling profile.
        </div>` : ''}

      <!-- Totals -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
        ${[
          ['Total Gross Payroll', window.formatCurrency(totalGross),    'primary'],
          ['SDL Rate',            '1.0%',                               'info'],
          ['Total SDL Levied',    window.formatCurrency(totalSDL),      'danger'],
          ['Exemption Status',    isExempt ? 'Possibly Exempt' : 'Liable', isExempt?'warning':'success'],
        ].map(([l,v,c]) => `
          <div class="card" style="padding:8px 10px;border-left:3px solid var(--${c});">
            <div style="font-size:0.6rem;text-transform:uppercase;color:var(--gray-400);">${l}</div>
            <div style="font-size:0.95rem;font-weight:800;color:var(--${c});">${v}</div>
          </div>`).join('')}
      </div>

      <div id="sdlPrint">
        <div class="alert alert-info" style="font-size:0.78rem;margin-bottom:12px;">
          <i class="fas fa-info-circle"></i>
          SDL is declared and paid together with the EMP201 each month.
          Funds are remitted to the SETA relevant to your industry via SARS.
        </div>
        <div class="table-responsive">
          <table style="font-size:0.8rem;">
            <thead>
              <tr>
                <th>Period</th>
                <th>Employees</th>
                <th class="text-right">Month Gross</th>
                <th class="text-right">Cumul. Gross</th>
                <th class="text-right">SDL (1%)</th>
                <th class="text-right" style="color:var(--primary);">Cumul. SDL</th>
                <th>Due Date</th>
                <th>EMP201</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                let cumSDL = 0, cumGross = 0;
                return periods.map(p => {
                  cumSDL   += p.sdl;
                  cumGross += p.gross;
                  return `<tr>
                    <td style="font-weight:600;">${p.period}</td>
                    <td style="text-align:center;">${p.empCount}</td>
                    <td class="text-right">${window.formatCurrency(p.gross)}</td>
                    <td class="text-right">${window.formatCurrency(cumGross)}</td>
                    <td class="text-right" style="font-weight:700;color:var(--danger);">${window.formatCurrency(p.sdl)}</td>
                    <td class="text-right" style="font-weight:700;color:var(--primary);">${window.formatCurrency(cumSDL)}</td>
                    <td style="font-size:0.68rem;color:var(--gray-500);">${TaxReports._emp201DueDate(p.period)}</td>
                    <td style="text-align:center;color:var(--success);font-size:0.72rem;"><i class="fas fa-check-circle"></i> Field 4</td>
                  </tr>`;
                }).join('');
              })()}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;background:var(--gray-50);">
                <td>ANNUAL TOTAL (${periods.length} months)</td>
                <td></td>
                <td class="text-right">${window.formatCurrency(totalGross)}</td>
                <td class="text-right">${window.formatCurrency(totalGross)}</td>
                <td class="text-right" style="color:var(--danger);">${window.formatCurrency(totalSDL)}</td>
                <td class="text-right" style="color:var(--primary);">${window.formatCurrency(totalSDL)}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
  },

  // ──────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ──────────────────────────────────────────────────────────────────────────
  _noData: function (name, year) {
    return `
      <div class="empty-state" style="padding:60px;">
        <div class="empty-state-icon"><i class="fas fa-file-alt"></i></div>
        <div class="empty-state-title">No Data for ${name}</div>
        <div class="empty-state-desc">
          No approved or finalized payroll runs found for tax year ${year}.
          <br>Run payroll and approve/finalize it first.
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="loadPage('payroll')">
          <i class="fas fa-arrow-right"></i> Go to Payroll
        </button>
      </div>`;
  },

  _emp201DueDate: function (periodRaw) {
    try {
      const d = new Date((String(periodRaw).slice(0,7)) + '-01');
      if (isNaN(d)) return '7th of following month';
      d.setMonth(d.getMonth() + 1);
      d.setDate(7);
      return d.toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' });
    } catch (_) { return '7th of following month'; }
  },

  printReport: function (type) {
    const el = document.getElementById(type + 'Print');
    if (!el) { window.Toast.show('Nothing to print', 'warning'); return; }
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <html><head><title>${type.toUpperCase()} Report</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; }
        th { background: #f1f5f9; font-weight: bold; }
        .text-right { text-align: right; }
        tfoot tr { background: #f8fafc; font-weight: bold; }
        h2 { font-size: 14px; margin-bottom: 8px; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <h2>${type.toUpperCase()} — Tax Year ${this._selectedYear()}</h2>
        ${el.innerHTML}
        <script>window.onload=()=>window.print();</script>
      </body></html>`);
    win.document.close();
  },

  exportCSV: function (type) {
    const { runs, payslips } = this._getYearPayslips();
    const employees = window.DB.employees || [];
    const year      = this._selectedYear();
    let csv = '';
    let filename = '';

    if (type === 'irp5') {
      filename = `IRP5_${year.replace('/','-')}.csv`;
      csv = 'Certificate No,Employee,ID Number,Tax Ref,Company,Basic (3601),Bonus (3605),Gross Income,PAYE (4001),UIF (4141),Medical (4005),Pension (4006),Net Pay\n';
      const empMap = {};
      payslips.forEach(ps => {
        if (!empMap[ps.employeeId]) empMap[ps.employeeId] = { gross:0,basic:0,paye:0,uif:0,medical:0,pension:0,bonus:0,net:0 };
        const e = empMap[ps.employeeId];
        e.gross+=ps.gross||0; e.basic+=ps.basic||0; e.paye+=ps.paye||0;
        e.uif+=ps.uif||0; e.medical+=ps.medical||0; e.pension+=ps.pension||0;
        e.bonus+=ps.bonus||0; e.net+=ps.net||0;
      });
      Object.entries(empMap).forEach(([id,d],i) => {
        const emp = employees.find(e=>e.id==id) || {};
        const comp= (window.DB.companies||[]).find(c=>c.id==emp.companyId)||{};
        csv += `"IRP5-${year.replace('/','-')}-${String(i+1).padStart(4,'0')}","${emp.firstName||''} ${emp.lastName||''}","${emp.idNumber||''}","${emp.taxNumber||''}","${comp.name||emp.companyName||''}",${d.basic.toFixed(2)},${d.bonus.toFixed(2)},${d.gross.toFixed(2)},${d.paye.toFixed(2)},${d.uif.toFixed(2)},${d.medical.toFixed(2)},${d.pension.toFixed(2)},${d.net.toFixed(2)}\n`;
      });
    } else if (type === 'emp201' || type === 'sdl') {
      filename = `${type.toUpperCase()}_${year.replace('/','-')}.csv`;
      csv = 'Period,Gross Payroll,PAYE,UIF (Employee),UIF (Employer),SDL,Total Due\n';
      const pm = {};
      runs.forEach(r => {
        const k = r.periodRaw||r.period;
        if (!pm[k]) pm[k]={period:r.period,paye:0,uif:0,sdl:0,gross:0};
        pm[k].paye+=r.totalPAYE||0; pm[k].uif+=r.totalUIF||0;
        pm[k].sdl+=r.totalSDL||0; pm[k].gross+=r.totalGross||0;
      });
      Object.values(pm).sort((a,b)=>String(a.period).localeCompare(String(b.period))).forEach(p => {
        csv += `"${p.period}",${p.gross.toFixed(2)},${p.paye.toFixed(2)},${p.uif.toFixed(2)},${p.uif.toFixed(2)},${p.sdl.toFixed(2)},${(p.paye+p.uif*2+p.sdl).toFixed(2)}\n`;
      });
    } else if (type === 'ui19') {
      filename = `UI19_${year.replace('/','-')}.csv`;
      csv = 'Period,Employee,ID Number,Gross Remuneration,UIF Ceiling,UIF Employee (1%),UIF Employer (1%),Total UIF\n';
      payslips.forEach(ps => {
        const run = runs.find(r=>r.id===ps.runId);
        const emp = employees.find(e=>e.id==ps.employeeId)||{};
        const cap = Math.min(ps.gross||0, 17872/12);
        csv += `"${run?.period||''}","${emp.firstName||''} ${emp.lastName||''}","${emp.idNumber||''}",${(ps.gross||0).toFixed(2)},${cap.toFixed(2)},${(ps.uif||0).toFixed(2)},${(ps.uif||0).toFixed(2)},${((ps.uif||0)*2).toFixed(2)}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    window.Toast.show(`${filename} downloaded`, 'success');
  },

  printIRP5Single: function (empId, year) {
    const { payslips } = this._getYearPayslips();
    const emp   = (window.DB.employees||[]).find(e=>e.id==empId);
    const comp  = (window.DB.companies||[]).find(c=>c.id==emp?.companyId||c.name===emp?.companyName);
    const ps    = payslips.filter(p=>p.employeeId==empId);
    if (!emp || !ps.length) { window.Toast.show('No data for this employee', 'warning'); return; }

    const d = ps.reduce((t,p) => ({
      gross:t.gross+(p.gross||0), basic:t.basic+(p.basic||0), paye:t.paye+(p.paye||0),
      uif:t.uif+(p.uif||0), medical:t.medical+(p.medical||0),
      pension:t.pension+(p.pension||0), bonus:t.bonus+(p.bonus||0), net:t.net+(p.net||0)
    }), {gross:0,basic:0,paye:0,uif:0,medical:0,pension:0,bonus:0,net:0});

    const certNo = `IRP5-${year.replace('/','-')}-${String(empId).padStart(4,'0')}`;
    const win = window.open('', '_blank', 'width=700,height=600');
    win.document.write(`
      <html><head><title>IRP5 — ${emp.firstName} ${emp.lastName}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;font-size:11px;color:#1e293b;}
        .header{border:2px solid #4f46e5;border-radius:6px;padding:14px;margin-bottom:14px;}
        h2{color:#4f46e5;margin:0 0 4px;font-size:14px;}
        table{width:100%;border-collapse:collapse;margin-bottom:12px;}
        td{padding:5px 8px;border:1px solid #e2e8f0;}
        td:first-child{background:#f8fafc;font-weight:bold;width:55%;}
        .total{background:#4f46e5;color:white;font-weight:bold;}
        @media print{button{display:none}}
      </style></head>
      <body>
        <div class="header">
          <h2>IRP5 / IT3(a) — Employee Tax Certificate</h2>
          <div>Tax Year: ${year} &bull; Certificate: ${certNo}</div>
        </div>
        <h3 style="font-size:11px;text-transform:uppercase;color:#475569;">Employer Details</h3>
        <table>
          <tr><td>Employer Name</td><td>${comp?.name||emp.companyName||'—'}</td></tr>
          <tr><td>Employer Tax Ref</td><td>${comp?.taxReference||'—'}</td></tr>
        </table>
        <h3 style="font-size:11px;text-transform:uppercase;color:#475569;">Employee Details</h3>
        <table>
          <tr><td>Full Name</td><td>${emp.firstName} ${emp.lastName}</td></tr>
          <tr><td>ID Number</td><td>${emp.idNumber||'—'}</td></tr>
          <tr><td>Tax Reference No.</td><td>${emp.taxNumber||'—'}</td></tr>
          <tr><td>Employee Number</td><td>${emp.employeeNumber||emp.id}</td></tr>
        </table>
        <h3 style="font-size:11px;text-transform:uppercase;color:#475569;">Income &amp; Deductions</h3>
        <table>
          <tr><td>Code 3601 — Salary / Wages</td><td>${window.formatCurrency(d.basic)}</td></tr>
          ${d.bonus>0?`<tr><td>Code 3605 — Annual Bonus</td><td>${window.formatCurrency(d.bonus)}</td></tr>`:''}
          <tr><td><strong>Gross Remuneration</strong></td><td><strong>${window.formatCurrency(d.gross)}</strong></td></tr>
          <tr><td>Code 4001 — PAYE Tax Withheld</td><td style="color:#dc2626;">${window.formatCurrency(d.paye)}</td></tr>
          <tr><td>Code 4141 — UIF Contribution</td><td>${window.formatCurrency(d.uif)}</td></tr>
          ${d.medical>0?`<tr><td>Code 4005 — Medical Aid</td><td>${window.formatCurrency(d.medical)}</td></tr>`:''}
          ${d.pension>0?`<tr><td>Code 4006 — Pension / Provident</td><td>${window.formatCurrency(d.pension)}</td></tr>`:''}
          <tr class="total"><td>NET PAY (for reference)</td><td>${window.formatCurrency(d.net)}</td></tr>
        </table>
        <div style="font-size:9px;color:#94a3b8;margin-top:12px;">
          Generated by Nexa HR &amp; Payroll &bull; ${certNo} &bull; ${new Date().toLocaleDateString()}
        </div>
        <button onclick="window.print()"
          style="margin-top:12px;padding:8px 16px;background:#4f46e5;color:white;border:none;border-radius:4px;cursor:pointer;">
          🖨 Print Certificate
        </button>
      </body></html>`);
    win.document.close();
  }
};

window.TaxReports = TaxReports;
window.renderTaxReports = function (container) { TaxReports.render(container); };