/**
 * Nexa HR & Payroll — Employee Bulk Import
 * Step 1: Select which fields to import (EmpNumber always mandatory)
 * Step 2: Upload CSV / paste from spreadsheet
 * Step 3: Map columns → selected fields only
 * Step 4: Preview with update vs create detection
 * Step 5: Finalize — updates existing, creates new
 */
const EmployeeImport = {
  _csvData:       null,   // { headers:[], rows:[] }
  _mappings:      {},
  _selectedFields: [],    // keys of fields the user chose to include
  _pasteMode:     false,

  // ── Master field catalogue ────────────────────────────────────────────────
  // mandatory:true  → always included, checkbox disabled
  // group          → used to visually group fields in the selector
  _allFields: [
    // Identity
    { key:'employeeNumber', label:'Employee Number', group:'Identity',  mandatory:true,
      hint:'Used to match existing employees for updates' },
    { key:'firstName',      label:'First Name',       group:'Identity',  newOnly:true },
    { key:'lastName',       label:'Last Name',        group:'Identity',  newOnly:true },
    { key:'idNumber',       label:'ID Number',        group:'Identity'  },
    { key:'email',          label:'Email Address',    group:'Identity'  },
    { key:'phone',          label:'Phone Number',     group:'Identity'  },
    { key:'gender',         label:'Gender',           group:'Identity'  },
    { key:'race',           label:'Race / EE Category', group:'Identity' },
    { key:'dateOfBirth',    label:'Date of Birth',    group:'Identity'  },
    // Job
    { key:'position',       label:'Position / Job Title', group:'Job'   },
    { key:'department',     label:'Department',           group:'Job'   },
    { key:'location',       label:'Work Location',         group:'Job'   },
    { key:'costCenter',     label:'Cost Centre',           group:'Job'   },
    { key:'startDate',      label:'Start Date (YYYY-MM-DD)', group:'Job', newOnly:true },
    { key:'employmentType', label:'Employment Type',        group:'Job'  },
    // Compensation
    { key:'basicSalary',    label:'Basic Salary (R)',         group:'Compensation' },
    { key:'ratePerHour',    label:'Hourly Rate (R)',           group:'Compensation' },
    { key:'bonus',          label:'Bonus (R)',                 group:'Compensation' },
    { key:'medical',        label:'Medical Aid Contribution',  group:'Compensation' },
    { key:'pension',        label:'Pension Contribution',      group:'Compensation' },
    // Banking
    { key:'bankName',       label:'Bank Name',        group:'Banking' },
    { key:'bankBranch',     label:'Branch Code',      group:'Banking' },
    { key:'bankAccount',    label:'Account Number',   group:'Banking' },
    { key:'bankAccountType',label:'Account Type',     group:'Banking' },
  ],

  // ── STEP 0: Render the page shell ─────────────────────────────────────────
  render: function (container) {
    this._csvData        = null;
    this._mappings       = {};
    this._selectedFields = [];

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <div>
          <h2 class="import-header-gradient" style="margin-bottom:6px;">
            <i class="fas fa-bolt" style="color:#fbbf24; margin-right:8px;"></i> Data Importer
          </h2>
          <p style="color:var(--gray-500); font-size:0.95rem; font-weight:500;">
            Seamlessly import or update employee records in seconds.
          </p>
        </div>
        <div>
          <button class="btn" style="background:#fff; border:1px solid var(--gray-200); color:var(--gray-700); font-weight:600; box-shadow:0 4px 6px rgba(0,0,0,0.02); padding:10px 18px; border-radius:10px;" onclick="EmployeeImport.downloadTemplate()">
            <i class="fas fa-file-csv" style="color:#10b981; margin-right:6px;"></i> Download CSV Template
          </button>
        </div>
      </div>


      <style>
        .import-header-gradient { background: linear-gradient(135deg, var(--primary), #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; font-size: 2rem; margin: 0; }
        .import-glass-card { background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 16px 40px rgba(0,0,0,0.04); border-radius: 20px; overflow: hidden; }
        .import-glass-card:hover { transform: translateY(-2px); box-shadow: 0 20px 48px rgba(0,0,0,0.06); transition: all 0.3s ease; }
        .import-step-wrapper { display: flex; align-items: center; margin: 30px auto 40px; max-width: 800px; justify-content: space-between; position: relative; }
        .import-step-bar { position: absolute; top: 22px; left: 0; right: 0; height: 3px; background: var(--gray-200); z-index: 0; border-radius: 2px; }
        .import-step-node { display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; gap: 8px; width: 100px; }
        .import-step-circle { width: 46px; height: 46px; border-radius: 50%; background: #fff; border: 2px solid var(--gray-200); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--gray-400); box-shadow: 0 4px 12px rgba(0,0,0,0.04); font-size: 1.1rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .active .import-step-circle { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; border: none; box-shadow: 0 8px 24px rgba(var(--primary-rgb), 0.4); transform: scale(1.15); }
        .completed .import-step-circle { background: var(--success); color: white; border: none; }
        .import-step-label { font-size: 0.8rem; font-weight: 600; color: var(--gray-500); text-align: center; transition: all 0.3s; }
        .active .import-step-label { color: var(--primary); font-weight: 700; }
        .import-field-modern { display:flex; align-items: flex-start; gap: 14px; padding: 18px; border-radius: 14px; border: 1px solid var(--gray-200); background: #fff; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
        .import-field-modern:hover { border-color: var(--primary-light); background: var(--primary-soft); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.03); }
        .import-field-modern.mandatory { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.04); }
        .import-field-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--gray-100); display: flex; align-items: center; justify-content: center; color: var(--gray-500); font-size: 1.1rem; flex-shrink: 0; }
        .import-field-modern:hover .import-field-icon { background: white; color: var(--primary); }
        .import-field-content { flex: 1; }
        .import-fld-check:checked + .import-field-modern { border-color: var(--primary); background: var(--primary-soft); }
        .import-fld-check:checked + .import-field-modern .import-field-icon { background: var(--primary); color: white; }
        .import-btn-gradient { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; border: none; font-weight: 600; padding: 10px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(var(--primary-rgb),0.3); transition: all 0.2s; }
        .import-btn-gradient:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(var(--primary-rgb),0.4); filter: brightness(1.05); }
      </style>
      
      <!-- Step progress indicator -->
      <div class="import-step-wrapper" id="importSteps">
        <div class="import-step-bar"></div>
        ${['Select Fields','Upload Data','Map Columns','Preview','Finished'].map((s, i) => `
          <div class="import-step-node import-step ${i === 0 ? 'active' : ''}" id="importStep${i}">
            <div class="import-step-circle">${i + 1}</div>
            <div class="import-step-label">${s}</div>
          </div>
        `).join('')}
      </div>

      <!-- Step panels -->
      <div id="stepFieldSelect"></div>
      <div id="stepUpload"       style="display:none;"></div>
      <div id="stepMapping"      style="display:none;"></div>
      <div id="stepPreview"      style="display:none;"></div>
      <div id="stepDone"         style="display:none;"></div>
    `;

    this._renderFieldSelect();
  },

  // ── STEP 1: Field selector ────────────────────────────────────────────────
  _renderFieldSelect: function () {
    this._setStep(0);
    const groups = {};
    this._allFields.forEach(f => {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    });

    const groupIcons = {
      Identity:     'fa-id-card',
      Job:          'fa-briefcase',
      Compensation: 'fa-money-bill-wave',
      Banking:      'fa-university',
    };

    const html = `
      <div class="card import-glass-card" style="border:none;">
        <div class="card-header" style="border-bottom: 1px solid var(--gray-100); padding: 24px 30px;">
          <div>
            <h3 style="margin:0; font-weight: 800; color: var(--gray-800); font-size: 1.4rem;">What are you importing today?</h3>
            <p style="color:var(--gray-500);font-size:0.9rem;margin:6px 0 0;">
              Select the data fields present in your file. <strong>Employee Number</strong> is always required for tracking.
            </p>
          </div>
          <div style="display:flex;gap:10px; background: var(--gray-50); padding: 6px; border-radius: 12px; border: 1px solid var(--gray-200);">
            <button class="btn btn-sm" style="background:#fff; color:var(--gray-700); border:1px solid var(--gray-200); box-shadow:0 2px 4px rgba(0,0,0,0.02); font-weight:600; border-radius:8px;" onclick="EmployeeImport._selectPreset('new')">
              <i class="fas fa-user-plus" style="color:var(--primary)"></i> New Emp.
            </button>
            <button class="btn btn-sm" style="background:#fff; color:var(--gray-700); border:1px solid var(--gray-200); box-shadow:0 2px 4px rgba(0,0,0,0.02); font-weight:600; border-radius:8px;" onclick="EmployeeImport._selectPreset('salary')">
              <i class="fas fa-coins" style="color:#f59e0b"></i> Salary
            </button>
            <button class="btn btn-sm" style="background:#fff; color:var(--gray-700); border:1px solid var(--gray-200); box-shadow:0 2px 4px rgba(0,0,0,0.02); font-weight:600; border-radius:8px;" onclick="EmployeeImport._selectPreset('banking')">
              <i class="fas fa-university" style="color:#10b981"></i> Banking
            </button>
            <button class="btn btn-sm" style="background:var(--gray-200); color:var(--gray-700); border:none; border-radius:8px; font-weight:600;" onclick="EmployeeImport._selectAll()">
               Select All
            </button>
          </div>
        </div>
        <div class="card-body" style="padding: 30px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:30px;">
            ${Object.entries(groups).map(([group, fields]) => `
              <div class="import-field-group">
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--gray-800); margin-bottom: 16px; display:flex; align-items:center; gap:8px;">
                  <div style="width:32px; height:32px; border-radius:8px; background:var(--primary-soft); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:0.9rem;">
                    <i class="fas ${groupIcons[group] || 'fa-list'}"></i>
                  </div>
                  ${group} Data
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                ${fields.map(f => `
                  <label style="position:relative; margin:0;">
                    <input type="checkbox"
                      id="fld_${f.key}"
                      value="${f.key}"
                      ${f.mandatory ? 'checked disabled' : ''}
                      onchange="EmployeeImport._onFieldToggle()"
                      class="import-fld-check"
                      style="position:absolute; opacity:0; pointer-events:none;"
                    >
                    <div class="import-field-modern ${f.mandatory ? 'mandatory' : ''}">
                      <div class="import-field-icon">
                         <i class="fas fa-check" style="${f.mandatory ? 'opacity:1' : 'opacity:0'}; transition:0.2s; font-size:0.9rem;"></i>
                      </div>
                      <div class="import-field-content">
                        <div style="font-weight: 600; color: var(--gray-800); font-size: 0.92rem; display:flex; align-items:center; gap:8px;">
                          ${f.label}
                          ${f.mandatory ? '<span style="font-size:0.65rem; padding: 2px 6px; background: rgba(99,102,241,0.15); color: var(--primary); border-radius:4px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Required</span>' : ''}
                          ${f.newOnly ? '<span style="font-size:0.65rem; padding: 2px 6px; background: rgba(16,185,129,0.15); color: #10b981; border-radius:4px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">New Only</span>' : ''}
                        </div>
                        ${f.hint ? `<div style="font-size:0.75rem; color:var(--gray-500); margin-top:4px;">${f.hint}</div>` : ''}
                      </div>
                    </div>
                  </label>
                `).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Selected count banner -->
          <div id="fieldSelectionSummary" style="margin-top:30px;background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08)); border:1px solid rgba(99,102,241,0.2); border-radius:16px; padding:20px 24px; display:flex; align-items:center; justify-content:space-between; transform: translateY(0); transition: all 0.3s; box-shadow: 0 10px 25px rgba(99,102,241,0.05);">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:40px; height:40px; background:rgba(99,102,241,0.15); color:var(--primary); font-weight:800; font-size:1.1rem; display:flex; justify-content:center; align-items:center; border-radius:50%; box-shadow: 0 4px 10px rgba(99,102,241,0.1);" id="fieldCountCircle">1</div>
              <div>
                <div style="font-weight:700; color:var(--gray-800); font-size:1rem;">Fields Selected</div>
                <div style="font-size:0.8rem; color:var(--gray-500);">Ready for data mapping process</div>
              </div>
            </div>
            <button class="import-btn-gradient" onclick="EmployeeImport._goToUpload()" id="btnProceedUpload" style="padding:12px 30px; font-size:0.95rem;">
              Proceed to Upload <i class="fas fa-arrow-right" style="margin-left:8px;"></i>
            </button>
          </div>
          <script>
             setTimeout(()=> {
               document.querySelectorAll('.import-fld-check').forEach(cb => {
                 cb.addEventListener('change', () => {
                   const checked = [...document.querySelectorAll('.import-fld-check:checked')].map(c => c.value);
                   document.getElementById('fieldCountCircle').textContent = checked.length;
                   document.getElementById('btnProceedUpload').style.transform = 'scale(1.05)';
                   setTimeout(()=> document.getElementById('btnProceedUpload').style.transform = 'scale(1)', 150);
                 });
               })
             }, 100);
          </script>
        </div>
      </div>
    `;
    document.getElementById('stepFieldSelect').innerHTML = html;
    this._onFieldToggle(); // init count
  },

  _onFieldToggle: function () {
    const checked = [...document.querySelectorAll('.import-fld-check:checked')].map(c => c.value);
    this._selectedFields = checked;
    const el = document.getElementById('fieldCount');
    if (el) el.textContent = checked.length;
  },

  // ── Quick-select presets ───────────────────────────────────────────────────
  _selectPreset: function (preset) {
    const presets = {
      salary:  ['employeeNumber','basicSalary','ratePerHour','bonus','medical','pension'],
      banking: ['employeeNumber','bankName','bankBranch','bankAccount','bankAccountType'],
      new:     ['employeeNumber','firstName','lastName','email','idNumber','position','department','basicSalary','startDate'],
    };
    const keys = presets[preset] || [];
    document.querySelectorAll('.import-fld-check').forEach(cb => {
      if (cb.disabled) return; // mandatory stays
      cb.checked = keys.includes(cb.value);
    });
    this._onFieldToggle();
  },

  _selectAll: function () {
    document.querySelectorAll('.import-fld-check').forEach(cb => { cb.checked = true; });
    this._onFieldToggle();
  },

  // ── STEP 2: Upload / Paste ────────────────────────────────────────────────
  _goToUpload: function () {
    if (this._selectedFields.length < 1) {
      Toast.show('Select at least one field to continue', 'warning'); return;
    }
    this._setStep(1);
    document.getElementById('stepFieldSelect').style.display = 'none';
    document.getElementById('stepUpload').style.display      = 'block';

    // Build field labels for template hint
    const selLabels = this._selectedFields
      .map(k => this._allFields.find(f => f.key === k)?.label || k)
      .join(', ');

    document.getElementById('stepUpload').innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-body" style="padding:14px 20px;background:var(--primary-soft);border-radius:12px;">
          <p style="margin:0;font-size:0.84rem;color:var(--primary-dark);">
            <i class="fas fa-columns"></i>
            <strong>Fields you'll be importing:</strong> ${selLabels}
          </p>
        </div>
      </div>

      <!-- Tab toggle -->
      <div style="display:flex;gap:0;margin-bottom:20px;border:1px solid var(--gray-200);border-radius:10px;overflow:hidden;width:fit-content;">
        <button id="importTabFile" onclick="EmployeeImport.switchTab('file')"
          style="padding:10px 24px;border:none;background:var(--primary);color:#fff;font-weight:600;cursor:pointer;font-size:0.88rem;">
          <i class="fas fa-upload"></i> Upload File
        </button>
        <button id="importTabPaste" onclick="EmployeeImport.switchTab('paste')"
          style="padding:10px 24px;border:none;background:#fff;color:var(--gray-600);font-weight:600;cursor:pointer;font-size:0.88rem;border-left:1px solid var(--gray-200);">
          <i class="fas fa-paste"></i> Paste from Spreadsheet
        </button>
      </div>

      <!-- File panel -->
      <div id="importPanelFile">
        <div class="card import-glass-card" style="border:none;">
          <div class="card-body" style="padding:0;">
            <div id="dropZone" onclick="document.getElementById('csvFile').click()"
              style="border:2px dashed var(--gray-300);border-radius:12px;padding:56px 40px;
                     text-align:center;cursor:pointer;transition:all 0.2s;background:var(--gray-50);margin:24px;"
              ondragover="EmployeeImport.onDragOver(event)"
              ondragleave="EmployeeImport.onDragLeave(event)"
              ondrop="EmployeeImport.onDrop(event)">
              <div style="font-size:3rem;color:var(--primary);margin-bottom:16px;"><i class="fas fa-cloud-upload-alt"></i></div>
              <h3 style="margin:0 0 8px;color:var(--gray-800);">Drop your file here, or click to browse</h3>
              <p style="color:var(--gray-500);margin:0 0 18px;font-size:0.88rem;">CSV, TXT, TSV — max 5 MB</p>
              <span style="background:var(--primary);color:#fff;padding:10px 28px;border-radius:8px;font-weight:600;">
                <i class="fas fa-folder-open"></i> Choose File
              </span>
            </div>
            <input type="file" id="csvFile" accept=".csv,.txt,.tsv" style="display:none;"
              onchange="EmployeeImport.handleFile(this)">
          </div>
        </div>
      </div>

      <!-- Paste panel -->
      <div id="importPanelPaste" style="display:none;">
        <div class="card import-glass-card" style="border:none;">
          <div class="card-body">
            <p style="color:var(--gray-600);margin-bottom:12px;font-size:0.88rem;">
              <i class="fas fa-info-circle" style="color:var(--primary);"></i>
              Select your data in Excel / Google Sheets (include the header row), copy with <strong>Ctrl+C</strong>,
              then paste below with <strong>Ctrl+V</strong>.
            </p>
            <textarea id="pasteArea" rows="10" style="width:100%;font-family:monospace;font-size:0.82rem;
              border:2px dashed var(--gray-300);border-radius:8px;padding:14px;resize:vertical;
              box-sizing:border-box;background:var(--gray-50);outline:none;"
              placeholder="Paste your spreadsheet data here..."
              onfocus="this.style.borderColor='var(--primary)';this.style.background='#fff';"
              onblur="this.style.borderColor='var(--gray-300)';this.style.background='var(--gray-50)';"></textarea>
            <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
              <button class="btn btn-outline btn-sm" onclick="EmployeeImport._backToFields()">
                <i class="fas fa-arrow-left"></i> Back
              </button>
              <button class="btn btn-primary" onclick="EmployeeImport.parsePastedData()">
                <i class="fas fa-table"></i> Process Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top:12px;">
        <button class="btn btn-outline btn-sm" onclick="EmployeeImport._backToFields()">
          <i class="fas fa-arrow-left"></i> Back to Field Selection
        </button>
      </div>
    `;
  },

  switchTab: function (tab) {
    const isFile = tab === 'file';
    document.getElementById('importPanelFile').style.display  = isFile ? 'block' : 'none';
    document.getElementById('importPanelPaste').style.display = isFile ? 'none'  : 'block';
    const styleActive = 'background:var(--primary);color:#fff;';
    const styleInactive = 'background:#fff;color:var(--gray-600);';
    document.getElementById('importTabFile').style.cssText  += isFile ? styleActive : styleInactive;
    document.getElementById('importTabPaste').style.cssText += isFile ? styleInactive : styleActive;
  },

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  onDragOver:  function (e) { e.preventDefault(); const dz=document.getElementById('dropZone'); dz.style.borderColor='var(--primary)'; dz.style.background='var(--primary-soft)'; },
  onDragLeave: function ()  { const dz=document.getElementById('dropZone'); dz.style.borderColor='var(--gray-300)'; dz.style.background='var(--gray-50)'; },
  onDrop: function (e) { e.preventDefault(); this.onDragLeave(); const f=e.dataTransfer.files[0]; if(f) this._readFile(f); },

  handleFile: function (input) {
    if (!input.files || !input.files[0]) return;
    this._readFile(input.files[0]);
  },

  _readFile: function (file) {
    if (file.size > 5*1024*1024) { Toast.show('File too large (max 5 MB)', 'warning'); return; }
    const dz = document.getElementById('dropZone');
    if (dz) dz.innerHTML = `<div style="color:var(--primary);font-size:2rem;"><i class="fas fa-spinner fa-spin"></i></div><p style="margin-top:12px;">Reading <strong>${file.name}</strong>...</p>`;
    const reader = new FileReader();
    reader.onload = e => this.parseCSV(e.target.result, 'auto');
    reader.readAsText(file);
  },

  parsePastedData: function () {
    const raw = document.getElementById('pasteArea')?.value?.trim();
    if (!raw) { Toast.show('Paste some data first', 'warning'); return; }
    this.parseCSV(raw, 'tsv');
  },

  // ── Parsing ───────────────────────────────────────────────────────────────
  parseCSV: function (text, mode) {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { Toast.show('Need a header row + at least one data row', 'warning'); return; }

    const delim = (mode === 'tsv' || lines[0].includes('\t')) ? '\t' : ',';
    const split  = line => {
      if (delim === '\t') return line.split('\t').map(v => v.trim());
      const res=[]; let cur='', inQ=false;
      for (let i=0; i<line.length; i++) {
        const ch=line[i];
        if (ch==='"') inQ=!inQ;
        else if (ch===',' && !inQ) { res.push(cur.trim()); cur=''; }
        else cur+=ch;
      }
      res.push(cur.trim()); return res;
    };

    const headers  = split(lines[0]).map(h => h.replace(/^"|"$/g,'').trim());
    const dataRows = lines.slice(1)
      .map(l => split(l).map(v => v.replace(/^"|"$/g,'').trim()))
      .filter(r => r.some(v => v));

    if (!headers.length || !dataRows.length) { Toast.show('Could not parse data', 'warning'); return; }

    this._csvData = { headers, rows: dataRows };
    this._renderMapping();
  },

  // ── STEP 3: Column mapping (only selected fields) ─────────────────────────
  _renderMapping: function () {
    this._setStep(2);
    document.getElementById('stepUpload').style.display  = 'none';
    document.getElementById('stepMapping').style.display = 'block';

    const activeFields = this._allFields.filter(f => this._selectedFields.includes(f.key));

    // Auto-guess: find best header for each field
    const autoMatch = (f) => {
      const targets = [f.key, f.label].map(s => s.toLowerCase().replace(/[\s_\-\/()]/g,''));
      for (const h of this._csvData.headers) {
        const hn = h.toLowerCase().replace(/[\s_\-\/()]/g,'');
        if (targets.some(t => hn === t || hn.includes(t) || t.includes(hn))) return h;
      }
      return '';
    };

    document.getElementById('stepMapping').innerHTML = `
      <div class="card import-glass-card" style="border:none;">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h4 class="card-title" style="margin:0;">Step 3 — Map Your Columns</h4>
            <p style="color:var(--gray-500);font-size:0.82rem;margin:4px 0 0;">
              <i class="fas fa-check-circle" style="color:var(--success);"></i>
              Detected <strong>${this._csvData.headers.length} columns</strong> ·
              <strong>${this._csvData.rows.length} rows</strong>
            </p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="EmployeeImport._backToFields()">
            <i class="fas fa-arrow-left"></i> Start Over
          </button>
        </div>
        <div class="card-body">
          <div class="grid-2" style="gap:16px;">
            ${activeFields.map(f => {
              const auto = autoMatch(f);
              const isMandatory = f.mandatory;
              return `
                <div class="form-group" style="margin:0;">
                  <label style="font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:6px;">
                    ${f.label}
                    ${isMandatory ? '<span class="import-badge-required">Required</span>' : ''}
                    ${f.newOnly   ? '<span class="import-badge-new">New employees only</span>' : ''}
                  </label>
                  <select class="form-control mapping-sel" data-field="${f.key}" style="font-size:0.85rem;">
                    <option value="">— Skip this field —</option>
                    ${this._csvData.headers.map(h =>
                      `<option value="${h}" ${h===auto?'selected':''}>${h}</option>`
                    ).join('')}
                  </select>
                </div>`;
            }).join('')}
          </div>

          <!-- First row sample -->
          <div style="margin-top:18px;background:var(--gray-50);border-radius:8px;padding:12px 16px;font-size:0.78rem;color:var(--gray-500);">
            <strong>Sample — first data row:</strong>&nbsp;
            ${this._csvData.rows[0].map((v,i) =>
              `<span style="margin-right:10px;"><em>${this._csvData.headers[i]}:</em> <strong style="color:var(--gray-700);">${v||'—'}</strong></span>`
            ).join('')}
          </div>

          <div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn btn-outline" onclick="EmployeeImport._backToUpload()">
              <i class="fas fa-arrow-left"></i> Back
            </button>
            <button class="btn btn-primary btn-lg" onclick="EmployeeImport._previewImport()">
              <i class="fas fa-eye"></i> Preview Import
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ── STEP 4: Preview ────────────────────────────────────────────────────────
  _previewImport: function () {
    // Build mapping from selects
    const selects = document.querySelectorAll('.mapping-sel');
    const mapping = {};
    selects.forEach(s => { if (s.value) mapping[s.getAttribute('data-field')] = s.value; });

    // Validate mandatory field is mapped
    if (!mapping['employeeNumber']) {
      Toast.show('You must map the Employee Number column', 'warning'); return;
    }

    this._mappings = mapping;
    const rows = this._buildRows();
    const existing = window.DB.employees || [];
    const empMap   = {};
    existing.forEach(e => { if (e.employeeNumber) empMap[e.employeeNumber] = e; });

    const enriched = rows.map(row => {
      const empNo = row.employeeNumber?.trim();
      const match = empNo ? empMap[empNo] : null;
      const issues = [];
      if (!empNo) issues.push('Missing employee number');
      return { ...row, _match: match, _isUpdate: !!match, _issues: issues };
    });

    const willUpdate = enriched.filter(r => r._isUpdate).length;
    const willCreate = enriched.filter(r => !r._isUpdate && !r._issues.length).length;
    const withIssues = enriched.filter(r => r._issues.length).length;

    const mappedFields = this._allFields.filter(f => mapping[f.key]);
    const previewCount = Math.min(15, enriched.length);

    this._setStep(3);
    document.getElementById('stepMapping').style.display = 'none';
    document.getElementById('stepPreview').style.display = 'block';

    document.getElementById('stepPreview').innerHTML = `
      <!-- Summary -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px;">
        <div class="card" style="padding:14px 18px;border-left:4px solid var(--primary);">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);">Total Rows</div>
          <div style="font-size:1.6rem;font-weight:800;">${enriched.length}</div>
        </div>
        <div class="card" style="padding:14px 18px;border-left:4px solid var(--info);">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);">Will Update</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--info);">${willUpdate}</div>
        </div>
        <div class="card" style="padding:14px 18px;border-left:4px solid var(--success);">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);">Will Create</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--success);">${willCreate}</div>
        </div>
        ${withIssues ? `
        <div class="card" style="padding:14px 18px;border-left:4px solid var(--danger);">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);">Issues</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--danger);">${withIssues}</div>
        </div>` : ''}
      </div>

      <!-- Fields being updated banner -->
      <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:10px;
                  padding:12px 18px;margin-bottom:16px;font-size:0.83rem;color:var(--primary-dark);">
        <i class="fas fa-pen" style="margin-right:6px;"></i>
        <strong>Fields being imported:</strong>
        ${mappedFields.map(f => `<span style="background:var(--primary-soft);border-radius:4px;padding:1px 8px;margin-left:4px;">${f.label}</span>`).join('')}
      </div>

      <!-- Table -->
      <div class="card import-glass-card" style="border:none;">
        <div class="card-header">
          <h4 class="card-title" style="margin:0;">
            Preview <span style="font-size:0.82rem;font-weight:400;color:var(--gray-500);">
              (showing ${previewCount} of ${enriched.length})
            </span>
          </h4>
        </div>
        <div class="table-responsive" style="overflow-x:auto;">
          <table class="table" style="font-size:0.8rem;">
            <thead>
              <tr>
                <th>Status</th>
                ${mappedFields.map(f => `<th>${f.label}</th>`).join('')}
                <th>Matches</th>
              </tr>
            </thead>
            <tbody>
              ${enriched.slice(0, previewCount).map(row => {
                const statusColor = row._issues.length ? 'var(--danger)' : row._isUpdate ? 'var(--info)' : 'var(--success)';
                const statusIcon  = row._issues.length ? 'fa-exclamation-circle' : row._isUpdate ? 'fa-sync-alt' : 'fa-plus-circle';
                const statusLabel = row._issues.length ? row._issues[0] : row._isUpdate ? 'Update' : 'New';
                const matchName   = row._match ? `${row._match.firstName} ${row._match.lastName}` : '—';
                return `
                  <tr style="background:${row._issues.length ? 'rgba(220,38,38,0.03)' : ''};">
                    <td style="white-space:nowrap;">
                      <span style="color:${statusColor};font-size:0.75rem;font-weight:700;">
                        <i class="fas ${statusIcon}"></i> ${statusLabel}
                      </span>
                    </td>
                    ${mappedFields.map(f =>
                      `<td>${row[f.key] || '<span style="color:var(--gray-300);">—</span>'}</td>`
                    ).join('')}
                    <td style="color:var(--gray-500);font-size:0.78rem;">
                      ${row._isUpdate
                        ? `<i class="fas fa-user" style="color:var(--info);"></i> ${matchName}`
                        : '<span style="color:var(--gray-400);">New employee</span>'}
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${enriched.length > previewCount
          ? `<div style="text-align:center;padding:12px;color:var(--gray-400);font-size:0.82rem;">
               ... and ${enriched.length - previewCount} more rows
             </div>` : ''}
        <div class="card-body" style="padding-top:0;display:flex;gap:10px;justify-content:flex-end;align-items:center;">
          <button class="btn btn-outline" onclick="EmployeeImport._backToMapping()">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <button class="btn btn-primary btn-lg" onclick="EmployeeImport._finalize()"
            ${withIssues === enriched.length ? 'disabled' : ''}>
            <i class="fas fa-check"></i>
            ${willUpdate > 0 && willCreate > 0
              ? `Update ${willUpdate} & Create ${willCreate}`
              : willUpdate > 0
                ? `Update ${willUpdate} Employee${willUpdate>1?'s':''}`
                : `Import ${willCreate} Employee${willCreate>1?'s':''}`}
          </button>
        </div>
      </div>
    `;
    document.getElementById('stepPreview').scrollIntoView({ behavior: 'smooth' });
  },

  // ── STEP 5: Finalize ───────────────────────────────────────────────────────
  _finalize: function () {
    const rows     = this._buildRows();
    const existing = window.DB.employees || [];
    const empMap   = {};
    existing.forEach((e, i) => { if (e.employeeNumber) empMap[e.employeeNumber] = i; });

    let updated = 0, created = 0, skipped = 0;
    const mappedKeys = Object.keys(this._mappings);

    rows.forEach(row => {
      const empNo = row.employeeNumber?.trim();
      if (!empNo) { skipped++; return; }

      if (empMap[empNo] !== undefined) {
        // Update existing — only write the mapped fields
        const emp = window.DB.employees[empMap[empNo]];
        mappedKeys.forEach(k => {
          if (k === 'employeeNumber') return; // never overwrite the key itself
          if (row[k] !== undefined && row[k] !== '') {
            // Type-cast salary/rate fields
            if (['basicSalary','ratePerHour','bonus','medical','pension'].includes(k)) {
              emp[k] = parseFloat(row[k]) || 0;
            } else {
              emp[k] = row[k];
            }
          }
        });
        updated++;
      } else {
        // Create new
        const newEmp = {
          id: 'imp_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
          status: 'Active',
          createdAt: new Date().toISOString(),
          ...row,
        };
        if (row.basicSalary) newEmp.basicSalary = parseFloat(row.basicSalary) || 0;
        window.DB.employees.push(newEmp);
        created++;
      }
    });

    window.DB.save();

    this._setStep(4);
    document.getElementById('stepPreview').style.display = 'none';
    document.getElementById('stepDone').style.display    = 'block';
    document.getElementById('stepDone').innerHTML = `
      <div class="card" style="border-left:4px solid var(--success);">
        <div class="card-body" style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
          <div style="font-size:3rem;color:var(--success);"><i class="fas fa-check-circle"></i></div>
          <div style="flex:1;">
            <h3 style="margin:0 0 6px;color:var(--success);">Import Complete</h3>
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;">
              ${updated ? `<span style="color:var(--info);font-weight:600;"><i class="fas fa-sync-alt"></i> ${updated} updated</span>` : ''}
              ${created ? `<span style="color:var(--success);font-weight:600;"><i class="fas fa-plus-circle"></i> ${created} created</span>` : ''}
              ${skipped ? `<span style="color:var(--warning);font-weight:600;"><i class="fas fa-exclamation-circle"></i> ${skipped} skipped (no emp. no.)</span>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-outline" onclick="EmployeeImport.render(document.getElementById('content'))">
              <i class="fas fa-redo"></i> Import More
            </button>
            <button class="btn btn-primary" onclick="loadPage('employees')">
              <i class="fas fa-users"></i> View Employees
            </button>
          </div>
        </div>
      </div>
    `;
    Toast.show(`Done — ${updated} updated, ${created} created`, 'success');
  },

  _buildRows: function () {
    return this._csvData.rows.map(row => {
      const obj = {};
      Object.entries(this._mappings).forEach(([field, col]) => {
        const idx = this._csvData.headers.indexOf(col);
        obj[field] = idx >= 0 ? (row[idx] || '').trim() : '';
      });
      return obj;
    }).filter(r => Object.values(r).some(v => v));
  },

  // ── Navigation helpers ────────────────────────────────────────────────────
  _setStep: function (n) {
    document.querySelectorAll('.import-step').forEach((el, i) => {
      el.classList.toggle('active',    i === n);
      el.classList.toggle('completed', i < n);
    });
  },
  _backToFields:  function () { this.render(document.getElementById('content')); },
  _backToUpload:  function () {
    document.getElementById('stepMapping').style.display = 'none';
    document.getElementById('stepUpload').style.display  = 'block';
    this._setStep(1);
  },
  _backToMapping: function () {
    document.getElementById('stepPreview').style.display = 'none';
    document.getElementById('stepMapping').style.display = 'block';
    this._setStep(2);
  },

  // ── Download template for selected fields ─────────────────────────────────
  downloadTemplate: function () {
    const fields = this._selectedFields.length
      ? this._allFields.filter(f => this._selectedFields.includes(f.key))
      : this._allFields;
    const headers = fields.map(f => f.label);
    const example = fields.map(f => ({
      employeeNumber:'EMP001', firstName:'John', lastName:'Smith',
      email:'john@company.co.za', idNumber:'9001015009087',
      position:'Developer', department:'Technology', basicSalary:'45000',
      startDate:'2026-01-15', phone:'0821234567', gender:'Male', race:'African',
      ratePerHour:'', bonus:'', medical:'2500', pension:'1500', dateOfBirth:'1990-01-01',
      location:'Johannesburg', costCenter:'CC001', employmentType:'Permanent',
      bankName:'FNB', bankBranch:'250655', bankAccount:'62012345678', bankAccountType:'Cheque',
    }[f.key] || ''));
    const csv = [headers, example].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href:url, download:'nexa_import_template.csv' });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    Toast.show('Template downloaded', 'success');
  }
};

window.EmployeeImport = EmployeeImport;
window.renderImport   = c => EmployeeImport.render(c);
