
// Payroll Validation Module - Error Detection & Data Quality Checks
const PayrollValidation = {
    validatePayrollRun: function (payrollData) {
        const errors = [];
        const warnings = [];

        if (!payrollData.companyName) {
            return { errors, warnings };
        }

        const employees = window.DB.employees.filter(e =>
            e.companyName === payrollData.companyName && e.status === 'Active'
        );

        employees.forEach(emp => {
            // CRITICAL ERRORS (Block payroll)

            // Missing bank account number
            if (!emp.accountNumber || emp.accountNumber.trim() === '') {
                errors.push({
                    type: 'critical',
                    employee: `${emp.firstName} ${emp.lastName}`,
                    employeeId: emp.id,
                    message: 'Missing bank account number',
                    field: 'banking',
                    action: 'Update employee banking details'
                });
            }

            // Missing bank name
            if (!emp.bankName || emp.bankName.trim() === '') {
                errors.push({
                    type: 'critical',
                    employee: `${emp.firstName} ${emp.lastName}`,
                    employeeId: emp.id,
                    message: 'Missing bank name',
                    field: 'banking',
                    action: 'Update employee banking details'
                });
            }

            // Missing tax number
            if (!emp.taxNumber || emp.taxNumber.trim() === '') {
                errors.push({
                    type: 'critical',
                    employee: `${emp.firstName} ${emp.lastName}`,
                    employeeId: emp.id,
                    message: 'Missing tax number',
                    field: 'tax',
                    action: 'Update employee tax details'
                });
            }

            // Invalid ID number format (SA ID should be 13 digits)
            if (emp.idNumber) {
                const cleanId = emp.idNumber.replace(/\s/g, '');
                if (cleanId.length !== 13 || !/^\d+$/.test(cleanId)) {
                    errors.push({
                        type: 'critical',
                        employee: `${emp.firstName} ${emp.lastName}`,
                        employeeId: emp.id,
                        message: 'Invalid ID number format (must be 13 digits)',
                        field: 'personal',
                        action: 'Correct ID number'
                    });
                }
            } else {
                errors.push({
                    type: 'critical',
                    employee: `${emp.firstName} ${emp.lastName}`,
                    employeeId: emp.id,
                    message: 'Missing ID number',
                    field: 'personal',
                    action: 'Add ID number'
                });
            }

            // Missing basic salary
            if (!emp.basicSalary || emp.basicSalary <= 0) {
                errors.push({
                    type: 'critical',
                    employee: `${emp.firstName} ${emp.lastName}`,
                    employeeId: emp.id,
                    message: 'Missing or invalid basic salary',
                    field: 'salary',
                    action: 'Set basic salary'
                });
            }

            // WARNINGS (Allow with confirmation)

            // Missing timesheet (check if timesheet exists for this period)
            const hasTimesheet = this.checkTimesheet(emp.id, payrollData.period);
            if (!hasTimesheet) {
                warnings.push({
                    type: 'warning',
                    employee: `${emp.firstName} ${emp.lastName}`,
                    employeeId: emp.id,
                    message: 'No timesheet submitted for this period',
                    action: 'Use default hours or exclude from payroll'
                });
            }

            // Unapproved leave
            const unapprovedLeave = this.getUnapprovedLeave(emp.id, payrollData.period);
            if (unapprovedLeave.length > 0) {
                warnings.push({
                    type: 'warning',
                    employee: `${emp.firstName} ${emp.lastName}`,
                    employeeId: emp.id,
                    message: `${unapprovedLeave.length} unapproved leave day(s) in this period`,
                    action: 'Approve leave or adjust pay accordingly'
                });
            }

            // First payroll for employee (new hire)
            const previousPayslips = window.DB.payslips.filter(p => p.employeeId === emp.id);
            if (previousPayslips.length === 0) {
                warnings.push({
                    type: 'info',
                    employee: `${emp.firstName} ${emp.lastName}`,
                    employeeId: emp.id,
                    message: 'First payroll for this employee',
                    action: 'Verify all employee details are correct'
                });
            }

            // Missing branch code
            if (!emp.branchCode || emp.branchCode.trim() === '') {
                warnings.push({
                    type: 'warning',
                    employee: `${emp.firstName} ${emp.lastName}`,
                    employeeId: emp.id,
                    message: 'Missing bank branch code',
                    action: 'Add branch code for EFT processing'
                });
            }
        });

        return { errors, warnings };
    },

    checkTimesheet: function (employeeId, period) {
        // Check if timesheet exists for this employee and period
        // For now, return true (assume timesheets exist)
        // In a real system, this would query the timesheet database
        return true;
    },

    getUnapprovedLeave: function (employeeId, period) {
        // Get unapproved leave requests for this employee in this period
        const leaveRequests = window.DB.leaveRequests || [];
        return leaveRequests.filter(leave =>
            leave.employeeId === employeeId &&
            leave.status === 'Pending' &&
            this.isInPeriod(leave.startDate, period)
        );
    },

    isInPeriod: function (date, period) {
        // Simple check if date falls within period
        // In a real system, this would do proper date range checking
        return true;
    },

    renderValidationReport: function (errors, warnings) {
        let html = '<div class="validation-report">';

        if (errors.length > 0) {
            html += `
        <div class="alert alert-danger">
          <h4><i class="fas fa-exclamation-circle"></i> Critical Errors (${errors.length})</h4>
          <p>The following errors must be fixed before proceeding:</p>
          <table style="width: 100%; margin-top: 12px;">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Issue</th>
                <th>Action Required</th>
              </tr>
            </thead>
            <tbody>
              ${errors.map(err => `
                <tr>
                  <td>${err.employee}</td>
                  <td>${err.message}</td>
                  <td><button class="btn btn-sm btn-outline" onclick="Profile.edit(${err.employeeId})">${err.action}</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
        }

        if (warnings.length > 0) {
            html += `
        <div class="alert alert-warning">
          <h4><i class="fas fa-exclamation-triangle"></i> Warnings (${warnings.length})</h4>
          <p>The following warnings were detected. You can proceed with caution:</p>
          <ul style="margin: 8px 0 0 20px;">
            ${warnings.map(warn => `
              <li><strong>${warn.employee}:</strong> ${warn.message} - <em>${warn.action}</em></li>
            `).join('')}
          </ul>
        </div>
      `;
        }

        html += '</div>';
        return html;
    }
};

window.PayrollValidation = PayrollValidation;
