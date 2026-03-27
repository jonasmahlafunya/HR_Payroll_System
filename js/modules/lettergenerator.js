// ─────────────────────────────────────────────────────────────────────────────
// Nexa HR & Payroll — js/modules/lettergenerator.js
// Letter Generator Module (Offer, Warning, Salary Confirmation)
// ─────────────────────────────────────────────────────────────────────────────

const LetterGenerator = {
  _templates: {
    'offer': {
      name: 'Offer Letter',
      body: `
<h2>OFFER OF EMPLOYMENT</h2>
<p>Date: <strong>[[date]]</strong></p>
<p>Dear <strong>[[employeeName]]</strong>,</p>
<p>We are delighted to offer you the position of <strong>[[position]]</strong> at <strong>[[companyName]]</strong>, in the <strong>[[department]]</strong> department.</p>
<p>Your starting basic salary will be <strong>[[basicSalary]]</strong> per month.</p>
<p>Your anticipated start date is <strong>[[startDate]]</strong>.</p>
<p>Please review the attached formal contract for full terms and conditions. We look forward to welcoming you to the team!</p>
<br><br>
<p>Sincerely,</p>
<p>Management<br><strong>[[companyName]]</strong></p>`
    },
    'salary': {
      name: 'Salary Confirmation',
      body: `
<h2>TO WHOM IT MAY CONCERN</h2>
<p>Date: <strong>[[date]]</strong></p>
<p><strong>Subject: Proof of Employment and Income</strong></p>
<p>This letter serves to confirm that <strong>[[employeeName]]</strong> (ID/Passport: <strong>[[idNumber]]</strong>) is currently employed by <strong>[[companyName]]</strong> in the capacity of <strong>[[position]]</strong>.</p>
<p>They have been employed with us since <strong>[[startDate]]</strong>.</p>
<p>Their current gross basic salary is <strong>[[basicSalary]]</strong> per month.</p>
<p>If you require any further information, please do not hesitate to contact our HR department.</p>
<br><br>
<p>Authorized Signatory,<br><strong>[[companyName]]</strong></p>`
    },
    'warning': {
      name: 'Written Warning',
      body: `
<h2>WRITTEN WARNING</h2>
<p>Date: <strong>[[date]]</strong></p>
<p>Employee Name: <strong>[[employeeName]]</strong><br>
Position: <strong>[[position]]</strong></p>
<p>This letter serves as a formal written warning regarding your recent conduct/performance. Despite previous verbal discussions, the following issue(s) have been noted:</p>
<p><em>[Insert specific details of the incident or performance issue here...]</em></p>
<p>You are expected to correct this behavior immediately. Failure to meet the required standards may result in further disciplinary action, up to and including termination of employment.</p>
<p>A copy of this warning will be placed in your personnel file.</p>
<br><br>
<p>Manager Signature: ____________________</p>
<p>Employee Signature: ____________________ (Acknowledging receipt only)</p>`
    },
    'termination': {
      name: 'Notice of Termination',
      body: `
<h2>NOTICE OF TERMINATION OF EMPLOYMENT</h2>
<p>Date: <strong>[[date]]</strong></p>
<p>Dear <strong>[[employeeName]]</strong>,</p>
<p>We regret to inform you that your employment with <strong>[[companyName]]</strong> as a <strong>[[position]]</strong> is being terminated, effective <em>[Insert Effective Date]</em>.</p>
<p>This decision was made due to <em>[Operational Requirements / Disciplinary Outcomes / Other]</em>.</p>
<p>You will receive your final pay, including any accrued leave, in the next payroll cycle. Please ensure all company property is returned by your final day.</p>
<p>We wish you the best in your future endeavors.</p>
<br><br>
<p>Sincerely,</p>
<p>HR Department<br><strong>[[companyName]]</strong></p>`
    }
  },

  render: function (container) {
    const companies = window.DB.companies || [];
    const compOptions = companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.3rem;margin:0;">Letter Generator</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">Generate standard HR letters and documents</div>
        </div>
        <div>
          <button class="btn btn-primary" onclick="LetterGenerator.saveToDocuments()">
            <i class="fas fa-save"></i> Save to Documents
          </button>
          <button class="btn btn-outline" onclick="LetterGenerator.printLetter()" style="margin-left:8px;">
            <i class="fas fa-print"></i> Print
          </button>
        </div>
      </div>

      <div class="grid-1-2" style="gap:20px;align-items:start;">
        <!-- Left: Form Controls -->
        <div class="card" style="padding:20px;">
          <h4 style="margin-top:0;margin-bottom:16px;font-size:1rem;color:var(--gray-800);">Document Configuration</h4>
          
          <div class="form-group">
            <label class="form-label">Template</label>
            <select id="letterTemplate" class="form-control" onchange="LetterGenerator.generatePreview()">
              ${Object.entries(this._templates).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Company</label>
            <select id="letterCompany" class="form-control" onchange="LetterGenerator._onCompanyChange(this.value)">
              <option value="">— Select Company —</option>
              ${compOptions}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Employee</label>
            <select id="letterEmployee" class="form-control" onchange="LetterGenerator.generatePreview()" disabled>
              <option value="">— Select Employee —</option>
            </select>
          </div>

          <p style="font-size:0.75rem;color:var(--gray-500);margin-top:20px;">
            Selecting an employee will automatically populate their details into the document template. You can then edit the generated text directly in the preview pane before saving.
          </p>
        </div>

        <!-- Right: Preview Pane -->
        <div class="card" style="min-height:600px;display:flex;flex-direction:column;">
          <div class="card-header" style="background:var(--gray-50);border-bottom:1px solid var(--gray-200);">
            <h4 class="card-title" style="margin:0;"><i class="fas fa-eye text-primary"></i> Live Preview</h4>
          </div>
          <div class="card-body" style="flex:1;background:#e2e8f0;padding:24px;overflow-y:auto;display:flex;justify-content:center;">
            
            <!-- The actual letter paper -->
              </div>

            </div>

          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      // Auto-select first company if available to trigger load
      const c = document.getElementById('letterCompany');
      if (c && c.options.length > 1) {
        c.selectedIndex = 1;
        this._onCompanyChange(c.value);
      }
    }, 50);
  },

  _onCompanyChange: function (companyId) {
    const empSelect = document.getElementById('letterEmployee');
    if (!companyId) {
      empSelect.innerHTML = '<option value="">— Select Employee —</option>';
      empSelect.disabled = true;
      return;
    }

    const comp = (window.DB.companies || []).find(c => c.id == companyId);
    if (comp) {
      const nameEl = document.getElementById('letterCompName');
      const emailEl = document.getElementById('letterCompEmail');
      if (nameEl) nameEl.textContent = comp.name.toUpperCase();
      if (emailEl) emailEl.textContent = `${comp.email || 'hr@' + comp.name.toLowerCase().replace(/\s/g, '') + '.co.za'} | ${comp.phone || ''}`;
    }

    const employees = (window.DB.employees || []).filter(e =>
      (e.companyId == companyId || e.companyName === comp.name)
    );

    empSelect.innerHTML = '<option value="">— Select Employee —</option>' +
      employees.map(e => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('');
    empSelect.disabled = false;

    this.generatePreview();
  },

  generatePreview: function () {
    const tplKey = document.getElementById('letterTemplate').value;
    const empId = document.getElementById('letterEmployee').value;
    const compId = document.getElementById('letterCompany').value;
    const bodyEl = document.getElementById('letterBody');

    if (!empId) {
      bodyEl.innerHTML = '<p style="color:#94a3b8;font-style:italic;">Select an employee to populate the template...</p>';
      return;
    }

    const emp = (window.DB.employees || []).find(e => e.id == empId) || {};
    const comp = (window.DB.companies || []).find(c => c.id == compId) || {};
    let html = this._templates[tplKey].body;

    // Fill variables
    const vars = {
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      employeeName: `${emp.firstName} ${emp.lastName}`,
      position: emp.position || 'Employee',
      department: emp.department || 'General',
      companyName: comp.name || 'Our Company',
      basicSalary: window.formatCurrency(emp.basicSalary || 0),
      startDate: emp.startDate || 'TBD',
      idNumber: emp.idNumber || 'Not provided',
    };

    Object.keys(vars).forEach(k => {
      // Replace all instances of [[key]] carefully to avoid IDE parsing issues
      const searchTag = '[[' + k + ']]';
      html = html.split(searchTag).join(vars[k]);
    });

    bodyEl.innerHTML = html;
  },

  printLetter: function () {
    const paper = document.getElementById('letterPaper');
    if (!paper) return;

    const printWin = window.open('', '', 'width=850,height=1100');
    const compName = document.getElementById('letterCompName')?.textContent || 'Document';

    printWin.document.write(`
      <html>
        <head>
          <title>${compName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            body { 
              font-family: 'Georgia', 'Times New Roman', serif; 
              color: #1e293b;
              margin: 0; padding: 0;
            }
            #letterPaper { padding: 40px 60px; max-width: 800px; margin: auto; }
            #letterHeader { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { margin: 0; font-size: 24px; font-family: 'Inter', sans-serif; color: #4f46e5; letter-spacing: -0.5px; text-transform: uppercase; }
            .meta { font-size: 11px; color: #64748b; font-family: 'Inter', sans-serif; margin-top: 4px; }
            h2 { font-size: 18px; text-align: center; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; font-family: 'Inter', sans-serif; color: #0f172a; }
            p { font-size: 12pt; line-height: 1.8; margin-bottom: 16px; }
            strong { color: #0f172a; }
            #letterFooter { margin-top: 60px; padding-top: 20px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
            @media print {
              body { padding: 0; }
              @page { margin: 1cm; }
              #letterPaper { box-shadow: none; border: none; padding: 0; width: 100%; max-width: none; }
            }
          </style>
        </head>
        <body>
          <div id="letterPaper">
            ${paper.innerHTML}
          </div>
          <script>
            window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  },

  saveToDocuments: function () {
    const empId = document.getElementById('letterEmployee').value;
    if (!empId) { window.showAlert('Required', 'Please select an employee first.'); return; }

    const emp = (window.DB.employees || []).find(e => e.id == empId);
    const tplSelect = document.getElementById('letterTemplate');
    const tplName = tplSelect.options[tplSelect.selectedIndex].text;
    const paperHtml = document.getElementById('letterPaper').outerHTML;

    // Create full styled HTML doc
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${tplName} - ${emp.firstName} ${emp.lastName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
          body { 
            background: #f8fafc; 
            display: flex; justify-content: center; 
            padding: 40px; 
            font-family: 'Georgia', serif;
            color: #1e293b;
          }
          #letterPaper { 
            background: white; 
            padding: 40px 60px; 
            max-width: 800px; width: 100%; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.05); 
            min-height: 1000px;
          }
          #letterHeader { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
          h1 { margin: 0; font-size: 24px; font-family: 'Inter', sans-serif; color: #4f46e5; letter-spacing: -0.5px; text-transform: uppercase; }
          .meta { font-size: 11px; color: #64748b; font-family: 'Inter', sans-serif; margin-top: 4px; }
          h2 { font-size: 18px; text-align: center; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; font-family: 'Inter', sans-serif; color: #0f172a; }
          p { font-size: 12pt; line-height: 1.8; margin-bottom: 16px; }
          #letterFooter { margin-top: 60px; padding-top: 20px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-family: 'Inter', sans-serif; }
        </style>
      </head>
      <body>
        <div id="letterPaper">
          ${paperHtml}
        </div>
      </body>
      </html>
    `;

    // Convert to data URI
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml);

    window.DB.documents = window.DB.documents || [];
    window.DB.documents.push({
      id: 'doc_' + Date.now(),
      name: `${tplName} - ${emp.firstName} ${emp.lastName}`,
      fileName: `${tplName.replace(/\s+/g, '_')}_${emp.lastName}.html`,
      category: 'Contract', // Categorized broadly under Contract/HR
      sourceType: 'generated_letter',
      mimeType: 'text/html',
      size: fullHtml.length,
      dataUrl: dataUrl,
      employeeId: empId,
      companyId: emp.companyId,
      uploadedAt: new Date().toISOString(),
      uploadedBy: window.currentUser?.name || 'System'
    });

    window.DB.save();
    window.Toast.show('Document saved successfully!', 'success');

    // Switch to documents tab for visual feedback
    if (confirm('Document saved. Would you like to view it in the Documents tab now?')) {
      window.currentEmployeeId = empId;
      window.loadPage('documents');
    }
  }
};

window.LetterGenerator = LetterGenerator;
