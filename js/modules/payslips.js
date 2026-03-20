const Payslips = {
  render: function (container) {
    const runs = (window.DB.payrollRuns || []).filter(r =>
      ['Approved', 'Finalized', 'Paid'].includes(r.status)
    );

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
      emp = window.DB.employees.find(e => e.id === empId);
      comp = window.DB.companies.find(c => c.name === line.companyName) || { name: line.companyName || '' };
    } else {
      const runId = runIdOrData;
      line = window.DB.payslips.find(p => p.runId === runId && p.employeeId === employeeId);
      emp = window.DB.employees.find(e => e.id === employeeId);
      const run = (window.DB.payrollRuns || []).find(r => r.id === runId);
      const compId = run ? run.companyId : null;
      comp = window.DB.companies.find(c => c.id == compId) || { name: 'Unknown Company' };
    }

    if (!line || !emp) { window.Toast.show("Payslip data not found", "warning"); return; }

    const isDraft = typeof runIdOrData === 'object';
    const watermark = isDraft
      ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);
              font-size:8rem;color:rgba(0,0,0,0.05);font-weight:900;pointer-events:none;z-index:0;">DRAFT</div>`
      : '';

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    backdrop.innerHTML = `
      <div class="modal-content payslip-modal" onclick="event.stopPropagation()">
        <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h3 style="margin:0;">Payslip: ${emp.firstName} ${emp.lastName} ${isDraft ? '(PREVIEW)' : ''}</h3>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button id="btn-email-payslip" class="btn btn-outline btn-xs"
              onclick="Payslips.sendEmail('${emp.id}', '${line.runId}')">
              <i class="fas fa-envelope"></i> Email
            </button>
            <button class="btn btn-primary btn-xs" onclick="window.print()">
              <i class="fas fa-print"></i> Print / PDF
            </button>
            <button class="btn-icon" onclick="this.closest('.modal-backdrop').remove()" style="margin-left:8px;background:none;border:none;cursor:pointer;font-size:1.2rem;">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="modal-body user-select-text" style="position:relative;background:#f1f5f9;padding:40px 20px;">
          ${watermark}
          ${this.generatePayslipHTML(line, emp, comp)}
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

    const customAllowances = customBenefits.filter(b => b.type === 'Allowance');
    const customDeductions = customBenefits.filter(b => b.type === 'Deduction' || b.type === 'Reimbursement');

    const calcBenValue = (b) => {
      if (b.calc === 'Percentage') return (emp.basicSalary || 0) * (parseFloat(b.value) / 100);
      return parseFloat(b.value) || 0;
    };

    const customAllowanceRows = customAllowances.map(b => {
      const val = calcBenValue(b);
      return `
        <tr>
          <td style="padding:4px 0;">${b.name}</td>
          <td style="text-align:right;">R ${val.toFixed(2)}</td>
        </tr>`;
    }).join('');

    const customDeductionRows = customDeductions.map(b => {
      const val = calcBenValue(b);
      return `
        <tr>
          <td style="padding:4px 0;">${b.name}</td>
          <td style="text-align:right;">R ${val.toFixed(2)}</td>
        </tr>`;
    }).join('');

    // ─── Calculate Totals Locally for Display Accuracy ──────────────────────
    // Use Number() to ensure we don't accidentally concatenate strings
    const basic = Number(line.basic || 0);
    const paye = Number(line.paye || 0);
    const uif = Number(line.uif || 0);
    const med = Number(line.medical || 0);
    const pen = Number(line.pension || 0);
    const garn = Number(line.garnishee || 0);
    const bonus = Number(line.bonus || 0);

    // Sum custom allowances and deductions
    const customAllowanceSum = customAllowances.reduce((s, b) => s + Number(calcBenValue(b)), 0);
    const customDeductionSum = customDeductions.reduce((s, b) => s + Number(calcBenValue(b)), 0);

    // Regular allowances (if any extra gross remains)
    const storedGross = Number(line.gross || basic);
    const otherAllowances = Math.max(0, storedGross - basic - customAllowanceSum - bonus);

    const totalEarnings = basic + otherAllowances + customAllowanceSum + bonus;

    const manualDeduction = Math.max(0, Number(line.otherDeductions || 0) - customDeductionSum);
    const totalDeductions = paye + uif + med + pen + garn + customDeductionSum + manualDeduction;

    const netPay = totalEarnings - totalDeductions;

    return `
      <div id="payslip-modal-content" style="padding:40px;max-width:900px;margin:auto;background:white;color:#334155;line-height:1.5;font-family:sans-serif;">
        <!-- Header: Logo & Company -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;border-bottom:2px solid #f1f5f9;padding-bottom:20px;">
          <div style="display:flex;align-items:center;gap:15px;">
            ${comp.logo ? `<img src="${comp.logo}" alt="Logo" style="height:60px;object-fit:contain;">` :
        `<div style="width:50px;height:50px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;border-radius:8px;"><i class="fas fa-building" style="color:#cbd5e1;font-size:1.5rem;"></i></div>`}
            <div>
              <h1 style="font-size:24px;font-weight:800;color:#1e293b;margin:0;">PAYSLIP</h1>
              <p style="color:#64748b;font-size:14px;margin:5px 0 0 0;">${line.period}</p>
            </div>
          </div>
          <div style="text-align:right;">
            <p style="font-weight:700;color:#1e293b;margin:0;">${comp.name}</p>
            <p style="font-size:12px;color:#64748b;margin:2px 0;">${comp.email || 'N/A'}</p>
            <p style="color:#64748b;font-size:12px;margin:2px 0;">Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <!-- Info Grid -->
        <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:40px;margin-bottom:40px;">
          <div>
            <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px;">Employee Information</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
              <div style="color:#64748b;">Name:</div><div style="font-weight:600;">${emp.firstName} ${emp.lastName}</div>
              <div style="color:#64748b;">ID No:</div><div>${emp.idNumber || '—'}</div>
              <div style="color:#64748b;">Employee No:</div><div>${emp.employeeNumber || emp.id}</div>
              <div style="color:#64748b;">Department:</div><div>${emp.department || 'General'}</div>
            </div>
          </div>
          <div>
            <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px;">Banking Details</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
              <div style="color:#64748b;">Bank:</div><div style="font-weight:500;">${emp.bankName || '—'}</div>
              <div style="color:#64748b;">Account:</div><div style="font-weight:500;">${emp.accountNumber || '—'}</div>
              <div style="color:#64748b;">Branch:</div><div>${emp.branchCode || '—'}</div>
            </div>
          </div>
        </div>

        <!-- Main Figures Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:30px;">
          <!-- Earnings -->
          <div>
            <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;
                       color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px;">Earnings</h3>
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;">Basic Salary</td>
                <td style="text-align:right;font-weight:500;">R ${basic.toFixed(2)}</td>
              </tr>
              ${customAllowanceRows}
              ${otherAllowances > 0.01 ? `
              <tr>
                <td style="padding:6px 0;">Other Allowances</td>
                <td style="text-align:right;font-weight:500;">R ${otherAllowances.toFixed(2)}</td>
              </tr>` : ''}
              ${bonus > 0 ? `
              <tr>
                <td style="padding:6px 0;">Bonus</td>
                <td style="text-align:right;font-weight:500;">R ${bonus.toFixed(2)}</td>
              </tr>` : ''}
              <tr style="font-weight:700;border-top:1px solid #e2e8f0;font-size:14px;">
                <td style="padding-top:12px;">Total Earnings</td>
                <td style="text-align:right;padding-top:12px;color:#1e293b;">R ${totalEarnings.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Deductions -->
          <div>
            <h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;
                       color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px;">Deductions</h3>
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;">PAYE Tax</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${paye.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;">UIF Employee</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${uif.toFixed(2)}</td>
              </tr>
              ${med > 0 ? `
              <tr>
                <td style="padding:6px 0;">Medical Aid</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${med.toFixed(2)}</td>
              </tr>` : ''}
              ${pen > 0 ? `
              <tr>
                <td style="padding:6px 0;">Pension / Provident</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${pen.toFixed(2)}</td>
              </tr>` : ''}
              ${customDeductionRows}
              ${garn > 0 ? `
              <tr>
                <td style="padding:6px 0;">Garnishee Order</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${garn.toFixed(2)}</td>
              </tr>` : ''}
              ${manualDeduction > 0.01 ? `
              <tr>
                <td style="padding:6px 0;">Other Deductions</td>
                <td style="text-align:right;font-weight:500;color:#dc2626;">R ${manualDeduction.toFixed(2)}</td>
              </tr>` : ''}
              <tr style="font-weight:700;border-top:1px solid #e2e8f0;font-size:14px;">
                <td style="padding-top:12px;">Total Deductions</td>
                <td style="text-align:right;padding-top:12px;color:#dc2626;">R ${totalDeductions.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Net Pay Box -->
        <div style="border:2px solid #4f46e5;border-radius:12px;padding:24px;text-align:right;
                    margin-bottom:32px;background:#f8fafc;">
          <div style="font-size:14px;font-weight:600;color:#64748b;margin-right:8px;text-transform:uppercase;letter-spacing:1px;">Net Pay to Account</div>
          <div style="font-size:36px;font-weight:800;color:#0f172a;">R ${netPay.toFixed(2)}</div>
        </div>

        <!-- YTD & Company Contributions -->
        <div style="font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:20px;
                    display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div>
            <div style="font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Company Contributions</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
               <span>SDL:</span> <span style="font-weight:600;color:#475569;">R ${(Number(line.sdl || 0)).toFixed(2)}</span>
               <span>UIF Employer:</span> <span style="font-weight:600;color:#475569;">R ${(Number(uif)).toFixed(2)}</span>
               <span>Total CTC:</span> <span style="font-weight:700;color:#0f172a;">R ${(Number(totalEarnings) + Number(line.sdl || 0) + Number(uif)).toFixed(2)}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Tax Year 2025/2026 (Projected)</div>
            <div>Taxable Income YTD: <span style="font-weight:600;color:#475569;">R ${(totalEarnings * 12).toFixed(2)}</span></div>
            <div>Estimated Annual Tax: <span style="font-weight:600;color:#475569;">R ${(paye * 12).toFixed(2)}</span></div>
          </div>
        </div>

        <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:32px;border-top:1px solid #f1f5f9;padding-top:16px;">
          Electronically generated by Nexa HR &amp; Payroll Management System &nbsp;&bull;&nbsp; No signature required.
        </div>
      </div>
    `;
  },

  sendEmail: function (employeeId, runId) {
    const btn = document.getElementById('btn-email-payslip');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'; btn.disabled = true; }

    try {
      // 1. Get Data
      const emp = window.DB.employees.find(e => e.id == employeeId);
      const line = window.DB.payslips.find(p => p.runId == runId && p.employeeId == employeeId);
      const run = (window.DB.payrollRuns || []).find(r => r.id == runId);
      const compId = run ? run.companyId : null;
      const comp = window.DB.companies.find(c => c.id == compId) || { name: 'Nexa HR Client' };

      if (!emp || !line) {
        if (!runId || runId === 'undefined' || runId === 'null') {
          throw new Error("Cannot email a draft payslip. Please finalize the payroll run first.");
        }
        throw new Error("Payslip data missing or ID mismatch.");
      }
      if (!emp.email) throw new Error("Employee email address is missing");

      // 2. Local Calc (Mirror generatePayslipHTML exactly)
      const basic = Number(line.basic || 0);
      const paye = Number(line.paye || 0);
      const uif = Number(line.uif || 0);
      const med = Number(line.medical || 0);
      const pen = Number(line.pension || 0);
      const garn = Number(line.garnishee || 0);
      const bonus = Number(line.bonus || 0);

      const calcBenValue = (b) => {
        if (b.calc === 'Percentage') return (Number(emp.basicSalary) * parseFloat(b.value)) / 100;
        return parseFloat(b.value) || 0;
      };

      const customBenefits = line.customBenefits || [];
      const customAllowances = customBenefits.filter(b => b.type === 'Allowance');
      const customDeductions = customBenefits.filter(b => b.type === 'Deduction');
      const customAllowanceSum = customAllowances.reduce((s, b) => s + Number(calcBenValue(b)), 0);
      const customDeductionSum = customDeductions.reduce((s, b) => s + Number(calcBenValue(b)), 0);
      const storedGross = Number(line.gross || basic);
      const otherAllowances = Math.max(0, storedGross - basic - customAllowanceSum - bonus);
      const totalEarnings = basic + otherAllowances + customAllowanceSum + bonus;
      const manualDeduction = Math.max(0, Number(line.otherDeductions || 0) - customDeductionSum);
      const totalDeductions = paye + uif + med + pen + garn + customDeductionSum + manualDeduction;
      const netPay = totalEarnings - totalDeductions;

      // 3. Generate PDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text("PAYSLIP", 14, 25);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${line.period}`, 14, 32);
      doc.text(`Run ID: ${runId}`, 14, 37);

      // Right-aligned company info
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(comp.name, 196, 25, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(comp.email || '', 196, 30, { align: 'right' });

      // Info Table
      doc.autoTable({
        startY: 45,
        head: [['Employee Information', 'Banking Details']],
        body: [[
          `Name: ${emp.firstName} ${emp.lastName}\nID: ${emp.idNumber || '-'}\nEmp No: ${emp.employeeNumber || emp.id}`,
          `Bank: ${emp.bankName || '-'}\nAcc: ${emp.accountNumber || '-'}\nBranch: ${emp.branchCode || '-'}`
        ]],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 }
      });

      // Earnings & Deductions
      const earnGrid = [['Basic Salary', window.formatCurrency(basic)]];
      customAllowances.forEach(b => earnGrid.push([b.name, window.formatCurrency(calcBenValue(b))]));
      if (otherAllowances > 0.01) earnGrid.push(['Other Allowances', window.formatCurrency(otherAllowances)]);
      if (bonus > 0) earnGrid.push(['Bonus', window.formatCurrency(bonus)]);
      earnGrid.push([{ content: 'Total Earnings', styles: { fontStyle: 'bold' } }, { content: window.formatCurrency(totalEarnings), styles: { fontStyle: 'bold' } }]);

      const dedGrid = [];
      if (paye > 0) dedGrid.push(['PAYE Tax', window.formatCurrency(paye)]);
      if (uif > 0) dedGrid.push(['UIF', window.formatCurrency(uif)]);
      if (med > 0) dedGrid.push(['Medical Aid', window.formatCurrency(med)]);
      if (pen > 0) dedGrid.push(['Pension', window.formatCurrency(pen)]);
      customDeductions.forEach(b => dedGrid.push([b.name, window.formatCurrency(calcBenValue(b))]));
      if (garn > 0) dedGrid.push(['Garnishee', window.formatCurrency(garn)]);
      if (manualDeduction > 0.01) dedGrid.push(['Other Deductions', window.formatCurrency(manualDeduction)]);
      dedGrid.push([{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: window.formatCurrency(totalDeductions), styles: { fontStyle: 'bold' } }]);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Earnings', 'Deductions']],
        body: [[
          { content: '', styles: { cellPadding: 0 } },
          { content: '', styles: { cellPadding: 0 } }
        ]],
        theme: 'plain'
      });

      const tableY = doc.lastAutoTable.finalY - 10;
      doc.autoTable({
        startY: tableY,
        body: earnGrid,
        margin: { right: 107 },
        theme: 'striped',
        styles: { fontSize: 8 }
      });

      doc.autoTable({
        startY: tableY,
        body: dedGrid,
        margin: { left: 107 },
        theme: 'striped',
        styles: { fontSize: 8 }
      });

      doc.setFontSize(14);
      doc.text(`Net Pay: ${window.formatCurrency(netPay)}`, 196, doc.lastAutoTable.finalY + 15, { align: 'right' });

      // 4. Send Email
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const bodyHtml = `
        <div style="font-family:sans-serif;color:#334155;">
          <h2>Hello ${emp.firstName},</h2>
          <p>Please find your payslip for <strong>${line.period}</strong> attached to this email.</p>
          <div style="background:#f8fafc;padding:20px;border-radius:10px;margin:20px 0;">
            <p style="margin:0;font-size:14px;color:#64748b;">Net Pay to Account:</p>
            <p style="margin:5px 0 0 0;font-size:24px;font-weight:bold;color:#0f172a;">${window.formatCurrency(netPay)}</p>
          </div>
          <p style="font-size:12px;color:#94a3b8;">This is an automated notification from Nexa HR & Payroll Management System.</p>
        </div>
      `;

      fetch('api/email.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': localStorage.getItem('hrpms_token') || ''
        },
        body: JSON.stringify({
          to: emp.email,
          subject: `Payslip - ${line.period} - ${comp.name}`,
          body_html: bodyHtml,
          attachments: [{
            filename: `Payslip_${emp.firstName}_${line.period.replace(/ /g, '_')}.pdf`,
            content_base64: pdfBase64,
            mime_type: 'application/pdf'
          }]
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'sent') {
            window.Toast.show(`Payslip emailed to ${emp.email}`, "success");
            if (btn) btn.innerHTML = '<i class="fas fa-check"></i> Sent';
          } else {
            throw new Error(data.error || "Failed to send email");
          }
        })
        .catch(err => {
          console.error(err);
          window.Toast.show(err.message, "danger");
          if (btn) { btn.innerHTML = oldHtml; btn.disabled = false; }
        });

    } catch (err) {
      console.error(err);
      window.Toast.show(err.message, "danger");
      if (btn) { btn.innerHTML = oldHtml; btn.disabled = false; }
    }
  }
};

window.renderPayslips = function (container) {
  Payslips.render(container);
};