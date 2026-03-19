
const Payslips = {
    render: function (container) {
        const runs = (window.DB.payrollRuns || []).filter(r => r.status === 'Finalized');
        
        const html = `
        <div class="page-title-box">
          <h2>Payslip Management</h2>
          <div style="color: var(--gray-500);">View and managing historical payroll outputs</div>
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
                      <button class="btn btn-sm btn-outline" onclick="Payslips.showRunSlips(${run.id ? `'${run.id}'` : `'${run.id}'`})">
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
        container.innerHTML = html;
    },

    showRunSlips: function(runId) {
        const slips = (window.DB.payslips || []).filter(p => p.runId == runId);
        const html = `
          <div class="card" style="margin-top: 24px;">
            <div class="card-header"><h4 class="card-title">Payslips for ${runId}</h4></div>
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
                         <button class="btn btn-sm btn-primary" onclick="Payslips.renderPayslipModal(${typeof runId === 'string' && runId.startsWith('RUN_') ? `'${runId}'` : runId}, ${s.employeeId || s.id})">
                           <i class="fas fa-file-invoice"></i> View
                         </button>
                       </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
        document.getElementById('runSlipsContainer').innerHTML = html;
    },

    // Modal Viewer
    renderPayslipModal: function (runIdOrData, employeeId) {
        let line, emp, comp;

        if (typeof runIdOrData === 'object') {
            // Draft Mode (Preview)
            line = runIdOrData;
            // Draft lines store employeeId; fall back to id for legacy data
            const empId = line.employeeId || line.id;
            emp = window.DB.employees.find(e => e.id === empId);
            comp = window.DB.companies.find(c => c.name === line.companyName) || { name: line.companyName };
        } else {
            // Finalized Mode
            const runId = runIdOrData;
            // payslips store employeeId, not id — use employeeId for the lookup
            line = window.DB.payslips.find(p => p.runId === runId && p.employeeId === employeeId);
            emp = window.DB.employees.find(e => e.id === employeeId);
            // Find company from run or employee
            const run = window.DB.payrollRuns.find(r => r.id === runId);
            const compId = run ? run.companyId : null;
            comp = window.DB.companies.find(c => c.id == compId) || { name: 'Unknown Company' };
        }

        if (!line || !emp) {
            window.Toast.show("Payslip data not found", "error");
            return;
        }

        // Generate Modal HTML
        const isDraft = typeof runIdOrData === 'object';
        const watermark = isDraft ? '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 8rem; color: rgba(0,0,0,0.05); font-weight: 900; pointer-events: none; z-index: 0;">DRAFT</div>' : '';

        const modalHtml = `
      <div class="modal-backdrop" onclick="this.remove()">
        <div class="modal-content payslip-modal" onclick="event.stopPropagation()">
           <div class="modal-header">
              <h3>Payslip: ${emp.firstName} ${emp.lastName} ${isDraft ? '(PREVIEW)' : ''}</h3>
              <button onclick="this.closest('.modal-backdrop').remove()">×</button>
           </div>
           <div class="modal-body user-select-text" style="position: relative;">
               ${watermark}
               ${this.generatePayslipHTML(line, emp, comp)}
           </div>
           <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
              <button id="btn-email-payslip" class="btn btn-outline" onclick="Payslips.sendEmail('${emp.email || 'jonasmahlafunya@gmail.com'}', '${emp.firstName}')">
                <i class="fas fa-envelope"></i> Email Payslip
              </button>
              <button class="btn btn-primary" onclick="window.print()">
                <i class="fas fa-print"></i> Print / PDF
              </button>
           </div>
        </div>
      </div>`;

        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
    },

    generatePayslipHTML: function (line, emp, comp) {
        return `
        <div class="payslip-container" style="padding: 40px; background: white; max-width: 800px; margin: 0 auto; font-family: 'Arial', sans-serif; color: #333;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
                <div>
                   <h1 style="margin: 0; font-size: 24px; color: #4f46e5;">${comp.name}</h1>
                   <div style="color: #666; margin-top: 5px;">Reg: 2015/123456/07</div>
                   <div style="color: #666;">Tax Ref: 9123456789</div>
                </div>
                <div style="text-align: right;">
                   <h2 style="margin: 0; font-size: 18px;">PAYSLIP</h2>
                   <div style="font-weight: bold; margin-top: 5px;">${line.period || 'February 2025'}</div>
                </div>
            </div>

            <!-- Employee Details -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 13px;">
                <div>
                    <div><strong>Name:</strong> ${emp.firstName} ${emp.lastName}</div>
                    <div><strong>Emp No:</strong> ${emp.employeeNumber || 'EMP' + emp.id}</div>
                    <div><strong>ID No:</strong> ${emp.idNumber}</div>
                    <div><strong>Position:</strong> ${emp.position}</div>
                    <div><strong>Department:</strong> ${emp.department}</div>
                </div>
                <div style="text-align: right;">
                    <div><strong>Tax Number:</strong> ${emp.taxNumber}</div>
                    <div><strong>Engaged:</strong> ${emp.hireDate}</div>
                    <div><strong>Bank:</strong> ${emp.bankName}</div>
                    <div><strong>Account:</strong> ****${(emp.accountNumber || '').slice(-4)}</div>
                </div>
            </div>

            <!-- Columns -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
                <!-- Earnings -->
                <div>
                    <h3 style="font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">Earnings</h3>
                    <table style="width: 100%; font-size: 13px;">
                        <tr>
                            <td style="padding: 4px 0;">Basic Salary <span style="font-size:10px;color:#999">(3601)</span></td>
                            <td style="text-align: right;">${window.formatCurrency(line.basic)}</td>
                        </tr>
                        ${(line.gross - line.basic > 0) ? `
                        <tr>
                            <td style="padding: 4px 0;">Allowances <span style="font-size:10px;color:#999">(3701)</span></td>
                            <td style="text-align: right;">${window.formatCurrency(line.gross - line.basic)}</td>
                        </tr>` : ''}
                        
                        <tr style="font-weight: bold; border-top: 1px solid #eee;">
                            <td style="padding-top: 8px;">Total Earnings</td>
                            <td style="text-align: right; padding-top: 8px;">${window.formatCurrency(line.gross)}</td>
                        </tr>
                    </table>
                </div>

                <!-- Deductions -->
                <div>
                    <h3 style="font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px;">Deductions</h3>
                    <table style="width: 100%; font-size: 13px;">
                        <tr>
                            <td style="padding: 4px 0;">PAYE Tax <span style="font-size:10px;color:#999">(4102)</span></td>
                            <td style="text-align: right;">${window.formatCurrency(line.paye)}</td>
                        </tr>
                         <tr>
                            <td style="padding: 4px 0;">UIF <span style="font-size:10px;color:#999">(4141)</span></td>
                            <td style="text-align: right;">${window.formatCurrency(line.uif)}</td>
                        </tr>
                        ${line.medical > 0 ? `
                        <tr>
                            <td style="padding: 4px 0;">Medical Aid <span style="font-size:10px;color:#999">(4005)</span></td>
                            <td style="text-align: right;">${window.formatCurrency(line.medical)}</td>
                        </tr>` : ''}
                        ${(line.garnishee || 0) > 0 ? `
                        <tr>
                            <td>Court Order / Garnishee (4102/4141)</td>
                            <td style="text-align: right;">${window.formatCurrency(line.garnishee)}</td>
                        </tr>` : ''}
                        ${line.pension > 0 ? `
                        <tr>
                            <td style="padding: 4px 0;">Pension Fund <span style="font-size:10px;color:#999">(4001)</span></td>
                            <td style="text-align: right;">${window.formatCurrency(line.pension)}</td>
                        </tr>` : ''}
                        
                         <tr style="font-weight: bold; border-top: 1px solid #eee;">
                            <td style="padding-top: 8px;">Total Deductions</td>
                            <td style="text-align: right; padding-top: 8px;">${window.formatCurrency((line.paye||0) + (line.uif||0) + (line.medical||0) + (line.pension||0) + (line.garnishee||0))}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Net Pay Box -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: right; margin-bottom: 30px;">
                <span style="font-size: 14px; font-weight: 600; color: #64748b; margin-right: 15px;">NET PAY</span>
                <span style="font-size: 24px; font-weight: 800; color: #0f172a;">${window.formatCurrency(line.net)}</span>
            </div>

             <!-- Other Info / YTD -->
            <div style="font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 15px;">
                <div style="display: flex; justify-content: space-between;">
                   <div>
                      <strong>Company Contributions:</strong><br>
                      SDL: ${window.formatCurrency(line.sdl)} <span style="color:#999">(4143)</span><br>
                      UIF (Company): ${window.formatCurrency(line.uif)} <span style="color:#999">(4142)</span><br>
                      ${line.companyContrib > 0 ? `Other Contributions: ${window.formatCurrency(line.companyContrib)}<br>` : ''}
                      <strong>Total CTC: ${window.formatCurrency(line.gross + line.sdl + line.uif + (line.companyContrib || 0))}</strong>
                   </div>
                   <div style="text-align: right;">
                      <strong>YTD Totals (Tax Year 2025/2026):</strong><br>
                      Taxable Income: ${window.formatCurrency(line.gross * 12)} (Proj)<br>
                      Tax Paid: ${window.formatCurrency(line.paye * 12)} (Proj)
                   </div>
                </div>
            </div>
        </div>
      `;
    },

    sendEmail: function (email, name) {
        const btn = document.getElementById('btn-email-payslip');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            btn.disabled = true;
        }

        setTimeout(() => {
            console.log(`[EMAIL SENT] To: ${email} | Subject: Payslip for ${name} | Body: Please find attached your payslip.`);
            window.Toast.show(`Payslip sent to ${email}`, "success");
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> Sent';
            }
        }, 1500);
    }
};

window.renderPayslips = function (container) {
    Payslips.render(container);
};