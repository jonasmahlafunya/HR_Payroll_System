// ─── Contracts Module ─────────────────────────────────────────────────────────
const Contracts = {

  render: function (container) {
    const contracts = window.DB.contracts || [];
    const employees = window.DB.employees || [];
    const companies = window.DB.companies || [];

    const empFilter = window.currentEmployeeId || '';
    const typeFilter = window._contractTypeFilter || '';
    const search = window._contractSearch || '';

    let filtered = contracts;
    if (empFilter) filtered = filtered.filter(c => c.employeeId == empFilter);
    if (typeFilter) filtered = filtered.filter(c => c.contractType === typeFilter || c.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c => {
        const emp = employees.find(e => e.id == c.employeeId);
        return [c.contractType, c.status, emp?.firstName, emp?.lastName, emp?.position].join(' ').toLowerCase().includes(q);
      });
    }

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.25rem;margin:0;">Employment Contracts</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">${contracts.length} contracts generated</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Contracts.showGenerateModal()">
          <i class="fas fa-file-plus"></i> Generate Contract
        </button>
      </div>

      <!-- Filters -->
      <div class="card" style="padding:12px 16px;margin-bottom:16px;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <input type="text" class="search-input" style="flex:1;min-width:180px;"
            placeholder="Search contracts..."
            value="${search}"
            oninput="window._contractSearch=this.value;Contracts.render(document.getElementById('content'))">
          <select class="form-control" style="width:180px;"
            onchange="window._contractTypeFilter=this.value;Contracts.render(document.getElementById('content'))">
            <option value="">All Types</option>
            ${['Permanent', 'Fixed Term', 'Part-Time', 'Casual', 'Contractor', 'Internship', 'Probation']
        .map(t => `<option value="${t}" ${typeFilter === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <button class="btn btn-outline btn-sm" onclick="
            window._contractSearch='';window._contractTypeFilter='';window.currentEmployeeId=null;
            Contracts.render(document.getElementById('content'))">
            <i class="fas fa-times"></i> Clear
          </button>
        </div>
      </div>

      ${!filtered.length ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-file-signature"></i></div>
          <div class="empty-state-title">No Contracts Found</div>
          <div class="empty-state-desc">Generate employment contracts for your employees.</div>
          <button class="btn btn-primary btn-sm" style="margin-top:16px;" onclick="Contracts.showGenerateModal()">
            <i class="fas fa-file-plus"></i> Generate Contract
          </button>
        </div>` : `
      <div class="table-responsive">
        <table>
          <thead>
            <tr><th>Employee</th><th>Contract Type</th><th>Start Date</th><th>End Date</th>
                <th>Status</th><th>Generated</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${filtered.map(c => {
          const emp = employees.find(e => e.id == c.employeeId);
          const company = companies.find(co => co.id == (emp?.companyId || c.companyId));
          const statusColor = { 
            Active: 'success', 
            Approved: 'success',
            Draft: 'gray', 
            Expired: 'danger', 
            'Pending Approval': 'warning',
            'Pending Signature': 'warning' 
          };
          return `
                <tr>
                  <td>
                    <div style="font-weight:600;font-size:0.85rem;">
                      ${emp ? emp.firstName + ' ' + emp.lastName : 'Unknown'}
                    </div>
                    <div style="font-size:0.72rem;color:var(--gray-500);">${emp?.position || '—'}</div>
                  </td>
                  <td><span class="badge badge-info" style="font-size:0.7rem;">${c.contractType || c.type || '—'}</span></td>
                  <td style="font-size:0.82rem;">${c.startDate || '—'}</td>
                  <td style="font-size:0.82rem;">${c.endDate || 'Indefinite'}</td>
                  <td><span class="badge badge-${statusColor[c.status] || 'gray'}">${c.status || 'Active'}</span></td>
                  <td style="font-size:0.72rem;color:var(--gray-500);">
                    ${c.generatedAt ? new Date(c.generatedAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div style="display:flex;gap:4px;">
                      <button class="btn-icon" title="View Contract" onclick="Contracts.viewContract('${c.id}')">
                        <i class="fas fa-eye"></i>
                      </button>
                      ${c.status === 'Pending Approval' ? `
                        <button class="btn-icon" title="Approve & Send to Employee" style="color:var(--success);"
                          onclick="Contracts.approveContract('${c.id}')">
                          <i class="fas fa-check-circle"></i>
                        </button>
                      ` : ''}
                      <button class="btn-icon" title="Download PDF" onclick="Contracts.downloadPDF('${c.id}')">
                        <i class="fas fa-file-pdf"></i>
                      </button>
                      <button class="btn-icon" title="Send by Email" onclick="Contracts.sendByEmail('${c.id}')">
                        <i class="fas fa-envelope"></i>
                      </button>
                      <button class="btn-icon" title="Delete" style="color:var(--danger);"
                        onclick="Contracts.deleteContract('${c.id}')">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>`;
        }).join('')}
          </tbody>
        </table>
      </div>`}`;
  },

  showGenerateModal: function () {
    const employees = (window.DB.employees || []).filter(e => e.status !== 'Terminated');
    const preEmpId = window.currentEmployeeId || '';
    const today = new Date().toISOString().split('T')[0];

    const html = `
      <div class="card" style="width:100%;max-width:660px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-file-signature text-primary"></i> Generate Employment Contract</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('generateContractModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="grid-2">
            <div class="form-group" style="grid-column:span 2;">
              <label class="form-label">Employee *</label>
              <select id="ct_emp" class="form-control" onchange="Contracts.prefillFromEmployee(this.value)">
                <option value="">— Select Employee —</option>
                ${employees.map(e => `<option value="${e.id}" ${preEmpId == e.id ? 'selected' : ''}>${e.firstName} ${e.lastName} — ${e.position || 'No position'}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Contract Type</label>
              <select id="ct_type" class="form-control" onchange="Contracts._toggleEndDate(this.value)">
                <option>Permanent</option><option>Fixed Term</option><option>Part-Time</option>
                <option>Casual</option><option>Contractor</option><option>Internship</option><option>Probation</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Job Title / Position</label>
              <input id="ct_position" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input id="ct_start" type="date" class="form-control" value="${today}">
            </div>
            <div class="form-group" id="ct_endGroup">
              <label class="form-label">End Date</label>
              <input id="ct_end" type="date" class="form-control">
              <div class="form-hint">Leave blank for permanent / indefinite</div>
            </div>
            <div class="form-group">
              <label class="form-label">Basic Salary (R)</label>
              <input id="ct_salary" type="number" class="form-control" placeholder="0.00">
            </div>
            <div class="form-group">
              <label class="form-label">Pay Frequency</label>
              <select id="ct_freq" class="form-control">
                <option>Monthly</option><option>Bi-Weekly</option><option>Weekly</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Probation Period</label>
              <select id="ct_probation" class="form-control">
                <option value="">None</option>
                <option value="1 month">1 month</option><option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Working Hours</label>
              <input id="ct_hours" class="form-control" placeholder="e.g. 40 hours per week" value="40 hours per week">
            </div>
            <div class="form-group" style="grid-column:span 2;">
              <label class="form-label">Additional Terms / Notes</label>
              <textarea id="ct_notes" class="form-control" rows="2"
                placeholder="Any special terms or conditions..."></textarea>
            </div>
          </div>

          <div class="alert alert-info" style="font-size:0.8rem;margin-top:8px;">
            <i class="fas fa-info-circle"></i>
            The contract will be generated with your company logo and automatically emailed to the company HR email.
          </div>

          <button class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="Contracts.generateContract()">
            <i class="fas fa-file-plus"></i> Generate &amp; Send Contract
          </button>
        </div>
      </div>`;
    window.showModal('generateContractModal', html);

    // Pre-fill if employee pre-selected
    if (preEmpId) this.prefillFromEmployee(preEmpId);
  },

  prefillFromEmployee: function (empId) {
    if (!empId) return;
    const emp = (window.DB.employees || []).find(e => e.id == empId);
    if (!emp) return;

    const posEl = document.getElementById('ct_position');
    const salEl = document.getElementById('ct_salary');
    const startEl = document.getElementById('ct_start');
    const typeEl = document.getElementById('ct_type');

    if (posEl && !posEl.value && emp.position) posEl.value = emp.position;
    if (salEl && !salEl.value && emp.basicSalary) salEl.value = emp.basicSalary;
    if (startEl && !startEl.value && emp.startDate) startEl.value = emp.startDate;
    if (typeEl && emp.employmentType) {
      const opt = [...typeEl.options].find(o => o.value === emp.employmentType);
      if (opt) typeEl.value = emp.employmentType;
    }

    // Get company frequency
    const comp = (window.DB.companies || []).find(c => c.id == emp.companyId || c.name === emp.companyName);
    if (comp?.payFrequency) {
      const freqEl = document.getElementById('ct_freq');
      if (freqEl) freqEl.value = comp.payFrequency;
    }
  },

  _toggleEndDate: function (type) {
    const group = document.getElementById('ct_endGroup');
    if (group) group.style.opacity = type === 'Permanent' ? '0.4' : '1';
  },

  generateContract: function () {
    const empId = document.getElementById('ct_emp')?.value;
    const type = document.getElementById('ct_type')?.value || 'Permanent';
    const position = document.getElementById('ct_position')?.value?.trim();
    const startDate = document.getElementById('ct_start')?.value;
    const endDate = document.getElementById('ct_end')?.value || '';
    const salary = parseFloat(document.getElementById('ct_salary')?.value) || 0;
    const freq = document.getElementById('ct_freq')?.value || 'Monthly';
    const probation = document.getElementById('ct_probation')?.value || '';
    const hours = document.getElementById('ct_hours')?.value || '40 hours per week';
    const notes = document.getElementById('ct_notes')?.value?.trim() || '';

    if (!empId) { window.showAlert('Required', 'Please select an employee.'); return; }

    const emp = (window.DB.employees || []).find(e => e.id == empId);
    if (!emp) { window.showAlert('Error', 'Employee not found.'); return; }

    const company = (window.DB.companies || []).find(c => c.id == emp.companyId || c.name === emp.companyName);
    const compName = company?.name || emp.companyName || 'The Company';
    const compAddr = company?.address || '';
    const compTax = company?.taxReference || '';
    const compEmail = company?.email || '';
    const compLogo = company?.logo || null;

    const finalPosition = position || emp.position || 'Employee';
    const finalSalary = salary || emp.basicSalary || 0;

    const contractId = 'CON_' + Date.now();
    const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

    // ── Build HTML contract ──────────────────────────────────────────────────
    const contractHTML = this._buildContractHTML({
      contractId, type, emp, compName, compAddr, compTax, compLogo,
      position: finalPosition, startDate, endDate, salary: finalSalary,
      freq, probation, hours, notes, today
    });

    // Save contract record
    const contract = {
      id: contractId,
      employeeId: emp.id,
      companyId: company?.id,
      contractType: type,
      type,
      status: 'Pending Approval',
      startDate,
      endDate,
      salary: finalSalary,
      position: finalPosition,
      payFrequency: freq,
      probation,
      hours,
      notes,
      htmlContent: contractHTML,
      generatedAt: new Date().toISOString(),
      generatedBy: window.currentUser?.name || 'Admin'
    };

    window.DB.contracts = window.DB.contracts || [];
    window.DB.contracts.push(contract);

    // Also add to Documents tab so it appears under Documents → Contract
    window.DB.documents = window.DB.documents || [];
    window.DB.documents.push({
      id: 'DOC_' + contractId,
      name: `Contract — ${emp.firstName} ${emp.lastName} (${type})`,
      category: 'Contract',
      employeeId: emp.id,
      companyWide: false,
      description: `${type} employment contract for ${emp.firstName} ${emp.lastName}`,
      size: contract.htmlContent ? contract.htmlContent.length : 0,
      mimeType: 'text/html',
      fileName: `Contract_${contractId}.html`,
      dataUrl: contract.htmlContent
        ? 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(contract.htmlContent)))
        : null,
      uploadedAt: new Date().toISOString(),
      uploadedBy: window.currentUser?.name || 'Admin',
      sourceId: contractId,
      sourceType: 'contract'
    });

    window.DB.save();

    window.closeModal('generateContractModal');
    window.Toast.show('Contract generated! Opening preview...', 'success');

    // Open contract in new tab
    this._openContractPreview(contractHTML, contract);

    // Automatically email to company HR email for approval
    if (compEmail) {
      this._emailContract(contract, emp, company, contractHTML, 'Company');
    }

    this.render(document.getElementById('content'));
  },

  _buildContractHTML: function (d) {
    const {
      contractId, type, emp, compName, compAddr, compTax, compLogo,
      position, startDate, endDate, salary, freq, probation, hours, notes, today
    } = d;

    const fmt = v => 'R ' + Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const logoHtml = compLogo
      ? `<img src="${compLogo}" style="max-width:160px;max-height:70px;object-fit:contain;">`
      : `<div style="font-size:1.5rem;font-weight:900;color:#4f46e5;">${compName}</div>`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Employment Contract — ${emp.firstName} ${emp.lastName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; color: #1e293b;
           background: white; padding: 40px; max-width: 820px; margin: 0 auto; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: flex-start;
              padding-bottom: 20px; border-bottom: 3px solid #4f46e5; margin-bottom: 28px; }
    .company-info { text-align: right; font-size: 10pt; color: #475569; }
    h1 { font-size: 16pt; font-weight: bold; text-align: center; letter-spacing: 2px;
         text-transform: uppercase; color: #1e293b; margin-bottom: 6px; }
    .subtitle { text-align: center; font-size: 10pt; color: #64748b; margin-bottom: 24px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase;
                     letter-spacing: 1px; color: #4f46e5; border-bottom: 1px solid #e2e8f0;
                     padding-bottom: 4px; margin-bottom: 10px; }
    .clause { margin-bottom: 10px; text-align: justify; }
    .clause strong { color: #1e293b; }
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    table.info td { padding: 6px 8px; font-size: 11pt; border: 1px solid #e2e8f0; }
    table.info td:first-child { background: #f8fafc; font-weight: bold; width: 40%; }
    .signature-block { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 48px; }
    .sig-line { border-top: 1px solid #1e293b; padding-top: 8px; margin-top: 48px; font-size: 10pt; color: #475569; }
    .ref { font-size: 9pt; color: #94a3b8; text-align: center; margin-top: 28px;
           padding-top: 12px; border-top: 1px solid #e2e8f0; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Print / Download buttons (hidden when printing) -->
  <div class="no-print" style="display:flex;gap:10px;justify-content:flex-end;margin-bottom:24px;">
    <button onclick="window.print()"
      style="padding:8px 18px;background:#4f46e5;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">
      🖨 Print / Save PDF
    </button>
  </div>

  <!-- Header -->
  <div class="header">
    ${logoHtml}
    <div class="company-info">
      <strong>${compName}</strong><br>
      ${compAddr ? compAddr + '<br>' : ''}
      ${compTax ? 'Tax Ref: ' + compTax + '<br>' : ''}
      Ref: ${contractId}
    </div>
  </div>

  <h1>Employment Contract</h1>
  <div class="subtitle">${type} Employment Agreement &bull; Issued: ${today}</div>

  <!-- Parties -->
  <div class="section">
    <div class="section-title">1. The Parties</div>
    <div class="clause">
      This Employment Contract is entered into between:
    </div>
    <table class="info">
      <tr><td>Employer (Company)</td><td><strong>${compName}</strong></td></tr>
      ${compAddr ? `<tr><td>Business Address</td><td>${compAddr}</td></tr>` : ''}
      ${compTax ? `<tr><td>Tax Reference No.</td><td>${compTax}</td></tr>` : ''}
      <tr><td>Employee Full Name</td><td><strong>${emp.firstName} ${emp.lastName}</strong></td></tr>
      <tr><td>ID Number</td><td>${emp.idNumber || '—'}</td></tr>
      <tr><td>Residential Address</td><td>${emp.address || emp.residentialAddress || '—'}</td></tr>
    </table>
  </div>

  <!-- Position -->
  <div class="section">
    <div class="section-title">2. Position &amp; Commencement</div>
    <table class="info">
      <tr><td>Job Title / Position</td><td><strong>${position}</strong></td></tr>
      <tr><td>Department</td><td>${emp.department || '—'}</td></tr>
      <tr><td>Contract Type</td><td>${type}</td></tr>
      <tr><td>Commencement Date</td><td>${startDate || today}</td></tr>
      ${endDate ? `<tr><td>End Date</td><td>${endDate}</td></tr>` : '<tr><td>Duration</td><td>Indefinite (subject to notice)</td></tr>'}
      ${probation ? `<tr><td>Probation Period</td><td>${probation}</td></tr>` : ''}
    </table>
  </div>

  <!-- Remuneration -->
  <div class="section">
    <div class="section-title">3. Remuneration</div>
    <table class="info">
      <tr><td>Basic Salary</td><td><strong>${fmt(salary)} per month</strong></td></tr>
      <tr><td>Pay Frequency</td><td>${freq}</td></tr>
      <tr><td>Payment Method</td><td>Electronic Funds Transfer (EFT)</td></tr>
      ${emp.bankName ? `<tr><td>Bank</td><td>${emp.bankName} &mdash; ${emp.accountNumber || '—'}</td></tr>` : ''}
    </table>
    <div class="clause">
      The Employee's salary is subject to statutory deductions including PAYE, UIF, and any other
      legally required deductions as prescribed by South African law.
    </div>
  </div>

  <!-- Hours -->
  <div class="section">
    <div class="section-title">4. Working Hours</div>
    <div class="clause">
      The Employee will work <strong>${hours}</strong>, in accordance with the Basic Conditions of
      Employment Act (BCEA). Overtime will be remunerated as prescribed by applicable legislation.
    </div>
  </div>

  <!-- Leave -->
  <div class="section">
    <div class="section-title">5. Leave Entitlement</div>
    <div class="clause">
      The Employee is entitled to the following leave, in line with the Basic Conditions of Employment Act:
    </div>
    <div class="clause">
      &bull; <strong>Annual Leave:</strong> 21 consecutive days per leave cycle (15 working days)<br>
      &bull; <strong>Sick Leave:</strong> 30 days over a 3-year cycle<br>
      &bull; <strong>Family Responsibility Leave:</strong> 3 days per annum<br>
      &bull; <strong>Maternity Leave:</strong> 4 consecutive months (unpaid)
    </div>
  </div>

  <!-- Termination -->
  <div class="section">
    <div class="section-title">6. Termination &amp; Notice</div>
    <div class="clause">
      Either party may terminate this contract by giving the required notice period:
      <strong>1 week</strong> if employed for 6 months or less;
      <strong>2 weeks</strong> if employed for more than 6 months but less than 1 year;
      <strong>4 weeks</strong> if employed for 1 year or more, or if employed as a farm worker or domestic employee.
      Termination for misconduct or incapacity will follow a fair procedure as per the Labour Relations Act.
    </div>
  </div>

  <!-- Confidentiality -->
  <div class="section">
    <div class="section-title">7. Confidentiality</div>
    <div class="clause">
      The Employee agrees to keep all confidential information relating to the Employer's business,
      clients, and operations strictly confidential during and after the term of employment.
    </div>
  </div>

  ${notes ? `
  <!-- Additional Terms -->
  <div class="section">
    <div class="section-title">8. Additional Terms</div>
    <div class="clause">${notes}</div>
  </div>` : ''}

  <!-- Governing Law -->
  <div class="section">
    <div class="section-title">${notes ? '9' : '8'}. Governing Law</div>
    <div class="clause">
      This Contract is governed by the laws of the Republic of South Africa, including the
      Labour Relations Act (LRA), Basic Conditions of Employment Act (BCEA), Employment Equity
      Act (EEA), and the Skills Development Act (SDA).
    </div>
  </div>

  <!-- Signatures -->
  <div class="section">
    <div class="section-title">Signatures</div>
    <div class="clause" style="margin-bottom:16px;">
      By signing below, both parties confirm they have read, understood, and agree to the terms of this contract.
    </div>

    <div class="signature-block">
      <div>
        <div class="sig-line">
          <strong>For and on behalf of the Employer:</strong><br>
          ${compName}<br><br>
          Name: ___________________________<br><br>
          Date: ___________________________
        </div>
      </div>
      <div>
        <div class="sig-line">
          <strong>Employee:</strong><br>
          ${emp.firstName} ${emp.lastName}<br><br>
          Signature: ______________________<br><br>
          Date: ___________________________
        </div>
      </div>
    </div>
  </div>

  <div class="ref">
    Generated by Nexa HR &amp; Payroll Management System &bull; Ref: ${contractId} &bull; ${today}
  </div>

</body>
</html>`;
  },

  _openContractPreview: function (html, contract) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  viewContract: function (contractId) {
    const c = (window.DB.contracts || []).find(c => c.id === contractId);
    if (!c) return;
    if (c.htmlContent) {
      this._openContractPreview(c.htmlContent, c);
    } else {
      window.Toast.show('Contract HTML not available — try regenerating.', 'warning');
    }
  },

  downloadPDF: function (contractId) {
    const c = (window.DB.contracts || []).find(c => c.id === contractId);
    if (!c || !c.htmlContent) { window.Toast.show('No contract content available.', 'warning'); return; }
    const blob = new Blob([c.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contract_${contractId}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    window.Toast.show('Contract downloaded', 'success');
  },

  sendByEmail: function (contractId) {
    const c = (window.DB.contracts || []).find(c => c.id === contractId);
    if (!c) return;
    const emp = (window.DB.employees || []).find(e => e.id == c.employeeId);
    const company = (window.DB.companies || []).find(co => co.id == c.companyId);

    this._emailContract(c, emp, company, c.htmlContent, 'Employee');
  },

  approveContract: function (contractId) {
    const c = (window.DB.contracts || []).find(it => it.id === contractId);
    if (!c) return;
    const emp = (window.DB.employees || []).find(e => e.id == c.employeeId);
    const company = (window.DB.companies || []).find(co => co.id == c.companyId);

    window.showConfirmation('Approve Contract', 
      `Approve this contract and send it to <strong>${emp.firstName} ${emp.lastName}</strong> via email?`, 
      () => {
        c.status = 'Approved';
        window.DB.save();
        this._emailContract(c, emp, company, c.htmlContent, 'Employee');
        this.render(document.getElementById('content'));
        window.Toast.show('Contract Approved & Sent to Employee', 'success');
      }
    );
  },

  _emailContract: function (contract, emp, company, html, target) {
    if (!target) target = 'Employee';
    if (!html) { window.Toast.show('No contract HTML to send.', 'warning'); return; }

    const compEmail = company?.email;
    const empEmail = emp?.email;

    if (target === 'Company' && !compEmail) {
      window.Toast.show('No company email address found.', 'warning');
      return;
    }
    if (target === 'Employee' && !empEmail) {
      window.Toast.show('No employee email address found.', 'warning');
      return;
    }

    const recipient = (target === 'Company') ? compEmail : empEmail;
    const subjectPrefix = (target === 'Company') ? 'Needs Approval: ' : '';
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Employee';
    const compName = company?.name || emp?.companyName || 'Company';
    const position = contract.position || emp?.position || 'Employee';
    const startDate = contract.startDate || '—';
    const type = contract.contractType || contract.type || 'Employment';

    const emailBody = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 12px;">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
  <tr><td style="background:#4f46e5;padding:28px 32px;">
    <div style="font-size:18px;font-weight:800;color:white;">Employment Contract</div>
    <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px;">${compName}</div>
  </td></tr>
  <tr><td style="padding:24px 32px;">
    <p style="font-size:15px;color:#1e293b;">Dear ${target === 'Company' ? 'HR Team' : (emp?.firstName || 'Employee')},</p>
    <p style="font-size:14px;color:#475569;margin:12px 0;">
      ${target === 'Company' 
        ? 'A new employment contract has been generated and requires your approval before being sent to the employee:' 
        : 'Please find your employment contract attached for review and signature:'}
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
      <tr style="background:#f8fafc;">
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Employee Name</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;">${empName}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Position</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;">${position}</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Contract Type</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;">${type}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Start Date</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;">${startDate}</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Reference</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;">${contract.id}</td>
      </tr>
    </table>
    <p style="font-size:14px;color:#475569;">
      The full employment contract is attached to this email as an HTML file.
      ${target === 'Company' 
        ? 'Please review this in the payroll system to Approve & Send to the employee.' 
        : 'Please review, sign, and return a copy to the HR department.'}
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:14px 32px;text-align:center;
    font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
    Nexa HR &amp; Payroll &bull; Ref: ${contract.id}
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    // Base64 the contract HTML for attachment
    let b64Attachment = null;
    try {
      b64Attachment = btoa(unescape(encodeURIComponent(html)));
    } catch (_) { }

    const attachments = b64Attachment ? [{
      filename: `Contract_${empName.replace(/\s/g, '_')}_${contract.id}.html`,
      content_base64: b64Attachment,
      mime_type: 'text/html'
    }] : [];

    let authToken = '';
    try {
      const s = JSON.parse(localStorage.getItem('hrpms_user') || '{}');
      authToken = s.token || s.authToken || '';
    } catch (_) { }

    fetch('api/email.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
      body: JSON.stringify({
        to: recipient,
        subject: `${subjectPrefix}Employment Contract — ${empName} | ${compName}`,
        body_html: emailBody,
        body_text: `Employment Contract generated for ${empName} (${position}) at ${compName}. Contract ID: ${contract.id}`,
        attachments
      })
    })
      .then(r => r.json().catch(() => ({})))
      .then(data => {
        if (data.status === 'sent') {
          window.Toast.show(`Contract emailed to ${recipient}`, 'success');
        } else {
          console.warn('[Contracts] Email result:', data);
          window.Toast.show(`Email send attempted to ${recipient}. Check server logs if not received.`, 'info');
        }
      })
      .catch(err => {
        console.warn('[Contracts] Email error:', err);
        window.Toast.show('Email could not be sent. Contract is saved — you can resend manually.', 'warning');
      });
  },

  deleteContract: function (contractId) {
    const c = (window.DB.contracts || []).find(c => c.id === contractId);
    if (!c) return;
    window.showConfirmation('Delete Contract', 'Delete this contract record?', () => {
      window.DB.contracts = (window.DB.contracts || []).filter(c => c.id !== contractId);
      window.DB.save();
      window.Toast.show('Contract deleted', 'success');
      this.render(document.getElementById('content'));
    });
  }
};

window.renderContracts = function (container) {
  Contracts.render(container);
};
window.Contracts = Contracts;