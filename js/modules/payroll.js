// ─────────────────────────────────────────────────────────────────────────────
// Nexa HR & Payroll — js/modules/payroll.js
// Full payroll processing: create runs, calculate tax, approve, pay, send payslips
// ─────────────────────────────────────────────────────────────────────────────

const Payroll = {

  // ── Active tab state ───────────────────────────────────────────────────────
  _tab: 'runs',

  // ─────────────────────────────────────────────────────────────────────────
  // ENTRY POINT
  // ─────────────────────────────────────────────────────────────────────────
  render: function (container) {
    const runs      = window.DB.payrollRuns  || [];
    const employees = window.DB.employees    || [];
    const companies = window.DB.companies    || [];

    const pending    = runs.filter(r => r.status === 'Pending Approval');
    const approved   = runs.filter(r => r.status === 'Approved');
    const finalized  = runs.filter(r => r.status === 'Finalized' || r.status === 'Paid');
    const totalNet   = runs.reduce((s,r) => s + (r.totalNet  || 0), 0);
    const totalGross = runs.reduce((s,r) => s + (r.totalGross|| 0), 0);

    container.innerHTML = `
      <!-- Page header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;
                  margin-bottom:18px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.3rem;margin:0;">Payroll Processing</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            ${runs.length} total runs &bull;
            ${pending.length} pending approval &bull;
            ${approved.length} approved
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="Payroll.showBenefitsModal()">
            <i class="fas fa-sliders-h"></i> Benefits &amp; Deductions
          </button>
          <button class="btn btn-primary btn-sm" onclick="Payroll.showCreateRunModal()">
            <i class="fas fa-plus"></i> New Payroll Run
          </button>
        </div>
      </div>

      <!-- KPI cards -->
      <div class="grid-4" style="gap:14px;margin-bottom:20px;">
        <div class="card kpi-card" style="padding:14px;border-left:4px solid var(--primary);">
          <div class="kpi-label">Total Runs</div>
          <div class="kpi-value">${runs.length}</div>
          <div style="font-size:0.72rem;color:var(--gray-400);">All time</div>
        </div>
        <div class="card kpi-card" style="padding:14px;border-left:4px solid var(--warning);">
          <div class="kpi-label">Pending Approval</div>
          <div class="kpi-value" style="color:var(--warning);">${pending.length}</div>
          <div style="font-size:0.72rem;color:var(--gray-400);">Awaiting sign-off</div>
        </div>
        <div class="card kpi-card" style="padding:14px;border-left:4px solid var(--success);">
          <div class="kpi-label">Total Net Paid</div>
          <div class="kpi-value" style="font-size:1.1rem;">${window.formatCurrency(totalNet)}</div>
          <div style="font-size:0.72rem;color:var(--gray-400);">Across all runs</div>
        </div>
        <div class="card kpi-card" style="padding:14px;border-left:4px solid var(--info);">
          <div class="kpi-label">Total Gross</div>
          <div class="kpi-value" style="font-size:1.1rem;">${window.formatCurrency(totalGross)}</div>
          <div style="font-size:0.72rem;color:var(--gray-400);">Across all runs</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="border-bottom:1px solid var(--gray-200);margin-bottom:16px;">
        <button class="tab-btn ${this._tab==='runs'?'active':''}"
          onclick="Payroll._tab='runs';Payroll.render(document.getElementById('content'))">
          <i class="fas fa-list"></i> All Runs
          ${pending.length?`<span class="badge badge-warning" style="margin-left:4px;font-size:0.6rem;">${pending.length}</span>`:''}
        </button>
        <button class="tab-btn ${this._tab==='pending'?'active':''}"
          onclick="Payroll._tab='pending';Payroll.render(document.getElementById('content'))">
          <i class="fas fa-clock"></i> Pending Approval
        </button>
        <button class="tab-btn ${this._tab==='history'?'active':''}"
          onclick="Payroll._tab='history';Payroll.render(document.getElementById('content'))">
          <i class="fas fa-history"></i> History
        </button>
      </div>

      <!-- Tab content -->
      <div id="payrollTabContent">
        ${this._tab === 'runs'    ? this.renderAllRuns(runs, employees, companies)    : ''}
        ${this._tab === 'pending' ? this.renderPendingSection(pending, employees)     : ''}
        ${this._tab === 'history' ? this.renderHistory(finalized, employees, companies): ''}
      </div>`;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ALL RUNS TAB
  // ─────────────────────────────────────────────────────────────────────────
  renderAllRuns: function (runs, employees, companies) {
    if (!runs.length) return this._emptyState(
      'fas fa-file-invoice-dollar',
      'No Payroll Runs Yet',
      'Create your first payroll run to process employee salaries.',
      `<button class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="Payroll.showCreateRunModal()">
        <i class="fas fa-plus"></i> New Payroll Run
      </button>`
    );

    const statusColors = {
      'Draft':            'gray',
      'Pending Approval': 'warning',
      'Approved':         'success',
      'Finalized':        'success',
      'Paid':             'teal',
      'Rejected':         'danger'
    };

    const sorted = [...runs].sort((a,b) => String(b.id).localeCompare(String(a.id)));

    return `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Company</th>
              <th>Frequency</th>
              <th>Employees</th>
              <th class="text-right">Gross Pay</th>
              <th class="text-right">Total PAYE</th>
              <th class="text-right">Net Pay</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(r => {
              const sc = statusColors[r.status] || 'gray';
              const canApprove  = r.status === 'Pending Approval';
              const canFinalize = r.status === 'Approved';
              const canPay      = r.status === 'Finalized';
              const isDone      = r.status === 'Paid';

              return `
                <tr>
                  <td>
                    <div style="font-weight:700;">${r.period}</div>
                    <div style="font-size:0.7rem;color:var(--gray-400);">${r.runDate||'—'}</div>
                  </td>
                  <td style="font-size:0.83rem;">${r.company || '—'}</td>
                  <td>
                    <span class="badge badge-info" style="font-size:0.65rem;">
                      ${r.payFrequency || 'Monthly'}
                    </span>
                  </td>
                  <td style="text-align:center;">${r.employeeCount || 0}</td>
                  <td class="text-right" style="font-size:0.83rem;">${window.formatCurrency(r.totalGross||0)}</td>
                  <td class="text-right" style="font-size:0.83rem;color:var(--danger);">${window.formatCurrency(r.totalPAYE||0)}</td>
                  <td class="text-right" style="font-weight:700;color:var(--success);">${window.formatCurrency(r.totalNet||0)}</td>
                  <td><span class="badge badge-${sc}">${r.status}</span></td>
                  <td>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                      <button class="btn-icon" title="View Payslips"
                        onclick="Payroll.viewRunDetail('${r.id}')">
                        <i class="fas fa-eye"></i>
                      </button>
                      ${canApprove ? `
                        <button class="btn btn-xs btn-success" onclick="Payroll.approveRun('${r.id}')">
                          <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-xs btn-outline" style="color:var(--danger);"
                          onclick="Payroll.rejectRun('${r.id}')">
                          <i class="fas fa-times"></i>
                        </button>` : ''}
                      ${canFinalize ? `
                        <button class="btn btn-xs btn-primary" onclick="Payroll.finalizeRun('${r.id}')">
                          <i class="fas fa-lock"></i> Finalize
                        </button>` : ''}
                      ${canPay || r.status === 'Approved' ? `
                        <button class="btn btn-xs btn-outline" onclick="Payroll.generateBankFileForRun('${r.id}')"
                          title="Generate Bank File">
                          <i class="fas fa-file-download"></i>
                        </button>
                        <button class="btn btn-xs btn-outline" onclick="Payslips && Payslips.sendAllPayslips('${r.id}')"
                          title="Send Payslips" style="color:var(--success);border-color:var(--success);">
                          <i class="fas fa-paper-plane"></i>
                        </button>` : ''}
                      ${canPay ? `
                        <button class="btn btn-xs btn-primary" onclick="Payroll.markAsPaid('${r.id}')">
                          <i class="fas fa-money-bill-wave"></i> Paid
                        </button>` : ''}
                      ${!isDone ? `
                        <button class="btn-icon" title="Delete" style="color:var(--danger);"
                          onclick="Payroll.deleteRun('${r.id}')">
                          <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PENDING APPROVAL TAB
  // ─────────────────────────────────────────────────────────────────────────
  renderPendingSection: function (pending, employees) {
    if (!pending.length) return `
      <div style="text-align:center;padding:60px;color:var(--gray-400);">
        <i class="fas fa-check-circle" style="font-size:2.5rem;display:block;margin-bottom:12px;color:var(--success);"></i>
        <div style="font-size:1rem;font-weight:600;">All clear!</div>
        <div style="font-size:0.85rem;margin-top:4px;">No payroll runs awaiting approval.</div>
      </div>`;

    return `
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${pending.map(r => {
          const comp    = (window.DB.companies||[]).find(c => c.id == r.companyId);
          const empList = employees.filter(e =>
            (e.companyName === r.company || e.companyId == r.companyId) && e.status !== 'Terminated'
          );

          return `
            <div class="card" style="border-left:4px solid var(--warning);padding:0;overflow:hidden;">
              <!-- Run header -->
              <div style="padding:14px 18px;background:var(--gray-50);border-bottom:1px solid var(--gray-200);
                          display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="width:42px;height:42px;background:var(--warning-soft,#fef3c7);border-radius:8px;
                              display:flex;align-items:center;justify-content:center;color:#d97706;font-size:1rem;">
                    <i class="fas fa-clock"></i>
                  </div>
                  <div>
                    <div style="font-size:1rem;font-weight:700;">${r.period}</div>
                    <div style="font-size:0.75rem;color:var(--gray-500);">
                      ${r.company || '—'} &bull;
                      <span class="badge badge-info" style="font-size:0.6rem;">${r.payFrequency||'Monthly'}</span> &bull;
                      ${r.employeeCount||0} employees &bull; Run: ${r.runDate||'—'}
                    </div>
                  </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <div style="text-align:right;">
                    <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-400);">Net Pay</div>
                    <div style="font-size:1.1rem;font-weight:800;color:var(--success);">${window.formatCurrency(r.totalNet||0)}</div>
                  </div>
                  <button class="btn btn-outline btn-sm" onclick="Payroll.viewRunDetail('${r.id}')">
                    <i class="fas fa-list"></i> View
                  </button>
                  <button class="btn btn-outline btn-sm" onclick="Payroll.sendApprovalEmail('${r.id}')">
                    <i class="fas fa-envelope"></i> Email
                  </button>
                  <button class="btn btn-xs btn-outline" style="color:var(--danger);border-color:var(--danger);"
                    onclick="Payroll.rejectRun('${r.id}')">
                    <i class="fas fa-times"></i> Reject
                  </button>
                  <button class="btn btn-sm btn-success" onclick="Payroll.approveRun('${r.id}')">
                    <i class="fas fa-check"></i> Approve
                  </button>
                </div>
              </div>

              <!-- Summary grid -->
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
                          gap:0;padding:14px 18px;">
                ${[
                  ['Gross Pay',     window.formatCurrency(r.totalGross||0), 'primary'],
                  ['Total PAYE',    window.formatCurrency(r.totalPAYE||0),  'danger'],
                  ['Total UIF',     window.formatCurrency(r.totalUIF||0),   'warning'],
                  ['Net Pay',       window.formatCurrency(r.totalNet||0),   'success'],
                  ['SDL (Employer)',window.formatCurrency(r.totalSDL||0),   'info'],
                ].map(([label,val,color]) => `
                  <div style="padding:8px 12px;">
                    <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-400);margin-bottom:3px;">${label}</div>
                    <div style="font-size:0.9rem;font-weight:700;color:var(--${color});">${val}</div>
                  </div>`).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HISTORY TAB
  // ─────────────────────────────────────────────────────────────────────────
  renderHistory: function (runs, employees, companies) {
    if (!runs.length) return this._emptyState(
      'fas fa-history', 'No Finalized Runs', 'Runs that have been finalized or paid will appear here.'
    );

    const sorted = [...runs].sort((a,b) => String(b.id).localeCompare(String(a.id)));

    return `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Period</th><th>Company</th><th>Frequency</th>
              <th>Employees</th><th class="text-right">Gross</th>
              <th class="text-right">PAYE</th><th class="text-right">Net</th>
              <th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(r => {
              const canBankFile = r.status === 'Finalized' || r.status === 'Paid' || r.status === 'Approved';
              return `
                <tr>
                  <td><div style="font-weight:700;">${r.period}</div>
                    <div style="font-size:0.7rem;color:var(--gray-400);">${r.runDate||'—'}</div></td>
                  <td style="font-size:0.82rem;">${r.company||'—'}</td>
                  <td><span class="badge badge-info" style="font-size:0.6rem;">${r.payFrequency||'Monthly'}</span></td>
                  <td style="text-align:center;">${r.employeeCount||0}</td>
                  <td class="text-right">${window.formatCurrency(r.totalGross||0)}</td>
                  <td class="text-right" style="color:var(--danger);">${window.formatCurrency(r.totalPAYE||0)}</td>
                  <td class="text-right" style="font-weight:700;color:var(--success);">${window.formatCurrency(r.totalNet||0)}</td>
                  <td><span class="badge badge-${r.status==='Paid'?'teal':'success'}">${r.status}</span></td>
                  <td>
                    <div style="display:flex;gap:4px;">
                      <button class="btn-icon" onclick="Payroll.viewRunDetail('${r.id}')" title="View">
                        <i class="fas fa-eye"></i>
                      </button>
                      ${canBankFile ? `
                        <button class="btn-icon" onclick="Payroll.generateBankFileForRun('${r.id}')" title="Bank File">
                          <i class="fas fa-file-download"></i>
                        </button>
                        <button class="btn-icon" style="color:var(--success);"
                          onclick="Payslips && Payslips.sendAllPayslips('${r.id}')" title="Send Payslips">
                          <i class="fas fa-paper-plane"></i>
                        </button>` : ''}
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE PAYROLL RUN MODAL
  // ─────────────────────────────────────────────────────────────────────────
  showCreateRunModal: function () {
    const companies = window.DB.companies || [];
    const today = new Date();
    const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;

    const html = `
      <div class="card" style="width:100%;max-width:680px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-plus text-primary"></i> New Payroll Run</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('createRunModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <!-- Step 1: Setup -->
          <div style="margin-bottom:20px;padding:14px;background:var(--gray-50);border-radius:8px;
                      border:1px solid var(--gray-200);">
            <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.5px;
                        color:var(--gray-500);font-weight:700;margin-bottom:12px;">
              1. Run Configuration
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Company *</label>
                <select id="run_company" class="form-control"
                  onchange="Payroll._onCompanyChange(this.value)">
                  <option value="">— Select Company —</option>
                  ${companies.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Pay Frequency</label>
                <select id="run_frequency" class="form-control">
                  <option value="Monthly">Monthly</option>
                  <option value="Bi-Weekly">Bi-Weekly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Fortnightly">Fortnightly</option>
                </select>
                <div class="form-hint">Auto-filled from company settings</div>
              </div>
              <div class="form-group">
                <label class="form-label">Pay Period *</label>
                <input id="run_period" type="month" class="form-control" value="${defaultPeriod}">
              </div>
              <div class="form-group">
                <label class="form-label">Run Date</label>
                <input id="run_date" type="date" class="form-control"
                  value="${today.toISOString().split('T')[0]}">
              </div>
            </div>
          </div>

          <!-- Step 2: Preview / adjust employee list -->
          <div style="margin-bottom:20px;">
            <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.5px;
                        color:var(--gray-500);font-weight:700;margin-bottom:10px;">
              2. Employees &amp; Calculated Values
            </div>
            <div id="runEmployeePreview" style="max-height:360px;overflow-y:auto;border:1px solid var(--gray-200);
                border-radius:8px;background:white;">
              <div style="padding:40px;text-align:center;color:var(--gray-400);">
                <i class="fas fa-users" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>
                Select a company to load employees
              </div>
            </div>
          </div>

          <!-- Totals preview -->
          <div id="runTotalsPreview" style="display:none;margin-bottom:16px;
            background:var(--primary-soft);padding:14px;border-radius:8px;border:1px solid var(--primary);">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;">
              <div style="text-align:center;">
                <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);">Employees</div>
                <div id="tot_count" style="font-size:1.2rem;font-weight:800;">0</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);">Gross Pay</div>
                <div id="tot_gross" style="font-size:1.1rem;font-weight:800;color:var(--primary);">R 0</div>
              </div>
              <div style="font-size:0;text-align:center;">
                <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);">Total PAYE</div>
                <div id="tot_paye" style="font-size:1.1rem;font-weight:800;color:var(--danger);">R 0</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);">Total UIF</div>
                <div id="tot_uif" style="font-size:1.1rem;font-weight:800;color:var(--warning);">R 0</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);">Net Pay</div>
                <div id="tot_net" style="font-size:1.3rem;font-weight:900;color:var(--success);">R 0</div>
              </div>
            </div>
          </div>

          <!-- Approval email option -->
          <div class="form-group" style="margin-bottom:0;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.85rem;">
              <input type="checkbox" id="run_sendEmail" style="width:16px;height:16px;" checked>
              Send payroll approval email to company after creating run
            </label>
          </div>

          <button class="btn btn-primary" style="width:100%;margin-top:16px;"
            onclick="Payroll.createRun()">
            <i class="fas fa-paper-plane"></i> Create Payroll Run &amp; Submit for Approval
          </button>
        </div>
      </div>`;
    window.showModal('createRunModal', html);
    this._runCalcs = {};
  },

  // Called when company dropdown changes
  _onCompanyChange: function (companyId) {
    if (!companyId) return;
    const comp = (window.DB.companies||[]).find(c => c.id == companyId);
    if (!comp) return;

    // Auto-fill frequency from company
    const freqEl = document.getElementById('run_frequency');
    if (freqEl && comp.payFrequency) freqEl.value = comp.payFrequency;

    // Load and calculate employees
    const employees = (window.DB.employees||[]).filter(e =>
      (e.companyId == companyId || e.companyName === comp.name) &&
      e.status !== 'Terminated'
    );

    this._renderEmployeePreview(employees, comp);
  },

  _renderEmployeePreview: function (employees, comp) {
    const preview = document.getElementById('runEmployeePreview');
    if (!preview) return;

    if (!employees.length) {
      preview.innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--gray-400);">
          <i class="fas fa-user-slash" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>
          No active employees found for this company.
          <br><small>Add employees first, then create a payroll run.</small>
        </div>`;
      return;
    }

    this._runCalcs = {};
    let totGross = 0, totPAYE = 0, totUIF = 0, totNet = 0;

    const rows = employees.map(emp => {
      const c     = this.calculateTax(emp);
      this._runCalcs[emp.id] = { emp, ...c };
      totGross += c.gross;
      totPAYE  += c.paye;
      totUIF   += c.uif;
      totNet   += c.net;

      return `
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 70px;
                    gap:0;align-items:center;padding:8px 12px;border-bottom:1px solid var(--gray-100);"
             data-empid="${emp.id}" class="preview-row">
          <div>
            <div style="font-weight:600;font-size:0.82rem;">${emp.firstName} ${emp.lastName}</div>
            <div style="font-size:0.68rem;color:var(--gray-500);">${emp.position||'—'}</div>
          </div>
          <div style="text-align:right;font-size:0.8rem;">${window.formatCurrency(c.gross)}</div>
          <div style="text-align:right;font-size:0.8rem;color:var(--danger);">${window.formatCurrency(c.paye)}</div>
          <div style="text-align:right;font-size:0.8rem;color:var(--warning);">${window.formatCurrency(c.uif)}</div>
          <div style="text-align:right;font-size:0.8rem;font-weight:700;color:var(--success);">${window.formatCurrency(c.net)}</div>
          <div style="text-align:center;">
            <label style="cursor:pointer;">
              <input type="checkbox" data-empid="${emp.id}" class="run-emp-chk" checked
                onchange="Payroll._updateRunTotals()">
            </label>
          </div>
        </div>`;
    }).join('');

    preview.innerHTML = `
      <!-- Header row -->
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 70px;
                  gap:0;padding:8px 12px;background:var(--gray-100);border-bottom:2px solid var(--gray-200);">
        <div style="font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);font-weight:700;">Employee</div>
        <div style="text-align:right;font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);font-weight:700;">Gross</div>
        <div style="text-align:right;font-size:0.65rem;text-transform:uppercase;color:var(--danger);font-weight:700;">PAYE</div>
        <div style="text-align:right;font-size:0.65rem;text-transform:uppercase;color:var(--warning);font-weight:700;">UIF</div>
        <div style="text-align:right;font-size:0.65rem;text-transform:uppercase;color:var(--success);font-weight:700;">Net Pay</div>
        <div style="text-align:center;font-size:0.65rem;text-transform:uppercase;color:var(--gray-500);font-weight:700;">Include</div>
      </div>
      ${rows}`;

    // Show totals
    const totBox = document.getElementById('runTotalsPreview');
    if (totBox) totBox.style.display = 'block';
    this._updateRunTotals();
  },

  _updateRunTotals: function () {
    const checked = [...document.querySelectorAll('.run-emp-chk:checked')];
    const ids = checked.map(cb => parseInt(cb.dataset.empid));

    let totGross=0, totPAYE=0, totUIF=0, totNet=0;
    ids.forEach(id => {
      const c = this._runCalcs?.[id];
      if (!c) return;
      totGross += c.gross;
      totPAYE  += c.paye;
      totUIF   += c.uif;
      totNet   += c.net;
    });

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('tot_count', ids.length);
    set('tot_gross', window.formatCurrency(totGross));
    set('tot_paye',  window.formatCurrency(totPAYE));
    set('tot_uif',   window.formatCurrency(totUIF));
    set('tot_net',   window.formatCurrency(totNet));
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE THE RUN
  // ─────────────────────────────────────────────────────────────────────────
  createRun: function () {
    const compId   = document.getElementById('run_company')?.value;
    const period   = document.getElementById('run_period')?.value;
    const freq     = document.getElementById('run_frequency')?.value || 'Monthly';
    const runDate  = document.getElementById('run_date')?.value;
    const sendEmail= document.getElementById('run_sendEmail')?.checked ?? true;

    if (!compId)  { window.showAlert('Required', 'Please select a company.'); return; }
    if (!period)  { window.showAlert('Required', 'Please select a pay period.'); return; }

    const comp = (window.DB.companies||[]).find(c => c.id == compId);
    if (!comp) { window.showAlert('Error', 'Company not found.'); return; }

    // Get checked employees
    const checkedIds = [...document.querySelectorAll('.run-emp-chk:checked')]
      .map(cb => parseInt(cb.dataset.empid));

    if (!checkedIds.length) {
      window.showAlert('No Employees', 'At least one employee must be included in the run.'); return;
    }

    // Check for duplicate run (same company + period)
    const existing = (window.DB.payrollRuns||[]).find(r =>
      String(r.companyId) === String(compId) && r.period === period
    );
    if (existing) {
      window.showAlert('Duplicate Run',
        `A payroll run for <strong>${comp.name}</strong> in <strong>${period}</strong> already exists (status: ${existing.status}).`);
      return;
    }

    // Aggregate totals
    let totGross=0, totPAYE=0, totUIF=0, totSDL=0, totNet=0;
    const payslips = [];

    checkedIds.forEach(empId => {
      const c = this._runCalcs?.[empId];
      if (!c) return;
      totGross += c.gross;
      totPAYE  += c.paye;
      totUIF   += c.uif;
      totSDL   += c.sdl;
      totNet   += c.net;

      payslips.push({
        runId:        '', // filled below
        employeeId:   empId,
        period:       period.replace('-', '/').slice(0,7),
        basic:        c.basic,
        gross:        c.gross,
        paye:         c.paye,
        uif:          c.uif,
        medical:      c.medical,
        pension:      c.pension,
        garnishee:    c.garnishee,
        bonus:        c.bonus,
        otherDeductions: c.otherDeductions,
        net:          c.net,
        customBenefits: c.customBenefits || []
      });
    });

    const runId = 'RUN_' + Date.now();
    payslips.forEach(p => { p.runId = runId; });

    // Build period label e.g. "March 2025"
    const [yr, mo] = period.split('-');
    const periodLabel = new Date(parseInt(yr), parseInt(mo)-1, 1)
      .toLocaleString('default', { month:'long', year:'numeric' });

    const approvalToken = btoa(runId + '_' + Date.now()).replace(/=/g,'');

    const run = {
      id:             runId,
      companyId:      comp.id,
      company:        comp.name,
      period:         periodLabel,
      periodRaw:      period,
      payFrequency:   freq,
      status:         'Pending Approval',
      runDate:        runDate || new Date().toISOString().split('T')[0],
      employeeCount:  checkedIds.length,
      totalGross:     Math.round(totGross * 100) / 100,
      totalPAYE:      Math.round(totPAYE  * 100) / 100,
      totalUIF:       Math.round(totUIF   * 100) / 100,
      totalSDL:       Math.round(totSDL   * 100) / 100,
      totalNet:       Math.round(totNet   * 100) / 100,
      approvalToken,
      createdBy:      window.currentUser?.name || 'Admin',
      createdAt:      new Date().toISOString()
    };

    window.DB.payrollRuns = window.DB.payrollRuns || [];
    window.DB.payrollRuns.push(run);

    window.DB.payslips = window.DB.payslips || [];
    window.DB.payslips.push(...payslips);

    window.DB.save();

    delete this._runCalcs;
    window.closeModal('createRunModal');
    window.Toast.show(
      `Payroll run for ${periodLabel} created — ${checkedIds.length} employees`, 'success'
    );

    // Send approval email
    if (sendEmail && comp.email) {
      this.sendApprovalEmail(runId);
    }

    this._tab = 'pending';
    this.render(document.getElementById('content'));
    if (typeof window.renderNotificationBell === 'function') window.renderNotificationBell();
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SOUTH AFRICAN TAX CALCULATOR
  // 2025/2026 tax year
  // ─────────────────────────────────────────────────────────────────────────
  calculateTax: function (emp) {
    const basic      = Number(emp.basicSalary || 0);
    const bonus      = Number(emp.bonus       || 0);
    const medical    = Number(emp.medicalAid  || emp.medical || 0);
    const pension    = Number(emp.pension     || emp.pensionContribution || 0);
    const garnishee  = Number(emp.garnishee   || 0);

    // Custom benefits from employee record
    const benefits      = window.DB.benefits || [];
    const empBenefits   = benefits.filter(b => b.employeeId == emp.id && b.status === 'Active');
    const customBenefits = empBenefits.map(b => ({
      name: b.name,
      type: b.type,
      calc: b.calculation || b.calc || 'Fixed',
      value: b.value
    }));

    const calcBenVal = (b) => {
      if ((b.calc || b.calculation) === 'Percentage') return (basic * parseFloat(b.value)) / 100;
      return parseFloat(b.value) || 0;
    };

    const allowances   = customBenefits.filter(b => b.type === 'Allowance');
    const deductions   = customBenefits.filter(b => b.type === 'Deduction' || b.type === 'Reimbursement');
    const allowanceSum = allowances.reduce((s,b) => s + calcBenVal(b), 0);
    const deductionSum = deductions.reduce((s,b) => s + calcBenVal(b), 0);

    const gross = basic + bonus + allowanceSum;

    // ── PAYE (SA 2025/2026 brackets) ─────────────────────────────────────
    // Primary rebate: R17,235/year = R1,436.25/month
    // Secondary rebate (65+): R9,444/year
    const PRIMARY_REBATE_ANNUAL = 17235;
    const taxableAnnual = gross * 12;
    let annualTax = 0;

    const brackets = [
      { min: 0,        max: 237100,   rate: 0.18, base: 0       },
      { min: 237101,   max: 370500,   rate: 0.26, base: 42678   },
      { min: 370501,   max: 512800,   rate: 0.31, base: 77362   },
      { min: 512801,   max: 673000,   rate: 0.36, base: 121475  },
      { min: 673001,   max: 857900,   rate: 0.39, base: 179147  },
      { min: 857901,   max: 1817000,  rate: 0.41, base: 251258  },
      { min: 1817001,  max: Infinity, rate: 0.45, base: 644489  }
    ];

    const bracket = [...brackets].reverse().find(b => taxableAnnual > b.min) || brackets[0];
    annualTax = bracket.base + (taxableAnnual - bracket.min) * bracket.rate;
    annualTax = Math.max(0, annualTax - PRIMARY_REBATE_ANNUAL);

    // Medical Aid tax credit
    const medCredit = medical > 0 ? (347 + Math.max(0, medical - 347) * 0.25) * 12 : 0;
    annualTax = Math.max(0, annualTax - medCredit);

    const paye = Math.round((annualTax / 12) * 100) / 100;

    // ── UIF: 1% of gross, capped at R17,872/year = R1,489.33/month ───────
    const UIF_MONTHLY_CAP = 17872 / 12;
    const uif = Math.round(Math.min(gross * 0.01, UIF_MONTHLY_CAP) * 100) / 100;

    // ── SDL: 1% of gross — employer cost, not deducted from employee ──────
    const sdl = Math.round(gross * 0.01 * 100) / 100;

    // ── Total deductions ──────────────────────────────────────────────────
    const totalDeductions = paye + uif + medical + pension + garnishee + deductionSum;
    const net             = Math.max(0, Math.round((gross - totalDeductions) * 100) / 100);

    return {
      basic, gross, bonus, paye, uif, sdl,
      medical, pension, garnishee,
      allowanceSum, deductionSum,
      customBenefits,
      otherDeductions: deductionSum,
      totalDeductions,
      net
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW RUN DETAIL (payslip list for a run)
  // ─────────────────────────────────────────────────────────────────────────
  viewRunDetail: function (runId) {
    const run      = (window.DB.payrollRuns||[]).find(r => r.id === runId);
    if (!run) return;
    const payslips = (window.DB.payslips||[]).filter(p => p.runId === runId);
    const employees= window.DB.employees || [];

    const statusColors = { 'Pending Approval':'warning', 'Approved':'success', 'Finalized':'success', 'Paid':'teal', 'Rejected':'danger' };

    const html = `
      <div class="card" style="width:100%;max-width:900px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <div>
            <h3 class="card-title">Payroll Run — ${run.period}</h3>
            <div style="font-size:0.75rem;color:var(--gray-500);">
              ${run.company} &bull;
              <span class="badge badge-info" style="font-size:0.6rem;">${run.payFrequency||'Monthly'}</span> &bull;
              <span class="badge badge-${statusColors[run.status]||'gray'}">${run.status}</span>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="closeModal('runDetailModal')"><i class="fas fa-times"></i></button>
        </div>

        <!-- Summary bar -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));
                    background:var(--gray-50);border-bottom:1px solid var(--gray-200);">
          ${[
            ['Employees', run.employeeCount||0],
            ['Gross Pay',  window.formatCurrency(run.totalGross||0)],
            ['PAYE',       window.formatCurrency(run.totalPAYE||0)],
            ['UIF',        window.formatCurrency(run.totalUIF||0)],
            ['Net Pay',    window.formatCurrency(run.totalNet||0)],
          ].map(([label,val]) => `
            <div style="padding:12px 14px;border-right:1px solid var(--gray-200);">
              <div style="font-size:0.62rem;text-transform:uppercase;color:var(--gray-400);margin-bottom:3px;">${label}</div>
              <div style="font-size:0.9rem;font-weight:700;">${val}</div>
            </div>`).join('')}
        </div>

        <!-- Action bar -->
        <div style="padding:12px 16px;border-bottom:1px solid var(--gray-200);display:flex;gap:8px;flex-wrap:wrap;">
          ${run.status === 'Pending Approval' ? `
            <button class="btn btn-success btn-sm" onclick="Payroll.approveRun('${runId}');closeModal('runDetailModal')">
              <i class="fas fa-check"></i> Approve Run
            </button>
            <button class="btn btn-outline btn-sm" onclick="Payroll.sendApprovalEmail('${runId}')">
              <i class="fas fa-envelope"></i> Send Approval Email
            </button>
            <button class="btn btn-outline btn-sm" style="color:var(--danger);"
              onclick="Payroll.rejectRun('${runId}');closeModal('runDetailModal')">
              <i class="fas fa-times"></i> Reject
            </button>` : ''}
          ${run.status === 'Approved' ? `
            <button class="btn btn-primary btn-sm" onclick="Payroll.finalizeRun('${runId}');closeModal('runDetailModal')">
              <i class="fas fa-lock"></i> Finalize
            </button>` : ''}
          ${run.status === 'Finalized' ? `
            <button class="btn btn-primary btn-sm" onclick="Payroll.markAsPaid('${runId}');closeModal('runDetailModal')">
              <i class="fas fa-money-bill-wave"></i> Mark as Paid
            </button>` : ''}
          ${['Approved','Finalized','Paid'].includes(run.status) ? `
            <button class="btn btn-outline btn-sm" onclick="Payroll.generateBankFileForRun('${runId}')">
              <i class="fas fa-file-download"></i> Bank File
            </button>
            <button class="btn btn-outline btn-sm" style="color:var(--success);border-color:var(--success);"
              onclick="Payslips && Payslips.sendAllPayslips('${runId}')">
              <i class="fas fa-paper-plane"></i> Send All Payslips
            </button>` : ''}
        </div>

        <!-- Employee payslips -->
        <div style="padding:16px;">
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th class="text-right">Gross</th>
                  <th class="text-right">PAYE</th>
                  <th class="text-right">UIF</th>
                  <th class="text-right">Medical</th>
                  <th class="text-right">Pension</th>
                  <th class="text-right">Net Pay</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${payslips.map(ps => {
                  const emp = employees.find(e => e.id == ps.employeeId);
                  return `
                    <tr>
                      <td>
                        <div style="font-weight:600;font-size:0.85rem;">
                          ${emp ? emp.firstName+' '+emp.lastName : 'ID '+ps.employeeId}
                        </div>
                        <div style="font-size:0.7rem;color:var(--gray-500);">${emp?.position||'—'}</div>
                      </td>
                      <td class="text-right" style="font-size:0.82rem;">${window.formatCurrency(ps.gross||0)}</td>
                      <td class="text-right" style="font-size:0.82rem;color:var(--danger);">${window.formatCurrency(ps.paye||0)}</td>
                      <td class="text-right" style="font-size:0.82rem;color:var(--warning);">${window.formatCurrency(ps.uif||0)}</td>
                      <td class="text-right" style="font-size:0.82rem;">${window.formatCurrency(ps.medical||0)}</td>
                      <td class="text-right" style="font-size:0.82rem;">${window.formatCurrency(ps.pension||0)}</td>
                      <td class="text-right" style="font-weight:700;color:var(--success);">${window.formatCurrency(ps.net||0)}</td>
                      <td>
                        <div style="display:flex;gap:4px;">
                          <button class="btn-icon" title="View Payslip"
                            onclick="Payslips && Payslips.renderPayslipModal('${runId}', ${ps.employeeId})">
                            <i class="fas fa-file-invoice"></i>
                          </button>
                          <button class="btn-icon" title="Email Payslip" style="color:var(--success);"
                            onclick="Payslips && Payslips.sendEmail(${ps.employeeId},'${runId}')">
                            <i class="fas fa-envelope"></i>
                          </button>
                        </div>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
    window.showModal('runDetailModal', html);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // APPROVAL WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────
  approveRun: function (runId) {
    const run = (window.DB.payrollRuns||[]).find(r => r.id === runId);
    if (!run) return;
    window.showConfirmation(
      'Approve Payroll Run',
      `Approve the payroll run for <strong>${run.period}</strong>?
       <br>Net pay: <strong>${window.formatCurrency(run.totalNet||0)}</strong>
       for <strong>${run.employeeCount||0}</strong> employees.`,
      () => {
        run.status    = 'Approved';
        run.approvedAt= new Date().toISOString();
        run.approvedBy= window.currentUser?.name || 'Admin';
        window.DB.save();
        window.Toast.show(`Payroll run approved — ${run.period}`, 'success');
        this.render(document.getElementById('content'));
        if (typeof window.renderNotificationBell === 'function') window.renderNotificationBell();
      }
    );
  },

  rejectRun: function (runId) {
    const run = (window.DB.payrollRuns||[]).find(r => r.id === runId);
    if (!run) return;
    window.showConfirmation(
      'Reject Payroll Run',
      `Reject the payroll run for <strong>${run.period}</strong>?
       <br><small style="color:var(--danger)">This will mark the run as Rejected. You can delete it and create a new one.</small>`,
      () => {
        run.status     = 'Rejected';
        run.rejectedAt = new Date().toISOString();
        run.rejectedBy = window.currentUser?.name || 'Admin';
        window.DB.save();
        window.Toast.show('Payroll run rejected', 'warning');
        this.render(document.getElementById('content'));
        if (typeof window.renderNotificationBell === 'function') window.renderNotificationBell();
      }
    );
  },

  finalizeRun: function (runId) {
    const run = (window.DB.payrollRuns||[]).find(r => r.id === runId);
    if (!run) return;
    window.showConfirmation(
      'Finalize Payroll Run',
      `Finalize <strong>${run.period}</strong>?
       <br><small>This locks the run. Payslips can then be sent to employees.</small>`,
      () => {
        run.status     = 'Finalized';
        run.finalizedAt= new Date().toISOString();
        run.finalizedBy= window.currentUser?.name || 'Admin';
        window.DB.save();
        window.Toast.show('Payroll run finalized!', 'success');
        this.render(document.getElementById('content'));
      }
    );
  },

  markAsPaid: function (runId) {
    const run = (window.DB.payrollRuns||[]).find(r => r.id === runId);
    if (!run) return;
    window.showConfirmation(
      'Mark as Paid',
      `Mark <strong>${run.period}</strong> as paid?
       <br><small>This confirms that employees have been paid via EFT or bank transfer.</small>`,
      () => {
        run.status = 'Paid';
        run.paidAt = new Date().toISOString();
        run.paidBy = window.currentUser?.name || 'Admin';
        window.DB.save();
        window.Toast.show('Payroll marked as paid!', 'success');
        this._tab = 'history';
        this.render(document.getElementById('content'));
      }
    );
  },

  deleteRun: function (runId) {
    const run = (window.DB.payrollRuns||[]).find(r => r.id === runId);
    if (!run) return;
    if (run.status === 'Paid') {
      window.showAlert('Cannot Delete', 'Paid payroll runs cannot be deleted.'); return;
    }
    window.showConfirmation(
      'Delete Payroll Run',
      `Delete the run for <strong>${run.period}</strong>?
       <br><small>This will also delete all ${run.employeeCount||0} payslips for this run.</small>`,
      () => {
        window.DB.payrollRuns = (window.DB.payrollRuns||[]).filter(r => r.id !== runId);
        window.DB.payslips    = (window.DB.payslips   ||[]).filter(p => p.runId !== runId);
        window.DB.save();
        window.Toast.show('Payroll run deleted', 'success');
        this.render(document.getElementById('content'));
        if (typeof window.renderNotificationBell === 'function') window.renderNotificationBell();
      }
    );
  },

  // ─────────────────────────────────────────────────────────────────────────
  // APPROVAL EMAIL
  // ─────────────────────────────────────────────────────────────────────────
  sendApprovalEmail: function (runId) {
    const run  = (window.DB.payrollRuns||[]).find(r => r.id === runId);
    if (!run) return;
    const comp = (window.DB.companies||[]).find(c => c.id == run.companyId);
    const email= comp?.email;

    if (!email) {
      window.showAlert('No Email', 'No email address configured for this company. Please update the company record.');
      return;
    }

    const payslips  = (window.DB.payslips||[]).filter(p => p.runId === runId);
    const employees = window.DB.employees || [];
    const empRows   = payslips.map(ps => {
      const emp = employees.find(e => e.id == ps.employeeId);
      return {
        name:        emp ? `${emp.firstName} ${emp.lastName}` : 'Employee',
        position:    emp?.position || '—',
        gross:       window.formatCurrency(ps.gross||0),
        paye:        window.formatCurrency(ps.paye ||0),
        net:         window.formatCurrency(ps.net  ||0)
      };
    });

    // Build approval URL (same-page anchor for apps without a server page)
    const approvalUrl = `${window.location.origin}${window.location.pathname}?approve=${run.approvalToken}`;

    const bodyHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px;">
<table width="620" cellpadding="0" cellspacing="0"
  style="background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

  <tr><td style="background:#4f46e5;padding:28px 32px;">
    ${comp.logo ? `<img src="${comp.logo}" style="max-height:48px;object-fit:contain;display:block;margin-bottom:8px;">` : ''}
    <div style="font-size:20px;font-weight:800;color:white;">Payroll Approval Required</div>
    <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">${comp.name} &bull; ${run.period}</div>
  </td></tr>

  <tr><td style="padding:24px 32px 0;">
    <p style="font-size:14px;color:#475569;">Please review and approve the payroll run below.</p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;">
      <tr><td style="padding:16px 20px;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;">
          ${[
            ['Period',         run.period],
            ['Pay Frequency',  run.payFrequency||'Monthly'],
            ['Employees',      run.employeeCount||0],
            ['Net Pay',        window.formatCurrency(run.totalNet||0)],
          ].map(([l,v]) => `
            <div>
              <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">${l}</div>
              <div style="font-size:14px;font-weight:700;color:#1e293b;">${v}</div>
            </div>`).join('')}
        </div>
      </td></tr>
    </table>

    <!-- Payslip summary table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px 10px;text-align:left;color:#475569;font-weight:600;border-bottom:1px solid #e2e8f0;">Employee</th>
          <th style="padding:8px 10px;text-align:right;color:#475569;font-weight:600;border-bottom:1px solid #e2e8f0;">Gross</th>
          <th style="padding:8px 10px;text-align:right;color:#475569;font-weight:600;border-bottom:1px solid #e2e8f0;">PAYE</th>
          <th style="padding:8px 10px;text-align:right;color:#475569;font-weight:600;border-bottom:1px solid #e2e8f0;">Net Pay</th>
        </tr>
      </thead>
      <tbody>
        ${empRows.map((e,i) => `
          <tr style="background:${i%2?'#f8fafc':'white'}">
            <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">
              <div style="font-weight:600;">${e.name}</div>
              <div style="font-size:10px;color:#94a3b8;">${e.position}</div>
            </td>
            <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #f1f5f9;">${e.gross}</td>
            <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #f1f5f9;color:#dc2626;">${e.paye}</td>
            <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #f1f5f9;font-weight:700;color:#16a34a;">${e.net}</td>
          </tr>`).join('')}
        <tr style="background:#f8fafc;font-weight:700;">
          <td style="padding:10px;">TOTALS (${run.employeeCount} employees)</td>
          <td style="padding:10px;text-align:right;">${window.formatCurrency(run.totalGross||0)}</td>
          <td style="padding:10px;text-align:right;color:#dc2626;">${window.formatCurrency(run.totalPAYE||0)}</td>
          <td style="padding:10px;text-align:right;color:#16a34a;">${window.formatCurrency(run.totalNet||0)}</td>
        </tr>
      </tbody>
    </table>
  </td></tr>

  <tr><td style="padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:8px;">
        <a href="${approvalUrl}" style="display:block;padding:14px;background:#4f46e5;color:white;
          text-align:center;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
          ✓ Approve Payroll Run
        </a>
      </td>
    </tr></table>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:12px;">
      If you did not request this, please contact your payroll administrator.<br>
      Ref: ${runId}
    </p>
  </td></tr>

  <tr><td style="background:#f8fafc;padding:14px 32px;text-align:center;
    font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
    Nexa HR &amp; Payroll &bull; Automated notification
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

    // POST to api/mail.php (same as existing approval flow)
    fetch('api/mail.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyEmail:  email,
        companyName:   comp.name,
        period:        run.period,
        totalNet:      window.formatCurrency(run.totalNet||0),
        totalGross:    window.formatCurrency(run.totalGross||0),
        totalPAYE:     window.formatCurrency(run.totalPAYE||0),
        employees:     empRows,
        runId,
        approvalToken: run.approvalToken || '',
        approvalUrl,
        payFrequency:  run.payFrequency || 'Monthly',
        logoBase64:    comp.logo || null,
        bodyHtml:      bodyHtml
      })
    })
    .then(r => r.json().catch(() => ({})))
    .then(data => {
      if (data.status === 'sent' || data.status === 'ok') {
        window.Toast.show(`Approval email sent to ${email}`, 'success');
      } else {
        console.warn('[Payroll] Approval email result:', data);
        window.Toast.show(`Email attempted to ${email}. Check server logs if not received.`, 'info');
      }
    })
    .catch(err => {
      console.warn('[Payroll] Email error:', err.message);
      window.Toast.show('Could not send email — check api/mail.php configuration.', 'warning');
    });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SYNC / CHECK APPROVAL (token-based from email link)
  // ─────────────────────────────────────────────────────────────────────────
  syncAndCheckApproval: function (runId) {
    const run = (window.DB.payrollRuns||[]).find(r => r.id === runId);
    if (!run) return;

    // Check URL params for approval token
    const urlToken = new URLSearchParams(window.location.search).get('approve');
    if (urlToken && urlToken === run.approvalToken) {
      run.status    = 'Approved';
      run.approvedAt= new Date().toISOString();
      run.approvedBy= 'Email Approval';
      window.DB.save();
      window.Toast.show('Payroll approved via email link!', 'success');
      this.render(document.getElementById('content'));
      // Clear token from URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    window.Toast.show('No approval token found. Use the Approve button to manually approve.', 'info');
  },

  resendApprovalEmail: function (runId) {
    this.sendApprovalEmail(runId);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BANK FILE GENERATOR (CSV / EFT format)
  // ─────────────────────────────────────────────────────────────────────────
  generateBankFileForRun: function (runId) {
    const run      = (window.DB.payrollRuns||[]).find(r => r.id === runId);
    if (!run) return;
    const payslips = (window.DB.payslips||[]).filter(p => p.runId === runId);
    const employees= window.DB.employees || [];

    if (!payslips.length) {
      window.Toast.show('No payslips found for this run.', 'warning'); return;
    }

    // Standard EFT / bank payment CSV
    const lines = [
      'Account Number,Account Holder,Bank Name,Branch Code,Account Type,Amount,Reference,Employee Number'
    ];

    payslips.forEach(ps => {
      const emp = employees.find(e => e.id == ps.employeeId);
      if (!emp) return;
      const ref = `${(run.period||'').replace(/\s/g,'-')}-${emp.employeeNumber||emp.id}`;
      lines.push([
        emp.accountNumber    || '',
        `${emp.firstName} ${emp.lastName}`,
        emp.bankName         || '',
        emp.branchCode       || '',
        emp.accountType      || 'Cheque',
        (ps.net || 0).toFixed(2),
        ref,
        emp.employeeNumber   || emp.id
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    });

    // Also create a summary sheet
    const summaryLines = [
      'Period,Company,Pay Frequency,Employee Count,Total Gross,Total PAYE,Total UIF,Total SDL,Total Net',
      [
        run.period, run.company, run.payFrequency||'Monthly',
        run.employeeCount||0,
        (run.totalGross||0).toFixed(2),
        (run.totalPAYE||0).toFixed(2),
        (run.totalUIF||0).toFixed(2),
        (run.totalSDL||0).toFixed(2),
        (run.totalNet||0).toFixed(2)
      ].join(',')
    ];

    const csv = lines.join('\n');
    const fileName = `BankFile_${(run.period||runId).replace(/[\s/\\]/g,'-')}_${run.company?.replace(/\s/g,'_')||'Company'}.csv`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    window.Toast.show(`Bank file downloaded — ${payslips.length} employees`, 'success');
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BENEFITS & DEDUCTIONS MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  showBenefitsModal: function () {
    const benefits  = window.DB.benefits  || [];
    const employees = window.DB.employees || [];

    const html = `
      <div class="card" style="width:100%;max-width:800px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-sliders-h text-primary"></i> Benefits &amp; Deductions</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('benefitsModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body" style="padding:0;">
          <!-- Add new benefit -->
          <div style="padding:16px;border-bottom:1px solid var(--gray-200);background:var(--gray-50);">
            <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);margin-bottom:10px;">
              Add Benefit / Deduction
            </div>
            <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr auto;gap:8px;align-items:end;">
              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:0.7rem;">Employee</label>
                <select id="ben_emp" class="form-control" style="font-size:0.8rem;">
                  <option value="">— Select —</option>
                  ${employees.filter(e=>e.status!=='Terminated')
                    .map(e=>`<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:0.7rem;">Name</label>
                <input id="ben_name" class="form-control" style="font-size:0.8rem;" placeholder="e.g. Car Allowance">
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:0.7rem;">Type</label>
                <select id="ben_type" class="form-control" style="font-size:0.8rem;">
                  <option value="Allowance">Allowance (+)</option>
                  <option value="Deduction">Deduction (−)</option>
                </select>
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:0.7rem;">Calculation</label>
                <select id="ben_calc" class="form-control" style="font-size:0.8rem;">
                  <option value="Fixed">Fixed Amount</option>
                  <option value="Percentage">% of Basic</option>
                </select>
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label" style="font-size:0.7rem;">Value</label>
                <input id="ben_value" type="number" class="form-control" style="font-size:0.8rem;" placeholder="0">
              </div>
              <button class="btn btn-primary btn-sm" style="height:36px;" onclick="Payroll.addBenefit()">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>

          <!-- Benefits list -->
          <div id="benefitsList" style="padding:16px;">
            ${this._renderBenefitsList(benefits, employees)}
          </div>
        </div>
      </div>`;
    window.showModal('benefitsModal', html);
  },

  _renderBenefitsList: function (benefits, employees) {
    if (!benefits.length) return `
      <div style="text-align:center;padding:40px;color:var(--gray-400);">
        <i class="fas fa-sliders-h" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>
        No benefits or deductions configured.
      </div>`;

    return `
      <div class="table-responsive">
        <table>
          <thead>
            <tr><th>Employee</th><th>Name</th><th>Type</th><th>Calculation</th><th>Value</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            ${benefits.map(b => {
              const emp = employees.find(e => e.id == b.employeeId);
              const typeColor = b.type === 'Allowance' ? 'success' : 'danger';
              return `
                <tr>
                  <td style="font-size:0.82rem;">${emp ? emp.firstName+' '+emp.lastName : '—'}</td>
                  <td style="font-size:0.82rem;font-weight:500;">${b.name}</td>
                  <td><span class="badge badge-${typeColor}" style="font-size:0.65rem;">
                    ${b.type === 'Allowance' ? '+' : '−'} ${b.type}
                  </span></td>
                  <td style="font-size:0.78rem;">${b.calculation||b.calc||'Fixed'}</td>
                  <td style="font-size:0.82rem;font-weight:600;">
                    ${b.calculation==='Percentage'||b.calc==='Percentage'
                      ? b.value + '%'
                      : window.formatCurrency(parseFloat(b.value)||0)}
                  </td>
                  <td>
                    <span class="badge badge-${b.status==='Active'?'success':'gray'}"
                      style="font-size:0.6rem;">${b.status||'Active'}</span>
                  </td>
                  <td>
                    <button class="btn-icon" style="color:var(--danger);"
                      onclick="Payroll.deleteBenefit('${b.id}')">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  addBenefit: function () {
    const empId = document.getElementById('ben_emp')?.value;
    const name  = document.getElementById('ben_name')?.value?.trim();
    const type  = document.getElementById('ben_type')?.value;
    const calc  = document.getElementById('ben_calc')?.value;
    const value = document.getElementById('ben_value')?.value;

    if (!empId || !name || !value) {
      window.Toast.show('Please fill in all benefit fields', 'warning'); return;
    }

    const ben = {
      id:           'BEN_' + Date.now(),
      employeeId:   parseInt(empId),
      name, type,
      calculation:  calc,
      calc,
      value:        parseFloat(value),
      status:       'Active',
      createdAt:    new Date().toISOString()
    };

    window.DB.benefits = window.DB.benefits || [];
    window.DB.benefits.push(ben);
    window.DB.save();

    // Reset fields
    ['ben_name','ben_value'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Refresh the list
    const listEl = document.getElementById('benefitsList');
    if (listEl) {
      listEl.innerHTML = this._renderBenefitsList(window.DB.benefits, window.DB.employees||[]);
    }

    window.Toast.show(`${type} "${name}" added`, 'success');
  },

  deleteBenefit: function (benId) {
    window.DB.benefits = (window.DB.benefits||[]).filter(b => b.id !== benId);
    window.DB.save();
    const listEl = document.getElementById('benefitsList');
    if (listEl) listEl.innerHTML = this._renderBenefitsList(window.DB.benefits||[], window.DB.employees||[]);
    window.Toast.show('Benefit removed', 'success');
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER — auto-fill frequency from company (used by patch and create modal)
  // ─────────────────────────────────────────────────────────────────────────
  _autoFillFrequency: function (companyId) {
    if (!companyId) return;
    const comp = (window.DB.companies||[]).find(c => c.id == companyId);
    const el   = document.getElementById('run_frequency');
    if (el && comp?.payFrequency) el.value = comp.payFrequency;
  },

  _getRunFrequency: function (run) {
    if (run.payFrequency) return run.payFrequency;
    const comp = (window.DB.companies||[]).find(c => c.id == run.companyId);
    return comp?.payFrequency || 'Monthly';
  },

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────
  _emptyState: function (icon, title, desc, extra = '') {
    return `
      <div class="empty-state" style="padding:60px;">
        <div class="empty-state-icon"><i class="${icon}"></i></div>
        <div class="empty-state-title">${title}</div>
        <div class="empty-state-desc">${desc}</div>
        ${extra}
      </div>`;
  }
};

// ─── On-load: check for approval token in URL ─────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const token = new URLSearchParams(window.location.search).get('approve');
  if (token) {
    const run = (window.DB?.payrollRuns||[]).find(r => r.approvalToken === token);
    if (run && run.status === 'Pending Approval') {
      run.status    = 'Approved';
      run.approvedAt= new Date().toISOString();
      run.approvedBy= 'Email Approval Link';
      window.DB.save();
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => {
        window.Toast?.show(`Payroll run for ${run.period} approved via email link!`, 'success');
      }, 800);
    }
  }
});

// ─── Expose globals ────────────────────────────────────────────────────────────
window.Payroll = Payroll;
window.renderPayroll = function (container) {
  Payroll.render(container);
};