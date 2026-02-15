
// Bank File Generator Module - EFT Export for Payment Processing
const BankFileGenerator = {
    formats: ['Generic CSV', 'Standard Bank', 'ABSA', 'FNB', 'Nedbank'],

    generateFile: function (runId, format) {
        const run = window.DB.payrollRuns.find(r => r.id === runId);

        if (!run) {
            window.Toast.show('Payroll run not found', 'error');
            return;
        }

        if (!run.locked) {
            window.Toast.show('Payroll must be finalized before generating bank file', 'error');
            return;
        }

        let fileContent = '';
        let filename = '';

        switch (format) {
            case 'standard_bank':
            case 'Standard Bank':
                fileContent = this.generateStandardBankFormat(run);
                filename = `StandardBank_${run.company.replace(/\s/g, '_')}_${run.period.replace(/\s/g, '_')}.txt`;
                break;
            case 'absa':
            case 'ABSA':
                fileContent = this.generateABSAFormat(run);
                filename = `ABSA_${run.company.replace(/\s/g, '_')}_${run.period.replace(/\s/g, '_')}.txt`;
                break;
            case 'fnb':
            case 'FNB':
                fileContent = this.generateFNBFormat(run);
                filename = `FNB_${run.company.replace(/\s/g, '_')}_${run.period.replace(/\s/g, '_')}.txt`;
                break;
            case 'csv':
            case 'Generic CSV':
            default:
                fileContent = this.generateCSVFormat(run);
                filename = `Payroll_${run.company.replace(/\s/g, '_')}_${run.period.replace(/\s/g, '_')}.csv`;
        }

        // Download file
        this.downloadFile(fileContent, filename);

        // Create audit log
        if (!window.DB.auditLogs) window.DB.auditLogs = [];
        window.DB.auditLogs.push({
            id: window.DB.auditLogs.length + 1,
            timestamp: new Date().toISOString(),
            user: window.currentUser?.name || 'Admin User',
            action: 'Bank File Generated',
            module: 'Payroll',
            details: {
                runId: runId,
                format: format,
                employeeCount: run.employeeCount,
                totalAmount: run.totalNet,
                filename: filename
            },
            ipAddress: 'N/A'
        });
        window.DB.save();

        window.Toast.show(`Bank file generated: ${filename}`, 'success');
    },

    generateCSVFormat: function (run) {
        let csv = 'Account Number,Branch Code,Account Type,Account Holder,Amount,Reference\n';

        run.lines.forEach(line => {
            const emp = window.DB.employees.find(e => e.id === line.employeeId);
            if (!emp) return;

            csv += `${emp.accountNumber || ''},`;
            csv += `${emp.branchCode || ''},`;
            csv += `${emp.accountType || 'Cheque'},`;
            csv += `"${emp.firstName} ${emp.lastName}",`;
            csv += `${line.net.toFixed(2)},`;
            csv += `"Salary ${run.period}"\n`;
        });

        return csv;
    },

    generateStandardBankFormat: function (run) {
        // Standard Bank specific format (simplified)
        let content = '';

        // Header record
        content += '1'; // Record type
        content += run.company.padEnd(20, ' ').substring(0, 20); // Company name
        content += new Date().toISOString().substring(0, 10).replace(/-/g, ''); // Date YYYYMMDD
        content += '\n';

        // Detail records
        run.lines.forEach((line, index) => {
            const emp = window.DB.employees.find(e => e.id === line.employeeId);
            if (!emp) return;

            content += '2'; // Record type
            content += String(index + 1).padStart(6, '0'); // Sequence number
            content += (emp.accountNumber || '').padEnd(15, ' ').substring(0, 15);
            content += (emp.branchCode || '').padEnd(6, ' ').substring(0, 6);
            content += String(Math.round(line.net * 100)).padStart(13, '0'); // Amount in cents
            content += `${emp.firstName} ${emp.lastName}`.padEnd(30, ' ').substring(0, 30);
            content += '\n';
        });

        // Trailer record
        content += '9'; // Record type
        content += String(run.lines.length).padStart(6, '0'); // Total records
        content += String(Math.round(run.totalNet * 100)).padStart(15, '0'); // Total amount in cents
        content += '\n';

        return content;
    },

    generateABSAFormat: function (run) {
        // ABSA specific format (simplified - similar to Standard Bank)
        return this.generateStandardBankFormat(run);
    },

    generateFNBFormat: function (run) {
        // FNB specific format (simplified - similar to Standard Bank)
        return this.generateStandardBankFormat(run);
    },

    downloadFile: function (content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
};

window.BankFileGenerator = BankFileGenerator;
