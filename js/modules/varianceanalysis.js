
// Variance Analysis Module - Compare Current vs Previous Payroll
const VarianceAnalysis = {
    analyzeVariances: function (payrollData) {
        if (!payrollData.calculations || payrollData.calculations.length === 0) {
            return [];
        }

        // Find previous payroll run for this company
        const previousRun = this.getPreviousRun(payrollData.companyName, payrollData.period);

        if (!previousRun || !previousRun.lines || previousRun.lines.length === 0) {
            return []; // No previous payroll to compare
        }

        const variances = [];

        // Compare employee-by-employee
        payrollData.calculations.forEach(currentLine => {
            const previousLine = previousRun.lines.find(l => l.employeeId === currentLine.employeeId);

            if (!previousLine) {
                // New employee - first payroll
                variances.push({
                    type: 'new',
                    employee: currentLine.employeeName,
                    employeeId: currentLine.employeeId,
                    message: 'New employee - first payroll',
                    severity: 'info'
                });
                return;
            }

            // Check gross variance
            if (previousLine.gross > 0) {
                const grossVariance = ((currentLine.gross - previousLine.gross) / previousLine.gross) * 100;
                if (Math.abs(grossVariance) > 10) {
                    variances.push({
                        type: 'variance',
                        employee: currentLine.employeeName,
                        employeeId: currentLine.employeeId,
                        field: 'Gross Pay',
                        previous: previousLine.gross,
                        current: currentLine.gross,
                        variance: grossVariance.toFixed(2) + '%',
                        severity: Math.abs(grossVariance) > 20 ? 'high' : 'medium'
                    });
                }
            }

            // Check net variance
            if (previousLine.net > 0) {
                const netVariance = ((currentLine.net - previousLine.net) / previousLine.net) * 100;
                if (Math.abs(netVariance) > 10) {
                    variances.push({
                        type: 'variance',
                        employee: currentLine.employeeName,
                        employeeId: currentLine.employeeId,
                        field: 'Net Pay',
                        previous: previousLine.net,
                        current: currentLine.net,
                        variance: netVariance.toFixed(2) + '%',
                        severity: Math.abs(netVariance) > 20 ? 'high' : 'medium'
                    });
                }
            }

            // Check for negative net pay
            if (currentLine.net < 0) {
                variances.push({
                    type: 'error',
                    employee: currentLine.employeeName,
                    employeeId: currentLine.employeeId,
                    field: 'Net Pay',
                    current: currentLine.net,
                    message: 'Negative net pay detected!',
                    severity: 'critical'
                });
            }
        });

        // Check for missing employees (terminated?)
        previousRun.lines.forEach(previousLine => {
            const currentLine = payrollData.calculations.find(l => l.employeeId === previousLine.employeeId);
            if (!currentLine) {
                variances.push({
                    type: 'missing',
                    employee: previousLine.employeeName,
                    employeeId: previousLine.employeeId,
                    message: 'Employee not in current payroll (terminated or inactive?)',
                    severity: 'info'
                });
            }
        });

        return variances;
    },

    getPreviousRun: function (companyName, currentPeriod) {
        // Get all payroll runs for this company
        const companyRuns = window.DB.payrollRuns.filter(r =>
            r.company === companyName && r.status === 'Finalized'
        );

        if (companyRuns.length === 0) {
            return null;
        }

        // Sort by date (most recent first)
        companyRuns.sort((a, b) => new Date(b.finalizedDate) - new Date(a.finalizedDate));

        // Return the most recent run that's not the current period
        return companyRuns.find(r => r.period !== currentPeriod) || null;
    },

    renderVarianceReport: function (variances) {
        if (variances.length === 0) {
            return `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> No previous payroll found for comparison, or no significant variances detected.
        </div>
      `;
        }

        return `
      <div class="variance-report">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Field</th>
                <th class="text-right">Previous</th>
                <th class="text-right">Current</th>
                <th class="text-right">Variance</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              ${variances.map(v => `
                <tr>
                  <td>${v.employee}</td>
                  <td>
                    <span class="badge badge-${this.getTypeBadge(v.type)}">
                      ${v.type.toUpperCase()}
                    </span>
                  </td>
                  <td>${v.field || v.message || 'N/A'}</td>
                  <td class="text-right">${v.previous ? window.formatCurrency(v.previous) : '-'}</td>
                  <td class="text-right">${v.current ? window.formatCurrency(v.current) : '-'}</td>
                  <td class="text-right" style="color: ${v.variance && v.variance.includes('-') ? 'var(--danger)' : 'var(--success)'};">
                    ${v.variance || '-'}
                  </td>
                  <td>
                    <span class="badge badge-${this.getSeverityBadge(v.severity)}">
                      ${(v.severity || 'info').toUpperCase()}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    },

    getTypeBadge: function (type) {
        const badges = {
            'new': 'info',
            'variance': 'warning',
            'error': 'danger',
            'missing': 'secondary'
        };
        return badges[type] || 'info';
    },

    getSeverityBadge: function (severity) {
        const badges = {
            'critical': 'danger',
            'high': 'danger',
            'medium': 'warning',
            'low': 'info',
            'info': 'info'
        };
        return badges[severity] || 'info';
    }
};

window.VarianceAnalysis = VarianceAnalysis;
