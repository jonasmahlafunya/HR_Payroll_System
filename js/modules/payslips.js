const Payslips = {
  render: function (container) {
    const runs = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized');

    container.innerHTML = `
      <div class="page-title-box">
        <h2>Payslip Management</h2>
        <div style="color:var(--gray-500);">View and manage historical payroll outputs</div>
      </div>

      <div class="card">
        <div class="card-header"><h4 class="card-title">Recent Payroll Runs</h4></div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Company</th>
                <th class="text-right">Total Net</th>
                <th>Employees</th>
                <th>Date Finalized</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${runs.map(run => `
                <tr>
                  <td><div style="font-weight:600">${run.period}</div></td>
                  <td>${run.company || 'All Companies'}</td>
                  <td class="text-right" style="font-weight:600">${window.formatCurrency(run.totalNet || run.net || 0)}</td>
                  <td><span class="badge badge-info">${run.employeeCount || run.count || 0}</span></td>
                  <td>${run.finalizedDate ? new Date(run.finalizedDate).toLocaleDateString() : (run.date ? new Date(run.date).toLocaleDateString() : '—')}</td>
                  <td>
                    <button class="btn btn-sm btn-outline" onclick="Payslips.showRunSlips('${run.id}')">
                      <i class="fas fa-eye"></i> View Payslips
                    </button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="6" class="text-center">No finalized payroll runs found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      <div id="runSlipsContainer"></div>
    `;
  },

  showRunSlips: function (runId) {
    const slips = (window.DB.payslips || []).filter(p => p.runId == runId);
    document.getElementById('runSlipsContainer').innerHTML = `
      <div class="card" style="margin-top:24px;">
        <div class="card-header"><h4 class="card-title">Payslips for run ${runId}</h4></div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th class="text-right">Gross</th>
                <th class="text-right">PAYE</th>
                <th class="text-right">Net</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${slips.map(s => {
                const emp = window.DB.employees.find(e => e.id === s.employeeId);
                return `
                  <tr>
                    <td>${emp ? `${emp.firstName} ${emp.lastName}` : (s.employeeName || 'Unknown')}</td>
                    <td class="text-right">${window.formatCurrency(s.gross)}</td>
                    <td class="text-right">${window.formatCurrency(s.paye)}</td>
                    <td class="text-right" style="font-weight:600">${window.formatCurrency(s.net)}</td>
                    <td>
                      <button class="btn btn-sm btn-primary"
                        onclick="Payslips.renderPayslipModal('${runId}', ${s.employeeId || s.id})">
                        <i class="fas fa-file-invoice"></i> View
                      </button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ─── Modal Viewer ─────────────────────────────────────────────────────────
  renderPayslipModal: function (runIdOrData, employeeId) {
    let line, emp, comp;

    if (typeof runIdOrData === 'object') {
      // Draft preview
      line = runIdOrData;
      const empId = line.employeeId || line.id;
      emp  = window.DB.employees.find(e => e.id === empId);
      comp = window.DB.companies.find(c => c.name === line.companyName) || { name: line.companyName || '' };
    } else {
      const runId = runIdOrData;
      line = window.DB.payslips.find(p => p.runId === runId && p.employeeId === employeeId);
      emp  = window.DB.employees.find(e => e.id === employeeId);
      const run   = (window.DB.payrollRuns || []).find(r => r.id === runId);
      const compId = run ? run.companyId : null;
      comp = window.DB.companies.find(c => c.id == compId) || { name: 'Unknown Company' };
    }

    if (!line || !emp) { window.Toast.show("Payslip data not found", "warning"); return; }

    const isDraft    = typeof runIdOrData === 'object';
    const watermark  = isDraft
      ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);
              font-size:8rem;color:rgba(0,0,0,0.05);font-weight:900;pointer-events:none;z-index:0;">DRAFT</div>`
      : '';

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    backdrop.innerHTML = `
      <div class="modal-content payslip-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3>Payslip: ${emp.firstName} ${emp.lastName} ${isDraft ? '(PREVIEW)' : ''}</h3>
          <button onclick="this.closest('.modal-backdrop').remove()">×</button>
        </div>
        <div class="modal-body user-select-text" style="position:relative;">
          ${watermark}
          ${this.generatePayslipHTML(line, emp, comp)}
        </div>
        <div class="modal-footer" style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="btn-email-payslip" class="btn btn-outline"
            onclick="Payslips.sendEmail('${emp.email || ''}', '${emp.firstName}')">
            <i class="fas fa-envelope"></i> Email Payslip
          </button>
          <button class="btn btn-primary" onclick="window.print()">
            <i class="fas fa-print"></i> Print / PDF
          </button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
  },

  // ─── Payslip HTML Generator ───────────────────────────────────────────────
  generatePayslipHTML: function (line, emp, comp) {
    // Resolve custom benefits — from the payslip line or from the live employee record
    const customBenefits = line.customBenefits
      || (window.DB.employees.find(e => e.id === (line.employeeId || line.id))?.benefits?.custom)
      || [];

    // Build custom benefits earnings rows
    const customAllowances = customBenefits.filter(b => b.type === 'Allowance');
    const customDeductions = customBenefits.filter(b => b.type === 'Deduction' || b.type === 'Reimbursement');

    const calcBenValue = (b) => {
      if (b.calc === 'Percentage') return (emp.basicSalary || 0) * (parseFloat(b.value) / 100);
      return parseFloat(b.value) || 0;
    };

    const customAllowanceRows = customAllowances.map(b => {
      const val = calcBenValue(b);
      const effLabel = b.effectiveFrom ? ` <span style="font-size:10px;color:#999">(eff. ${b.effectiveFrom})</span>` : '';
      return `
        <tr>
          <td style="padding:4px 0;">${b.name}${effLabel} <span style="font-size:10px;color:#999">(3701)</span></td>
          <td style="text-align:right;">R ${val.toFixed(2)}</td>
        </tr>`;
    }).join('');

    const customDeductionRows = customDeductions.map(b => {
      const val = calcBenValue(b);
      const effLabel = b.effectiveFrom ? ` <span style="font-size:10px;color:#999">(eff. ${b.effectiveFrom})</span>` : '';
      return `
        <tr>
          <td style="padding:4px 0;">${b.name}${effLabel}</td>
          <td style="text-align:right;">R ${val.toFixed(2)}</td>
        </tr>`;
    }).join('');

    return `
      <div class="payslip-container" style="padding:40px;background:white;max-width:800px;
            margin:0 auto;font-family:'Arial',sans-serif;color:#333;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #eee;
                    padding-bottom:20px;margin-bottom:20px;">
          <div>
            <h1 style="margin:0;font-size:24px;color:#4f46e5;">${comp.name || 'Company'}</h1>
            <div style="color:#666;margin-top:5px;">Reg: ${comp.registrationNumber || 'N/A'}</div>
            <div style="color:#666;">Tax Ref: ${comp.taxReference || 'N/A'}</div>
          </div>
          <div style="text-align:right;">
            <h2 style="margin:0;font-size:18px;">PAYSLIP</h2>
            <div style="font-weight:bold;margin-top:5px;">${line.period || 'Current Period'}</div>
          </div>
        </div>

        <!-- Employee Details -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px;font-size:13px;">
          <div>
            <div><strong>Name:</strong> ${emp.firstName} ${emp.lastName}</div>
            <div><strong>Emp No:</strong> ${emp.employeeNumber || 'EMP' + emp.id}</div>
            <div><strong>ID No:</strong> ${emp.idNumber || '—'}</div>
            <div><strong>Position:</strong> ${emp.position || '—'}</div>
            <div><strong>Department:</strong> ${emp.department || '—'}</div>
          </div>
          <div style="text-align:right;">
            <div><strong>Tax Number:</strong> ${emp.taxNumber || '—'}</div>
            <div><strong>Engaged:</strong> ${emp.hireDate || '—'}</div>
            <div><strong>Bank:</strong> ${emp.bankName || '—'}</div>
            <div><strong>Account:</strong> ****${(emp.accountNumber || '').slice(-4)}</div>
          </div>
        </div>

        <!-- Earnings & Deductions -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:30px;">

          <!-- Earnings -->
          <div>
            <h3 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ddd;
                       padding-bottom:5px;margin-bottom:10px;">Earnings</h3>
            <table style="width:100%;font-size:13px;">
              <tr>
                <td style="padding:4px 0;">Basic Salary <span style="font-size:10px;color:#999">(3601)</span></td>
                <td style="text-align:right;">R ${(line.basic || 0).toFixed(2)}</td>
              </tr>
              ${customAllowanceRows}
              ${((line.gross || 0) - (line.basic || 0) - customAllowances.reduce((s, b) => s + calcBenValue(b), 0)) > 0.01 ? `
              <tr>
                <td style="padding:4px 0;">Other Allowances <span style="font-size:10px;color:#999">(3701)</span></td>
                <td style="text-align:right;">R ${((line.gross || 0) - (line.basic || 0) - customAllowances.reduce((s, b) => s + calcBenValue(b), 0)).toFixed(2)}</td>
              </tr>` : ''}
              <tr style="font-weight:bold;border-top:1px solid #eee;">
                <td style="padding-top:8px;">Total Earnings</td>
                <td style="text-align:right;padding-top:8px;">R ${(line.gross || 0).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Deductions -->
          <div>
            <h3 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ddd;
                       padding-bottom:5px;margin-bottom:10px;">Deductions</h3>
            <table style="width:100%;font-size:13px;">
              <tr>
                <td style="padding:4px 0;">PAYE Tax <span style="font-size:10px;color:#999">(4102)</span></td>
                <td style="text-align:right;">R ${(line.paye || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;">UIF <span style="font-size:10px;color:#999">(4141)</span></td>
                <td style="text-align:right;">R ${(line.uif || 0).toFixed(2)}</td>
              </tr>
              ${(line.medical || 0) > 0 ? `
              <tr>
                <td style="padding:4px 0;">Medical Aid <span style="font-size:10px;color:#999">(4005)</span></td>
                <td style="text-align:right;">R ${(line.medical || 0).toFixed(2)}</td>
              </tr>` : ''}
              ${(line.pension || 0) > 0 ? `
              <tr>
                <td style="padding:4px 0;">Pension Fund <span style="font-size:10px;color:#999">(4001)</span></td>
                <td style="text-align:right;">R ${(line.pension || 0).toFixed(2)}</td>
              </tr>` : ''}
              ${customDeductionRows}
              ${(line.garnishee || 0) > 0 ? `
              <tr>
                <td>Court Order / Garnishee</td>
                <td style="text-align:right;">R ${(line.garnishee || 0).toFixed(2)}</td>
              </tr>` : ''}
              <tr style="font-weight:bold;border-top:1px solid #eee;">
                <td style="padding-top:8px;">Total Deductions</td>
                <td style="text-align:right;padding-top:8px;">R ${((line.paye||0) + (line.uif||0) + (line.medical||0) + (line.pension||0) + (line.garnishee||0) + customDeductions.reduce((s,b) => s + calcBenValue(b), 0)).toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Custom Benefits Summary (if any with effectiveFrom) -->
        ${customBenefits.length > 0 ? `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
                    padding:14px 16px;margin-bottom:20px;">
          <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.4px;">
            Employee Benefits Detail
          </div>
          <table style="width:100%;font-size:12px;color:#475569;">
            <thead>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <th style="padding:4px 0;text-align:left;">Benefit</th>
                <th style="padding:4px 0;text-align:left;">Type</th>
                <th style="padding:4px 0;text-align:left;">Effective From</th>
                <th style="padding:4px 0;text-align:right;">Monthly Amount</th>
              </tr>
            </thead>
            <tbody>
              ${customBenefits.map(b => {
                const val = calcBenValue(b);
                return `<tr>
                  <td style="padding:3px 0;">${b.name}</td>
                  <td style="padding:3px 0;">${b.type}</td>
                  <td style="padding:3px 0;">${b.effectiveFrom || '—'}</td>
                  <td style="padding:3px 0;text-align:right;">R ${val.toFixed(2)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : ''}

        <!-- Net Pay -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:15px;
                    border-radius:8px;text-align:right;margin-bottom:30px;">
          <span style="font-size:14px;font-weight:600;color:#64748b;margin-right:15px;">NET PAY</span>
          <span style="font-size:24px;font-weight:800;color:#0f172a;">R ${(line.net || 0).toFixed(2)}</span>
        </div>

        <!-- Company Contributions / YTD -->
        <div style="font-size:11px;color:#666;border-top:1px solid #eee;padding-top:15px;">
          <div style="display:flex;justify-content:space-between;">
            <div>
              <strong>Company Contributions:</strong><br>
              SDL: R ${(line.sdl || 0).toFixed(2)} <span style="color:#999">(4143)</span><br>
              UIF (Employer): R ${(line.uif || 0).toFixed(2)} <span style="color:#999">(4142)</span><br>
              ${(line.companyContrib || 0) > 0 ? `Other: R ${(line.companyContrib || 0).toFixed(2)}<br>` : ''}
              <strong>Total CTC: R ${((line.gross||0) + (line.sdl||0) + (line.uif||0) + (line.companyContrib||0)).toFixed(2)}</strong>
            </div>
            <div style="text-align:right;">
              <strong>YTD (Tax Year 2025/2026 — Projected):</strong><br>
              Taxable Income: R ${((line.gross || 0) * 12).toFixed(2)}<br>
              Tax Paid: R ${((line.paye || 0) * 12).toFixed(2)}
            </div>
          </div>
        </div>

        <div style="text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #eee;padding-top:14px;margin-top:16px;">
          Generated by HR &amp; Payroll Management System &nbsp;|&nbsp; This payslip is generated electronically.
        </div>
      </div>
    `;
  },

  sendEmail: function (email, name) {
    const btn = document.getElementById('btn-email-payslip');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'; btn.disabled = true; }
    setTimeout(() => {
      console.log(`[EMAIL] To: ${email} | Payslip for ${name}`);
      window.Toast.show(`Payslip emailed to ${email || 'employee'}`, "success");
      if (btn) btn.innerHTML = '<i class="fas fa-check"></i> Sent';
    }, 1500);
  }
};

window.renderPayslips = function (container) {
  Payslips.render(container);
};