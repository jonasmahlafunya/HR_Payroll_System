/**
 * Nexa HR & Payroll — Employee CSV Import Wizard
 */
const EmployeeImport = {
  _csvData: [],
  _mappings: {},
  _fields: [
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'email', label: 'Email Address', required: true },
    { key: 'idNumber', label: 'ID Number' },
    { key: 'employeeNumber', label: 'Employee No.' },
    { key: 'position', label: 'Position' },
    { key: 'department', label: 'Department' },
    { key: 'basicSalary', label: 'Basic Salary' },
    { key: 'startDate', label: 'Start Date (YYYY-MM-DD)' }
  ],

  render: function (container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="header-content">
          <h2 class="page-title">Employee Import Wizard</h2>
          <p class="page-subtitle">Upload CSV and map columns for bulk onboarding</p>
        </div>
      </div>

      <div class="card" id="import-card">
        <div class="card-body" style="padding: 40px; text-align: center;">
          <div style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;">
            <i class="fas fa-file-csv"></i>
          </div>
          <h3>Step 1: Upload CSV File</h3>
          <p class="text-muted">Select a comma-separated file containing your employee data.</p>
          <div style="margin-top: 24px;">
            <input type="file" id="csvFile" accept=".csv" style="display:none;" onchange="EmployeeImport.handleFile(this)">
            <button class="btn btn-primary btn-lg" onclick="document.getElementById('csvFile').click()">
              Choose File
            </button>
          </div>
        </div>
      </div>

      <div id="mapping-area" style="display:none;"></div>
      <div id="preview-area" style="display:none;"></div>
    `;
  },

  handleFile: function (input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      this.parseCSV(text);
    };
    reader.readAsText(file);
  },

  parseCSV: function (text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return Toast.show('CSV must have a header and at least one row', 'warning');

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      return line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    });

    this._csvData = { headers, rows };
    this.renderMapping();
  },

  renderMapping: function () {
    const card = document.getElementById('import-card');
    const area = document.getElementById('mapping-area');
    card.style.display = 'none';
    area.style.display = 'block';

    area.innerHTML = `
      <div class="card">
        <div class="card-header"><h4 class="card-title">Step 2: Map Columns</h4></div>
        <div class="card-body">
          <p>Match your CSV columns to the NexaHR employee fields.</p>
          <div class="grid-2" style="margin-top:20px;">
            ${this._fields.map(f => `
              <div class="form-group">
                <label>${f.label} ${f.required ? '<span class="text-danger">*</span>' : ''}</label>
                <select class="form-control mapping-select" data-field="${f.key}">
                  <option value="">— Don't Import —</option>
                  ${this._csvData.headers.map(h => `
                    <option value="${h}" ${h.toLowerCase().includes(f.label.toLowerCase()) ? 'selected' : ''}>${h}</option>
                  `).join('')}
                </select>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
            <button class="btn btn-secondary" onclick="EmployeeImport.render(document.getElementById('content'))">Cancel</button>
            <button class="btn btn-primary" onclick="EmployeeImport.previewImport()">Preview Import</button>
          </div>
        </div>
      </div>
    `;
  },

  previewImport: function () {
    const selects = document.querySelectorAll('.mapping-select');
    const mapping = {};
    selects.forEach(s => {
      if (s.value) mapping[s.getAttribute('data-field')] = s.value;
    });

    this._mappings = mapping;
    const area = document.getElementById('preview-area');
    area.style.display = 'block';

    const importedRows = this._csvData.rows.map(row => {
      const obj = {};
      Object.entries(mapping).forEach(([field, colName]) => {
        const idx = this._csvData.headers.indexOf(colName);
        obj[field] = row[idx];
      });
      return obj;
    });

    area.innerHTML = `
      <div class="card" style="margin-top:20px;">
        <div class="card-header"><h4 class="card-title">Step 3: Preview (${importedRows.length} Rows)</h4></div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>${this._fields.map(f => mapping[f.key] ? `<th>${f.label}</th>` : '').join('')}</tr>
            </thead>
            <tbody>
              ${importedRows.slice(0, 5).map(r => `
                <tr>${Object.keys(mapping).map(k => `<td>${r[k] || ''}</td>`).join('')}</tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-body">
          ${importedRows.length > 5 ? `<p class="text-muted text-center">+ ${importedRows.length - 5} more rows</p>` : ''}
          <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
            <button class="btn btn-primary btn-lg" onclick="EmployeeImport.finalizeImport()">
              <i class="fas fa-check"></i> Finalize Import
            </button>
          </div>
        </div>
      </div>
    `;
    area.scrollIntoView({ behavior: 'smooth' });
  },

  finalizeImport: function () {
    const importedRows = this._csvData.rows.map(row => {
      const obj = {};
      Object.entries(this._mappings).forEach(([field, colName]) => {
        const idx = this._csvData.headers.indexOf(colName);
        obj[field] = row[idx];
      });
      obj.id = Date.now() + Math.floor(Math.random() * 1000);
      obj.status = 'Active';
      return obj;
    });

    window.DB.employees = (window.DB.employees || []).concat(importedRows);
    window.DB.save();
    Toast.show(`Successfully imported ${importedRows.length} employees!`, 'success');
    loadPage('employees');
  }
};

window.renderImport = function (container) {
  EmployeeImport.render(container);
};
