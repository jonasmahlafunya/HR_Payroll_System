const Payslips = {

  // ─── Main list view ────────────────────────────────────────────────────────
  render: function (container) {
    const runs = (window.DB.payrollRuns || []).filter(r =>
      ['Approved', 'Finalized', 'Paid'].includes(r.status)
    );

    container.innerHTML = `
      <div class="page-title-box">
        <h2>Payslip Management</h2>
        <div style="color:var(--gray-500);">View and distribute employee payslips</div>
      </div>

      <div class="card">
        <div class="card-header"><h4 class="card-title">Payroll Runs</h4></div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Company</th>
                <th class="text-right">Total Net</th>
                <th>Employees</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${runs.map(run => `
                <tr>
                  <td><div style="font-weight:600">${run.period}</div>
                    <div style="font-size:0.75rem;color:var(--gray-500)">${run.id}</div>
                  </td>
                  <td>${run.company || '—'}</td>
                  <td class="text-right" style="font-weight:600;color:var(--success)">
                    ${window.formatCurrency(run.totalNet || run.net || 0)}
                  </td>
                  <td><span class="badge badge-info">${run.employeeCount || run.count || 0}</span></td>
                  <td><span class="badge badge-${run.status === 'Paid' ? 'teal' : 'success'}">${run.status}</span></td>
                  <td>
                    <div style="display:flex;gap:6px;">
                      <button class="btn btn-sm btn-outline"
                        onclick="Payslips.showRunSlips('${run.id}')">
                        <i class="fas fa-eye"></i> View
                      </button>
                      <button class="btn btn-sm btn-primary"
                        onclick="Payslips.sendAllPayslips('${run.id}')">
                        <i class="fas fa-paper-plane"></i> Send Payslips
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('') || `
                <tr><td colspan="6" class="text-center" style="padding:32px;color:var(--gray-500)">
                  No approved payroll runs yet. Approve a payroll run to send payslips.
                </td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div id="runSlipsContainer"></div>
    `;
  },

  // ─── Show individual payslips for a run ────────────────────────────────────
  showRunSlips: function (runId) {
    const slips = (window.DB.payslips || []).filter(p => p.runId == runId);
    const run   = (window.DB.payrollRuns || []).find(r => r.id === runId);

    document.getElementById('runSlipsContainer').innerHTML = `
      <div class="card" style="margin-top:24px;">
        <div class="card-header">
          <h4 class="card-title">Payslips — ${run ? run.period : runId}</h4>
          <button class="btn btn-primary btn-sm" onclick="Payslips.sendAllPayslips('${runId}')">
            <i class="fas fa-paper-plane"></i> Send All to Employees
          </button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Email</th>
                <th class="text-right">Gross</th>
                <th class="text-right">PAYE</th>
                <th class="text-right">Net</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${slips.map(s => {
                const emp = window.DB.employees.find(e => e.id === s.employeeId);
                return `
                  <tr>
                    <td style="font-weight:500">
                      ${emp ? `${emp.firstName} ${emp.lastName}` : (s.employeeName || 'Unknown')}
                    </td>
                    <td style="font-size:0.82rem;color:var(--gray-500)">
                      ${emp?.email || '—'}
                    </td>
                    <td class="text-right">${window.formatCurrency(s.gross)}</td>
                    <td class="text-right text-danger">${window.formatCurrency(s.paye)}</td>
                    <td class="text-right" style="font-weight:700;color:var(--success)">
                      ${window.formatCurrency(s.net)}
                    </td>
                    <td>
                      <div style="display:flex;gap:4px;">
                        <button class="btn btn-sm btn-outline"
                          onclick="Payslips.renderPayslipModal('${runId}', ${s.employeeId || s.id})">
                          <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-primary"
                          id="send-btn-${s.employeeId || s.id}"
                          onclick="Payslips.sendEmail(${s.employeeId || s.id}, '${runId}',
                            'send-btn-${s.employeeId || s.id}')">
                          <i class="fas fa-envelope"></i> Email
                        </button>
                      </div>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ─── Send all payslips for a run ───────────────────────────────────────────
  sendAllPayslips: function (runId) {
    const run   = (window.DB.payrollRuns || []).find(r => r.id === runId);
    const slips = (window.DB.payslips   || []).filter(p => p.runId === runId);

    if (!slips.length) {
      window.Toast.show('No payslips found for this run.', 'warning');
      return;
    }

    // Check how many employees have email addresses
    const withEmail = slips.filter(s => {
      const emp = window.DB.employees.find(e => e.id === s.employeeId);
      return emp?.email?.trim();
    });

    window.showConfirmation(
      'Send Payslips to Employees',
      `Send payslips for <strong>${run ? run.period : runId}</strong> to
       <strong>${withEmail.length}</strong> employee${withEmail.length !== 1 ? 's' : ''}
       with email addresses?
       ${slips.length - withEmail.length > 0
         ? `<br><span style="color:var(--warning);font-size:0.85rem;">
              ⚠ ${slips.length - withEmail.length} employee(s) have no email on file and will be skipped.
            </span>`
         : ''}`,
      async () => {
        window.Toast.show(`Sending ${withEmail.length} payslip(s)…`, 'info');
        let sent = 0, failed = 0;
        for (const slip of withEmail) {
          try {
            await Payslips._sendSinglePayslip(slip.employeeId, runId);
            sent++;
          } catch (e) {
            failed++;
            console.warn(`Failed to send payslip for employee ${slip.employeeId}:`, e.message);
          }
        }
        const msg = `${sent} payslip${sent !== 1 ? 's' : ''} sent successfully` +
          (failed > 0 ? `, ${failed} failed` : '') + '.';
        window.Toast.show(msg, failed > 0 ? 'warning' : 'success');
      }
    );
  },

  // ─── Modal Viewer ──────────────────────────────────────────────────────────
  renderPayslipModal: function (runIdOrData, employeeId) {
    let line, emp, comp;

    if (typeof runIdOrData === 'object') {
      line = runIdOrData;
      const empId = line.employeeId || line.id;
      emp  = window.DB.employees.find(e => e.id === empId);
      comp = window.DB.companies.find(c => c.name === line.companyName)
           || { name: line.companyName || '' };
    } else {
      const runId = runIdOrData;
      line = window.DB.payslips.find(p => p.runId === runId && p.employeeId === employeeId);
      emp  = window.DB.employees.find(e => e.id === employeeId);
      const run    = (window.DB.payrollRuns || []).find(r => r.id === runId);
      const compId = run ? run.companyId : null;
      comp = window.DB.companies.find(c => c.id == compId) || { name: 'Unknown Company' };
    }

    if (!line || !emp) { window.Toast.show('Payslip data not found', 'warning'); return; }

    const isDraft   = typeof runIdOrData === 'object';
    const watermark = isDraft
      ? `<div style="position:absolute;top:50%;left:50%;
              transform:translate(-50%,-50%) rotate(-45deg);
              font-size:8rem;color:rgba(0,0,0,0.05);font-weight:900;
              pointer-events:none;z-index:0;">DRAFT</div>`
      : '';

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    backdrop.innerHTML = `
      <div class="modal-content payslip-modal" onclick="event.stopPropagation()">
        <div class="modal-header"
          style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;">
            Payslip: ${emp.firstName} ${emp.lastName}${isDraft ? ' (PREVIEW)' : ''}
          </h3>
          <div style="display:flex;gap:8px;align-items:center;">
            <button id="btn-email-payslip" class="btn btn-outline btn-xs"
              onclick="Payslips.sendEmail(${emp.id}, '${line.runId}', 'btn-email-payslip')">
              <i class="fas fa-envelope"></i> Email Payslip
            </button>
            <button class="btn btn-primary btn-xs" onclick="window.print()">
              <i class="fas fa-print"></i> Print / PDF
            </button>
            <button onclick="this.closest('.modal-backdrop').remove()"
              style="margin-left:8px;background:none;border:none;
                     cursor:pointer;font-size:1.2rem;color:var(--gray-500);">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="modal-body user-select-text"
          style="position:relative;background:#f1f5f9;padding:40px 20px;">
          ${watermark}
          ${this.generatePayslipHTML(line, emp, comp)}
        </div>
      </div>`;
    document.body.appendChild(backdrop);
  },

  // ─── Single source-of-truth payslip HTML (used by modal AND email body) ────
  generatePayslipHTML: function (line, emp, comp) {
    const customBenefits = line.customBenefits
      || (window.DB.employees.find(e => e.id === (line.employeeId || line.id))?.benefits?.custom)
      || [];

    const customAllowances = customBenefits.filter(b => b.type === 'Allowance');
    const customDeductions  = customBenefits.filter(b =>
      b.type === 'Deduction' || b.type === 'Reimbursement'
    );

    const calcBenValue = (b) =>
      b.calc === 'Percentage'
        ? (emp.basicSalary || 0) * (parseFloat(b.value) / 100)
        : parseFloat(b.value) || 0;

    const custAllowRows = customAllowances.map(b => `
      <tr>
        <td style="padding:5px 0;">${b.name}</td>
        <td style="text-align:right;">R ${calcBenValue(b).toFixed(2)}</td>
      </tr>`).join('');

    const custDedRows = customDeductions.map(b => `
      <tr>
        <td style="padding:5px 0;">${b.name}</td>
        <td style="text-align:right;color:#dc2626;">R ${calcBenValue(b).toFixed(2)}</td>
      </tr>`).join('');

    const basic  = Number(line.basic      || 0);
    const paye   = Number(line.paye       || 0);
    const uif    = Number(line.uif        || 0);
    const med    = Number(line.medical    || 0);
    const pen    = Number(line.pension    || 0);
    const garn   = Number(line.garnishee  || 0);
    const bonus  = Number(line.bonus      || 0);

    const custAllowSum  = customAllowances.reduce((s, b) => s + calcBenValue(b), 0);
    const custDedSum    = customDeductions.reduce((s, b)  => s + calcBenValue(b), 0);
    const otherAllow    = Math.max(0, Number(line.gross || basic) - basic - custAllowSum - bonus);
    const totalEarnings = basic + otherAllow + custAllowSum + bonus;
    const manualDed     = Math.max(0, Number(line.otherDeductions || 0) - custDedSum);
    const totalDed      = paye + uif + med + pen + garn + custDedSum + manualDed;
    const netPay        = totalEarnings - totalDed;
    const sdl           = Number(line.sdl || 0);
    const period        = line.period || '—';
    const compName      = comp.name   || 'Company';

    return `
      <style>
        @media (max-width: 600px) {
          #payslip-content { padding: 16px !important; }
          .ps-header { flex-direction: column !important; gap: 12px !important; }
          .ps-header-right { text-align: left !important; }
          .ps-info-grid { display: block !important; }
          .ps-info-right { border-left: none !important; padding-left: 0 !important;
                           border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 12px; }
          .ps-ed-grid { display: block !important; }
          .ps-ed-right { margin-top: 24px; }
          /* contributions use a table — no media overrides needed */
        }
      </style>
      <div id="payslip-content"
        style="padding:40px;max-width:900px;margin:auto;background:#ffffff;
               color:#334155;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">

        <!-- ── Header ── -->
        <div class="ps-header" style="display:flex;justify-content:space-between;align-items:flex-start;
                    border-bottom:3px solid #4f46e5;padding-bottom:20px;margin-bottom:32px;">
          <div style="display:flex;align-items:center;gap:14px;">
            ${comp.logo
              ? `<img src="${comp.logo}" style="height:56px;object-fit:contain;">`
              : `<div style="width:48px;height:48px;background:#f1f5f9;border-radius:8px;
                            display:flex;align-items:center;justify-content:center;">
                   <span style="font-size:1.4rem;">🏢</span>
                 </div>`}
            <div>
              <div style="font-size:22px;font-weight:800;color:#1e293b;letter-spacing:-0.5px;">
                PAYSLIP
              </div>
              <div style="font-size:14px;color:#64748b;margin-top:2px;">${period}</div>
            </div>
          </div>
          <div class="ps-header-right" style="text-align:right;">
            <div style="font-weight:700;color:#1e293b;font-size:15px;">${compName}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">${comp.email || ''}</div>
            <div style="font-size:12px;color:#64748b;">
              Tax Ref: ${comp.taxReference || comp.taxNumber || 'N/A'}
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
              Generated: ${new Date().toLocaleDateString('en-ZA')}
            </div>
          </div>
        </div>

        <!-- ── Employee & Banking ── -->
        <div class="ps-info-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:32px;
                    background:#f8fafc;border-radius:8px;padding:18px 20px;
                    margin-bottom:28px;border:1px solid #e2e8f0;">
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                        letter-spacing:0.6px;color:#64748b;margin-bottom:10px;">
              Employee Information
            </div>
            <table style="font-size:13px;width:100%;border-collapse:collapse;">
              ${[
                ['Name',         `${emp.firstName} ${emp.lastName}`],
                ['ID Number',    emp.idNumber || '—'],
                ['Employee No.', emp.employeeNumber || String(emp.id)],
                ['Position',     emp.position || '—'],
                ['Department',   emp.department || '—'],
              ].map(([l, v]) => `
                <tr>
                  <td style="padding:4px 0;color:#64748b;width:110px;">${l}</td>
                  <td style="padding:4px 0;font-weight:600;color:#1e293b;">${v}</td>
                </tr>`).join('')}
            </table>
          </div>
          <div class="ps-info-right" style="border-left:1px solid #e2e8f0;padding-left:24px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                        letter-spacing:0.6px;color:#64748b;margin-bottom:10px;">
              Banking Details
            </div>
            <table style="font-size:13px;width:100%;border-collapse:collapse;">
              ${[
                ['Bank',         emp.bankName || '—'],
                ['Account No.',  emp.accountNumber ? '****' + String(emp.accountNumber).slice(-4) : '—'],
                ['Branch Code',  emp.branchCode || '—'],
                ['Account Type', emp.accountType || '—'],
                ['Tax Number',   emp.taxNumber || '—'],
              ].map(([l, v]) => `
                <tr>
                  <td style="padding:4px 0;color:#64748b;width:110px;">${l}</td>
                  <td style="padding:4px 0;font-weight:600;color:#1e293b;">${v}</td>
                </tr>`).join('')}
            </table>
          </div>
        </div>

        <!-- ── Earnings & Deductions ── -->
        <div class="ps-ed-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:28px;">

          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                        letter-spacing:0.6px;color:#64748b;border-bottom:2px solid #4f46e5;
                        padding-bottom:6px;margin-bottom:12px;">Earnings</div>
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
              <tr>
                <td style="padding:5px 0;">Basic Salary</td>
                <td style="text-align:right;font-weight:500;">R ${basic.toFixed(2)}</td>
              </tr>
              ${custAllowRows}
              ${otherAllow > 0.01 ? `
              <tr>
                <td style="padding:5px 0;">Other Allowances</td>
                <td style="text-align:right;font-weight:500;">R ${otherAllow.toFixed(2)}</td>
              </tr>` : ''}
              ${bonus > 0 ? `
              <tr>
                <td style="padding:5px 0;">Bonus</td>
                <td style="text-align:right;font-weight:500;">R ${bonus.toFixed(2)}</td>
              </tr>` : ''}
              <tr style="border-top:2px solid #4f46e5;">
                <td style="padding-top:10px;font-weight:700;font-size:14px;">Total Earnings</td>
                <td style="text-align:right;padding-top:10px;font-weight:800;
                           font-size:14px;color:#1e293b;">R ${totalEarnings.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="ps-ed-right">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                        letter-spacing:0.6px;color:#64748b;border-bottom:2px solid #dc2626;
                        padding-bottom:6px;margin-bottom:12px;">Deductions</div>
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
              <tr>
                <td style="padding:5px 0;">PAYE Tax</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${paye.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;">UIF (Employee)</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${uif.toFixed(2)}</td>
              </tr>
              ${med > 0 ? `
              <tr>
                <td style="padding:5px 0;">Medical Aid</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${med.toFixed(2)}</td>
              </tr>` : ''}
              ${pen > 0 ? `
              <tr>
                <td style="padding:5px 0;">Pension / Provident</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${pen.toFixed(2)}</td>
              </tr>` : ''}
              ${custDedRows}
              ${garn > 0 ? `
              <tr>
                <td style="padding:5px 0;">Garnishee Order</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${garn.toFixed(2)}</td>
              </tr>` : ''}
              ${manualDed > 0.01 ? `
              <tr>
                <td style="padding:5px 0;">Other Deductions</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">
                  R ${manualDed.toFixed(2)}</td>
              </tr>` : ''}
              <tr style="border-top:2px solid #dc2626;">
                <td style="padding-top:10px;font-weight:700;font-size:14px;">Total Deductions</td>
                <td style="text-align:right;padding-top:10px;font-weight:800;
                           font-size:14px;color:#dc2626;">R ${totalDed.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- ── Net Pay Box ── -->
        <div style="background:#4f46e5;border-radius:12px;padding:22px 28px;
                    margin-bottom:28px;display:flex;justify-content:space-between;
                    align-items:center;">
          <div>
            <div style="font-size:12px;color:rgba(255,255,255,0.7);text-transform:uppercase;
                        letter-spacing:1px;font-weight:600;">Gross Pay</div>
            <div style="font-size:22px;font-weight:700;color:rgba(255,255,255,0.9);margin-top:2px;">
              R ${totalEarnings.toFixed(2)}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;color:rgba(255,255,255,0.7);text-transform:uppercase;
                        letter-spacing:1px;font-weight:600;">Net Pay to Account</div>
            <div style="font-size:34px;font-weight:800;color:#ffffff;letter-spacing:-1px;
                        margin-top:2px;">
              R ${netPay.toFixed(2)}
            </div>
          </div>
        </div>

        <!-- ── Employer Contributions ── -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
                    padding:14px 20px;margin-bottom:20px;">

          <!-- ── Employer Contributions ── -->
          <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;
                      letter-spacing:0.5px;margin-bottom:8px;">
            Employer Contributions
          </div>
          <table cellpadding="0" cellspacing="0"
                 style="border-collapse:collapse;font-size:12px;margin-bottom:14px;">
            <tr>
              <td style="padding:3px 24px 3px 0;color:#64748b;">SDL</td>
              <td style="padding:3px 0;font-weight:700;color:#334155;">R ${sdl.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:3px 24px 3px 0;color:#64748b;">UIF (Employer)</td>
              <td style="padding:3px 0;font-weight:700;color:#334155;">R ${uif.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:3px 24px 3px 0;color:#64748b;">Total CTC</td>
              <td style="padding:3px 0;font-weight:700;color:#0f172a;">
                R ${(totalEarnings + sdl + uif).toFixed(2)}
              </td>
            </tr>
          </table>

        </div>

        <!-- ── Footer ── -->
        <div style="text-align:center;font-size:11px;color:#94a3b8;
                    border-top:1px solid #e2e8f0;padding-top:14px;">
          Electronically generated by Nexa HR &amp; Payroll Management System
          &nbsp;•&nbsp; No signature required
          &nbsp;•&nbsp; Ref: ${line.runId || '—'}
          &nbsp;•&nbsp; For queries: ${comp.email || 'hr@company.co.za'}
        </div>
      </div>`;
  },

  // ─── Build PDF using jsPDF — pixel-matches the on-screen payslip ──────────
  // No html2canvas / doc.html() — uses jsPDF drawing API only.
  // Layout mirrors the screenshot exactly:
  //   1. White page, logo + PAYSLIP title, company info right-aligned
  //   2. Thin indigo rule below header
  //   3. Rounded light-gray info box: Employee | Banking
  //   4. EARNINGS (indigo underline) | DEDUCTIONS (red underline) columns
  //   5. Full-width indigo rounded net-pay box
  //   6. Light-gray rounded contributions strip
  //   7. Centered footer text
  _buildPDF: function (line, emp, comp) {
    if (!window.jspdf) return null;
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pw  = doc.internal.pageSize.getWidth();  // 210 mm
      const M   = 14;  // left/right margin

      // ── Palette ────────────────────────────────────────────────────────────
      const INDIGO = [79,  70,  229];
      const SLATE  = [30,  41,  59];
      const GRAY   = [100, 116, 139];
      const RED    = [220, 38,  38];
      const DGRAY  = [71,  85,  105];   // #475569
      const BGBOX  = [248, 250, 252];   // #f8fafc
      const BORDER = [226, 232, 240];   // #e2e8f0

      // ── Recalculate figures (mirrors generatePayslipHTML exactly) ──────────
      const calcBV = (b) =>
        b.calc === 'Percentage'
          ? (Number(emp.basicSalary || 0) * parseFloat(b.value)) / 100
          : parseFloat(b.value) || 0;

      const custBens     = line.customBenefits || [];
      const custAllow    = custBens.filter(b => b.type === 'Allowance');
      const custDed      = custBens.filter(b => b.type === 'Deduction' || b.type === 'Reimbursement');
      const custAllowSum = custAllow.reduce((s, b) => s + calcBV(b), 0);
      const custDedSum   = custDed.reduce((s, b)   => s + calcBV(b), 0);

      const basic    = Number(line.basic      || 0);
      const paye     = Number(line.paye       || 0);
      const uif      = Number(line.uif        || 0);
      const med      = Number(line.medical    || 0);
      const pen      = Number(line.pension    || 0);
      const garn     = Number(line.garnishee  || 0);
      const bonus    = Number(line.bonus      || 0);
      const sdl      = Number(line.sdl        || 0);

      const otherAllow  = Math.max(0, Number(line.gross || basic) - basic - custAllowSum - bonus);
      const totalEarn   = basic + otherAllow + custAllowSum + bonus;
      const manualDed   = Math.max(0, Number(line.otherDeductions || 0) - custDedSum);
      const totalDed    = paye + uif + med + pen + garn + custDedSum + manualDed;
      const netPay      = totalEarn - totalDed;

      const period   = line.period || '—';
      const compName = comp.name   || 'Company';
      const fmt      = (v) => window.formatCurrency(v);

      // helper: draw a rounded rectangle border only
      const roundedBorder = (x, y, w, h, r) => {
        doc.setDrawColor(...BORDER);
        doc.roundedRect(x, y, w, h, r, r, 'S');
      };
      // helper: draw filled rounded rect
      const roundedFill = (x, y, w, h, r, rgb) => {
        doc.setFillColor(...rgb);
        doc.roundedRect(x, y, w, h, r, r, 'F');
      };

      let Y = M; // current Y cursor

      // ════════════════════════════════════════════════════════════════════════
      // 1. HEADER
      // ════════════════════════════════════════════════════════════════════════
      // Logo (if exists as base64 data URI)
      let logoEndX = M;
      if (comp.logo && comp.logo.startsWith('data:image')) {
        try {
          const ext = comp.logo.includes('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(comp.logo, ext, M, Y, 22, 14, '', 'FAST');
          logoEndX = M + 24;
        } catch (_) { logoEndX = M; }
      }

      // PAYSLIP title + period
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
      doc.setTextColor(...SLATE);
      doc.text('PAYSLIP', logoEndX + 2, Y + 9);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.setTextColor(...GRAY);
      doc.text(period, logoEndX + 2, Y + 16);

      // Company block – right-aligned
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.setTextColor(...SLATE);
      doc.text(compName, pw - M, Y + 5, { align: 'right' });

      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      const compLines = [
        comp.email || '',
        `Tax Ref: ${comp.taxReference || comp.taxNumber || 'N/A'}`,
        `Generated: ${new Date().toLocaleDateString('en-ZA')}`,
      ].filter(Boolean);
      compLines.forEach((txt, i) => {
        doc.text(txt, pw - M, Y + 10 + i * 4.5, { align: 'right' });
      });

      Y += 22;

      // Thin indigo rule
      doc.setDrawColor(...INDIGO);
      doc.setLineWidth(0.6);
      doc.line(M, Y, pw - M, Y);
      doc.setLineWidth(0.2); // reset
      Y += 8;

      // ════════════════════════════════════════════════════════════════════════
      // 2. EMPLOYEE / BANKING INFO BOX
      // ════════════════════════════════════════════════════════════════════════
      const infoL = [
        ['Name',         `${emp.firstName} ${emp.lastName}`],
        ['ID Number',    emp.idNumber || '—'],
        ['Employee No.', emp.employeeNumber || String(emp.id)],
        ['Position',     emp.position    || '—'],
        ['Department',   emp.department  || '—'],
      ];
      const infoR = [
        ['Bank',         emp.bankName      || '—'],
        ['Account No.',  emp.accountNumber ? '****' + String(emp.accountNumber).slice(-4) : '—'],
        ['Branch Code',  emp.branchCode    || '—'],
        ['Account Type', emp.accountType   || '—'],
        ['Tax Number',   emp.taxNumber     || '—'],
      ];

      const infoRowH  = 5.8;
      const infoBoxH  = 8 + infoL.length * infoRowH + 2;

      // Filled + bordered rounded box
      roundedFill(M, Y, pw - 2 * M, infoBoxH, 3, BGBOX);
      roundedBorder(M, Y, pw - 2 * M, infoBoxH, 3);

      const midX = pw / 2;

      // Section headings
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY);
      doc.text('EMPLOYEE INFORMATION', M + 4, Y + 5.5);
      doc.text('BANKING DETAILS',      midX + 4, Y + 5.5);

      // Draw rows
      let iy = Y + 10;
      doc.setFontSize(8);
      infoL.forEach(([lbl, val]) => {
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
        doc.text(lbl, M + 4, iy);
        doc.setFont('helvetica', 'bold');   doc.setTextColor(...SLATE);
        doc.text(String(val), M + 38, iy);
        iy += infoRowH;
      });
      iy = Y + 10;
      infoR.forEach(([lbl, val]) => {
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
        doc.text(lbl, midX + 4, iy);
        doc.setFont('helvetica', 'bold');   doc.setTextColor(...SLATE);
        doc.text(String(val), midX + 36, iy);
        iy += infoRowH;
      });

      Y += infoBoxH + 8;

      // ════════════════════════════════════════════════════════════════════════
      // 3. EARNINGS & DEDUCTIONS (two columns, no row shading — clean lines)
      // ════════════════════════════════════════════════════════════════════════
      const colW  = (pw - 2 * M - 8) / 2;  // gap of 8mm between columns
      const lX    = M;
      const rX    = M + colW + 8;
      const rowH  = 7;

      // ── EARNINGS heading ──────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text('EARNINGS', lX, Y + 4);
      // Indigo underline
      doc.setDrawColor(...INDIGO); doc.setLineWidth(0.5);
      doc.line(lX, Y + 5.5, lX + colW, Y + 5.5);

      // ── DEDUCTIONS heading ────────────────────────────────────────────────
      doc.text('DEDUCTIONS', rX, Y + 4);
      doc.setDrawColor(...RED);
      doc.line(rX, Y + 5.5, rX + colW, Y + 5.5);
      doc.setLineWidth(0.2);

      Y += 10;

      // Build item lists
      const earnItems = [['Basic Salary', basic]];
      custAllow.forEach(b  => earnItems.push([b.name, calcBV(b)]));
      if (otherAllow > 0.01) earnItems.push(['Other Allowances', otherAllow]);
      if (bonus > 0)         earnItems.push(['Bonus', bonus]);

      const dedItems = [['PAYE Tax', paye], ['UIF (Employee)', uif]];
      if (med > 0)           dedItems.push(['Medical Aid', med]);
      if (pen > 0)           dedItems.push(['Pension / Provident', pen]);
      custDed.forEach(b     => dedItems.push([b.name, calcBV(b)]));
      if (garn > 0)          dedItems.push(['Garnishee Order', garn]);
      if (manualDed > 0.01)  dedItems.push(['Other Deductions', manualDed]);

      const maxRows = Math.max(earnItems.length, dedItems.length);

      // Draw earn rows
      let ey = Y;
      doc.setFontSize(9);
      earnItems.forEach(([lbl, val]) => {
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...SLATE);
        doc.text(String(lbl), lX, ey + 4.5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...SLATE);
        doc.text(fmt(val), lX + colW, ey + 4.5, { align: 'right' });
        // light separator
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.15);
        doc.line(lX, ey + rowH, lX + colW, ey + rowH);
        ey += rowH;
      });

      // Draw ded rows
      let dy = Y;
      dedItems.forEach(([lbl, val]) => {
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...SLATE);
        doc.text(String(lbl), rX, dy + 4.5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...RED);
        doc.text(fmt(val), rX + colW, dy + 4.5, { align: 'right' });
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.15);
        doc.line(rX, dy + rowH, rX + colW, dy + rowH);
        dy += rowH;
      });

      const rowsBottom = Y + maxRows * rowH;

      // Total rows — bold with thicker border above
      // Earnings total
      doc.setDrawColor(...INDIGO); doc.setLineWidth(0.4);
      doc.line(lX, rowsBottom, lX + colW, rowsBottom);
      doc.setLineWidth(0.2);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
      doc.setTextColor(...SLATE);
      doc.text('Total Earnings', lX, rowsBottom + 5.5);
      doc.text(fmt(totalEarn), lX + colW, rowsBottom + 5.5, { align: 'right' });

      // Deductions total
      doc.setDrawColor(...RED); doc.setLineWidth(0.4);
      doc.line(rX, rowsBottom, rX + colW, rowsBottom);
      doc.setLineWidth(0.2);
      doc.setTextColor(...RED);
      doc.text('Total Deductions', rX, rowsBottom + 5.5);
      doc.text(fmt(totalDed), rX + colW, rowsBottom + 5.5, { align: 'right' });

      Y = rowsBottom + 13;

      // ════════════════════════════════════════════════════════════════════════
      // 4. NET PAY BOX — full-width indigo, net pay only (no gross pay)
      // ════════════════════════════════════════════════════════════════════════
      const netBoxH = 26;
      roundedFill(M, Y, pw - 2 * M, netBoxH, 4, INDIGO);

      // NET PAY TO ACCOUNT — right-aligned label + large amount
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.setTextColor(200, 197, 255);
      doc.text('NET PAY TO ACCOUNT', pw - M - 6, Y + 9, { align: 'right' });
      doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(fmt(netPay), pw - M - 6, Y + 21, { align: 'right' });

      Y += netBoxH + 7;


      // ════════════════════════════════════════════════════════════════════════
      // 5. EMPLOYER CONTRIBUTIONS STRIP
      // ════════════════════════════════════════════════════════════════════════
      const contH = 16;
      roundedFill(M, Y, pw - 2 * M, contH, 3, BGBOX);
      roundedBorder(M, Y, pw - 2 * M, contH, 3);

      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY);
      doc.text('EMPLOYER CONTRIBUTIONS', M + 4, Y + 5.5);

      // SDL | UIF | Total CTC — left-aligned, each as label:value pair
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DGRAY);
      let cx = M + 4;
      const pairs = [
        ['SDL: ', fmt(sdl)],
        ['   UIF (Employer): ', fmt(uif)],
        ['   Total CTC: ', fmt(totalEarn + sdl + uif)],
      ];
      pairs.forEach(([lbl, val]) => {
        doc.setFont('helvetica', 'normal'); doc.text(lbl, cx, Y + 12);
        cx += doc.getTextWidth(lbl);
        doc.setFont('helvetica', 'bold'); doc.text(val, cx, Y + 12);
        cx += doc.getTextWidth(val);
      });

      Y += contH + 6;

      // ════════════════════════════════════════════════════════════════════════
      // 6. FOOTER
      // ════════════════════════════════════════════════════════════════════════
      doc.setDrawColor(...BORDER); doc.setLineWidth(0.2);
      doc.line(M, Y, pw - M, Y);
      Y += 5;

      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
      doc.text(
        `Electronically generated by Nexa HR & Payroll Management System  •  No signature required  •  Ref: ${line.runId || '—'}`,
        pw / 2, Y, { align: 'center' }
      );
      doc.text(
        `For queries: ${comp.email || 'hr@company.co.za'}`,
        pw / 2, Y + 4.5, { align: 'center' }
      );

      return doc.output('datauristring').split(',')[1];
    } catch (e) {
      console.warn('[_buildPDF] failed:', e.message);
      return null;
    }
  },


    // ─── Internal: send one payslip as PDF attachment ─────────────────────────
  // Returns a Promise so sendAllPayslips can await each one.
  _sendSinglePayslip: function (employeeId, runId) {
    return new Promise((resolve, reject) => {
      const empId = typeof employeeId === 'string' ? parseInt(employeeId) : employeeId;
      const emp   = window.DB.employees.find(e => e.id === empId);
      const line  = window.DB.payslips.find(p => p.runId === runId && p.employeeId === empId);
      const run   = (window.DB.payrollRuns || []).find(r => r.id === runId);
      const comp  = run
        ? (window.DB.companies.find(c => c.id == run.companyId) || { name: run.company || 'Company' })
        : { name: 'Company' };

      if (!emp)           return reject(new Error('Employee not found'));
      if (!line)          return reject(new Error('Payslip not found'));
      if (!emp.email?.trim()) return reject(new Error('No email address'));

      const period   = line.period || (run ? run.period : 'N/A');
      const compName = comp.name || 'Company';

      // Generate PDF
      let pdfBase64 = null;
      try { pdfBase64 = this._buildPDF(line, emp, comp); } catch (e) {
        console.warn('PDF build failed:', e.message);
      }

      // Simple professional email body — no payslip HTML in the body
      const emailBody = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 12px;">
<table width="560" cellpadding="0" cellspacing="0"
  style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

  <tr><td style="background:#4f46e5;padding:28px 32px;">
    <div style="font-size:20px;font-weight:800;color:#ffffff;">Your Payslip is Ready</div>
    <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px;">
      ${compName} — ${period}
    </div>
  </td></tr>

  <tr><td style="padding:28px 32px;">
    <p style="font-size:15px;color:#1e293b;margin:0 0 12px;">
      Dear <strong>${emp.firstName}</strong>,
    </p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">
      Please find your payslip for <strong>${period}</strong> attached to this email as a PDF.
      Open the attachment to view your full earnings and deductions breakdown.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <tr><td style="padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          <tr>
            <td style="color:#64748b;padding:4px 0;">Period</td>
            <td style="font-weight:600;color:#1e293b;text-align:right;padding:4px 0;">
              ${period}
            </td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:4px 0;">Company</td>
            <td style="font-weight:600;color:#1e293b;text-align:right;padding:4px 0;">
              ${compName}
            </td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="color:#0f172a;font-weight:700;padding:10px 0 4px;font-size:15px;">
              Net Pay
            </td>
            <td style="font-weight:800;color:#4f46e5;text-align:right;
                       padding:10px 0 4px;font-size:20px;">
              ${window.formatCurrency(Number(line.net || 0))}
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="font-size:12px;color:#94a3b8;margin:20px 0 0;line-height:1.5;">
      If you have any questions about your payslip, please contact HR at
      <a href="mailto:${comp.email || ''}" style="color:#4f46e5;">
        ${comp.email || 'hr@company.co.za'}
      </a>.
    </p>
  </td></tr>

  <tr><td style="background:#f8fafc;padding:14px 32px;text-align:center;
       font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
    ${compName} &bull; Powered by Nexa HR &amp; Payroll
    &bull; Please do not reply to this email.
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      const plainText =
        `Dear ${emp.firstName},\n\n` +
        `Your payslip for ${period} is attached as a PDF.\n\n` +
        `Net Pay: ${window.formatCurrency(Number(line.net || 0))}\n\n` +
        `For queries: ${comp.email || 'hr@company.co.za'}`;

      const attachments = pdfBase64 ? [{
        filename: `Payslip_${emp.firstName}_${emp.lastName}_${period.replace(/\s/g, '_')}.pdf`,
        content_base64: pdfBase64,
        mime_type: 'application/pdf'
      }] : [];

      let authToken = '';
      try {
        const s = localStorage.getItem('hrpms_user');
        if (s) { const o = JSON.parse(s); authToken = o.token || o.authToken || ''; }
      } catch (_) {}

      fetch('api/email.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
        body: JSON.stringify({
          to:          emp.email.trim(),
          subject:     `Your Payslip for ${period} — ${compName}`,
          body_html:   emailBody,
          body_text:   plainText,
          attachments: attachments
        })
      })
      .then(res => {
        if (res.status === 401) throw new Error('Unauthorized');
        return res.json().catch(() => { throw new Error('Bad server response'); });
      })
      .then(data => {
        if (data.status === 'sent') resolve(true);
        else throw new Error(data.error || 'Send failed');
      })
      .catch(reject);
    });
  },

  // ─── Public: send email for single employee (called from modal & list) ─────
  sendEmail: function (employeeId, runId, btnId) {
    const btn = btnId ? document.getElementById(btnId) : null;
    const origHtml = btn ? btn.innerHTML : '';
    const reset = () => { if (btn) { btn.innerHTML = origHtml; btn.disabled = false; } };
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }

    if (!runId || runId === 'undefined' || runId === 'null') {
      window.Toast.show('Cannot email a draft payslip — finalise the run first.', 'warning');
      return reset();
    }

    this._sendSinglePayslip(employeeId, runId)
      .then(() => {
        window.Toast.show('Payslip sent successfully!', 'success');
        if (btn) btn.innerHTML = '<i class="fas fa-check"></i> Sent';
      })
      .catch(err => {
        window.Toast.show('Email failed: ' + err.message, 'warning');
        reset();
      });
  }
};

window.renderPayslips = function (container) {
  Payslips.render(container);
};