
const Payslips = {
    render: function (container) {
        // For Admin view, this might just list historical runs
        // But we primarily need a 'viewer' for a specific payslip
        const html = `
        <div class="page-title-box"><h2>Payslip History</h2></div>
        <div class="card">
           <div class="card-body">Select a payroll run to view payslips.</div>
        </div>
      `;
        container.innerHTML = html;
    },

    // Modal Viewer
    renderPayslipModal: function (runIdOrData, employeeId) {
        let line, emp, comp;

        if (typeof runIdOrData === 'object') {
            // Draft Mode (Preview)
            line = runIdOrData;
            emp = window.DB.employees.find(e => e.id === line.id); // line.id is usually empId in draft
            comp = window.DB.companies.find(c => c.name === line.companyName) || { name: line.companyName };
        } else {
            // Finalized Mode
            const runId = runIdOrData;
            line = window.DB.payslips.find(p => p.runId === runId && p.id === employeeId);
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
                   <h1 style="margin: 0; font-size: 24px; color: #4f46e5;">${comp.companyName}</h1>
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
                            <td style="padding: 4px 0;">Basic Salary</td>
                            <td style="text-align: right;">${window.formatCurrency(line.basic)}</td>
                        </tr>
                        ${(line.gross - line.basic > 0) ? `
                        <tr>
                            <td style="padding: 4px 0;">Allowances</td>
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
                            <td style="padding: 4px 0;">PAYE Tax</td>
                            <td style="text-align: right;">${window.formatCurrency(line.paye)}</td>
                        </tr>
                         <tr>
                            <td style="padding: 4px 0;">UIF</td>
                            <td style="text-align: right;">${window.formatCurrency(line.uif)}</td>
                        </tr>
                        ${line.medical > 0 ? `
                        <tr>
                            <td style="padding: 4px 0;">Medical Aid</td>
                            <td style="text-align: right;">${window.formatCurrency(line.medical)}</td>
                        </tr>` : ''}
                        ${line.pension > 0 ? `
                        <tr>
                            <td style="padding: 4px 0;">Pension Fund</td>
                            <td style="text-align: right;">${window.formatCurrency(line.pension)}</td>
                        </tr>` : ''}
                        
                         <tr style="font-weight: bold; border-top: 1px solid #eee;">
                            <td style="padding-top: 8px;">Total Deductions</td>
                            <td style="text-align: right; padding-top: 8px;">${window.formatCurrency(line.paye + line.uif + line.medical + line.pension)}</td>
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
                      SDL: ${window.formatCurrency(line.sdl)}<br>
                      UIF (Company): ${window.formatCurrency(line.uif)}<br>
                      ${line.companyContrib > 0 ? `Other Contributions: ${window.formatCurrency(line.companyContrib)}<br>` : ''}
                      <strong>Total CTC: ${window.formatCurrency(line.gross + line.sdl + line.uif + (line.companyContrib || 0))}</strong>
                   </div>
                   <div style="text-align: right;">
                      <strong>YTD Totals (Tax Year 2025):</strong><br>
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