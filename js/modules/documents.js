// ─── Documents Module ─────────────────────────────────────────────────────────
const Documents = {

  render: function (container) {
    const docs = window.DB.documents || [];
    const employees = window.DB.employees || [];
    const companies = window.DB.companies || [];

    // Filters
    const search = window._docSearch || '';
    const catFilter = window._docCategory || '';
    const empFilter = window._docEmployee || '';

    let filtered = docs;
    if (catFilter) filtered = filtered.filter(d => d.category === catFilter);
    if (empFilter) filtered = filtered.filter(d => d.employeeId == empFilter);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q)
      );
    }

    const categories = [...new Set(docs.map(d => d.category).filter(Boolean))];
    const totalSize = docs.reduce((s, d) => s + (d.size || 0), 0);

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.25rem;margin:0;">Documents</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            ${docs.length} documents &bull; ${this._formatSize(totalSize)}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Documents.showUploadModal()">
          <i class="fas fa-upload"></i> Upload Document
        </button>
      </div>

      <!-- KPIs -->
      <div class="grid-4" style="gap:12px;margin-bottom:16px;">
        ${(() => {
        const expiringDocs = docs.filter(d => {
          const exp = d.expiryDate || d.endDate;
          if (!exp) return false;
          const diff = Math.ceil((new Date(exp) - new Date()) / 86400000);
          return diff > 0 && diff <= 90;
        });
        return [
          ['Total Documents', docs.length, 'fas fa-folder-open', 'primary'],
          ['Contracts', docs.filter(d => d.category === 'Contract').length, 'fas fa-file-signature', 'info'],
          ['Payslips', docs.filter(d => d.category === 'Payslip').length, 'fas fa-file-invoice-dollar', 'success'],
          ['Expiring Soon', expiringDocs.length, 'fas fa-exclamation-triangle', expiringDocs.length > 0 ? 'danger' : 'warning'],
        ].map(([label, val, icon, color]) => `
            <div class="card" style="padding:12px;border-left:3px solid var(--${color});">
              <div style="font-size:0.68rem;text-transform:uppercase;color:var(--gray-400);margin-bottom:4px;">${label}</div>
              <div style="font-size:1.5rem;font-weight:800;color:var(--${color});">${val}</div>
            </div>`).join('');
      })()}
      </div>

      <!-- Filters -->
      <div class="card" style="padding:12px 16px;margin-bottom:16px;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <input type="text" class="search-input" style="flex:1;min-width:200px;"
            placeholder="Search documents..."
            value="${search}"
            oninput="window._docSearch=this.value;Documents.render(document.getElementById('content'))">
          <select class="form-control" style="width:180px;"
            onchange="window._docCategory=this.value;Documents.render(document.getElementById('content'))">
            <option value="">All Categories</option>
            ${['Contract', 'Payslip', 'Policy', 'ID Document', 'Certificate', 'Medical', 'Other']
        .map(c => `<option value="${c}" ${catFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <select class="form-control" style="width:200px;"
            onchange="window._docEmployee=this.value;Documents.render(document.getElementById('content'))">
            <option value="">All Employees</option>
            ${employees.map(e => `<option value="${e.id}" ${empFilter == e.id ? 'selected' : ''}>
              ${e.firstName} ${e.lastName}
            </option>`).join('')}
          </select>
          <button class="btn btn-outline btn-sm" onclick="
            window._docSearch='';window._docCategory='';window._docEmployee='';
            Documents.render(document.getElementById('content'))">
            <i class="fas fa-times"></i> Clear
          </button>
        </div>
      </div>

      ${!filtered.length ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-folder-open"></i></div>
          <div class="empty-state-title">${docs.length ? 'No documents match your filter' : 'No Documents Yet'}</div>
          <div class="empty-state-desc">Upload documents like contracts, policies, IDs and more.</div>
          <button class="btn btn-primary btn-sm" style="margin-top:16px" onclick="Documents.showUploadModal()">
            <i class="fas fa-upload"></i> Upload Document
          </button>
        </div>` : `
      <!-- Document grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
        ${filtered.map(doc => this.renderCard(doc, employees)).join('')}
      </div>`}`;
  },

  renderCard: function (doc, employees) {
    const emp = employees.find(e => e.id == doc.employeeId);
    const icon = this._categoryIcon(doc.category);
    const color = this._categoryColor(doc.category);
    const date = doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—';
    // Expiry indicator
    const expDate = doc.expiryDate || doc.endDate;
    let expiryBadge = '';
    if (expDate) {
      const daysLeft = Math.ceil((new Date(expDate) - new Date()) / 86400000);
      if (daysLeft <= 0) expiryBadge = '<span class="badge badge-danger" style="font-size:0.58rem;">EXPIRED</span>';
      else if (daysLeft <= 30) expiryBadge = '<span class="badge badge-danger" style="font-size:0.58rem;">' + daysLeft + 'd left</span>';
      else if (daysLeft <= 60) expiryBadge = '<span class="badge badge-warning" style="font-size:0.58rem;">' + daysLeft + 'd left</span>';
      else if (daysLeft <= 90) expiryBadge = '<span class="badge badge-info" style="font-size:0.58rem;">' + daysLeft + 'd left</span>';
    }

    return `
      <div class="card" style="padding:0;overflow:hidden;">
        <div style="padding:14px 16px;border-bottom:1px solid var(--gray-100);
                    display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:8px;flex-shrink:0;
                      background:var(--${color}-soft,var(--primary-soft));
                      color:var(--${color},var(--primary));
                      display:flex;align-items:center;justify-content:center;font-size:1rem;">
            <i class="${icon}"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.85rem;white-space:nowrap;overflow:hidden;
                        text-overflow:ellipsis;" title="${doc.name}">${doc.name}</div>
            <div style="font-size:0.7rem;color:var(--gray-500);">
              <span class="badge badge-${color}" style="font-size:0.6rem;padding:1px 5px;">${doc.category || 'Other'}</span>
              &bull; ${this._formatSize(doc.size || 0)}
            </div>
          </div>
        </div>
        <div style="padding:10px 16px;">
          ${emp ? `
            <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--gray-600);margin-bottom:6px;">
              <i class="fas fa-user" style="color:var(--primary);"></i>
              ${emp.firstName} ${emp.lastName}
            </div>` : doc.companyWide ? `
            <div style="font-size:0.75rem;color:var(--gray-600);margin-bottom:6px;">
              <i class="fas fa-building"></i> Company-wide
            </div>` : ''}
          ${doc.description ? `
            <div style="font-size:0.72rem;color:var(--gray-500);margin-bottom:6px;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${doc.description}
            </div>` : ''}
          <div style="font-size:0.68rem;color:var(--gray-400);">
            Uploaded: ${date} ${expiryBadge}
          </div>
        </div>
        <div style="padding:8px 12px;border-top:1px solid var(--gray-100);
                    display:flex;gap:6px;justify-content:flex-end;">
          <button class="btn btn-xs btn-outline" onclick="Documents.viewDocument('${doc.id}')" title="View">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-xs btn-outline" onclick="Documents.downloadDocument('${doc.id}')" title="Download">
            <i class="fas fa-download"></i>
          </button>
          <button class="btn btn-xs btn-outline" style="color:var(--danger);border-color:var(--danger);"
            onclick="Documents.deleteDocument('${doc.id}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`;
  },

  showUploadModal: function () {
    const employees = window.DB.employees || [];
    const html = `
      <div class="card" style="width:100%;max-width:560px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title">Upload Document</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('uploadDocModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Document Name *</label>
            <input id="doc_name" class="form-control" placeholder="e.g. Employment Contract - John Doe">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="doc_category" class="form-control">
                <option>Contract</option>
                <option>Payslip</option>
                <option>Policy</option>
                <option>ID Document</option>
                <option>Certificate</option>
                <option>Medical</option>
                <option>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Linked Employee</label>
              <select id="doc_employee" class="form-control">
                <option value="">— Company-wide —</option>
                ${employees.map(e => `<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <input id="doc_description" class="form-control" placeholder="Optional description">
          </div>
          <div class="form-group">
            <label class="form-label">Expiry Date <span style="font-size:0.72rem;color:var(--gray-400);">(contracts, IDs, work permits)</span></label>
            <input type="date" id="doc_expiryDate" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label">File *</label>
            <div id="dropZone"
              style="border:2px dashed var(--gray-300);border-radius:8px;padding:32px;text-align:center;
                     cursor:pointer;transition:border-color 0.2s;"
              onclick="document.getElementById('doc_file').click()"
              ondragover="event.preventDefault();this.style.borderColor='var(--primary)'"
              ondragleave="this.style.borderColor='var(--gray-300)'"
              ondrop="Documents.handleFileDrop(event)">
              <i class="fas fa-cloud-upload-alt" style="font-size:1.8rem;color:var(--gray-400);display:block;margin-bottom:8px;"></i>
              <div style="font-size:0.85rem;color:var(--gray-500);">
                Click to select or drag & drop a file
              </div>
              <div style="font-size:0.72rem;color:var(--gray-400);margin-top:4px;">
                PDF, Word, Excel, Images up to 10MB
              </div>
              <div id="selectedFileName" style="margin-top:8px;font-size:0.8rem;color:var(--primary);font-weight:600;"></div>
            </div>
            <input type="file" id="doc_file" style="display:none;"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
              onchange="Documents.handleFileSelect(this)">
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="Documents.uploadDocument()">
            <i class="fas fa-upload"></i> Upload Document
          </button>
        </div>
      </div>`;
    window.showModal('uploadDocModal', html);
    window._pendingDocFile = null;
  },

  handleFileSelect: function (input) {
    if (input.files && input.files[0]) {
      window._pendingDocFile = input.files[0];
      const nameEl = document.getElementById('selectedFileName');
      if (nameEl) nameEl.textContent = `✓ ${input.files[0].name}`;

      // Auto-fill name if empty
      const nameInput = document.getElementById('doc_name');
      if (nameInput && !nameInput.value.trim()) {
        nameInput.value = input.files[0].name.replace(/\.[^.]+$/, '');
      }
    }
  },

  handleFileDrop: function (event) {
    event.preventDefault();
    const dz = document.getElementById('dropZone');
    if (dz) dz.style.borderColor = 'var(--primary)';
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      window._pendingDocFile = file;
      const nameEl = document.getElementById('selectedFileName');
      if (nameEl) nameEl.textContent = `✓ ${file.name}`;
      const nameInput = document.getElementById('doc_name');
      if (nameInput && !nameInput.value.trim()) nameInput.value = file.name.replace(/\.[^.]+$/, '');
    }
  },

  uploadDocument: function () {
    const name = document.getElementById('doc_name')?.value?.trim();
    const category = document.getElementById('doc_category')?.value;
    const empId = document.getElementById('doc_employee')?.value;
    const desc = document.getElementById('doc_description')?.value?.trim();
    const expiry = document.getElementById('doc_expiryDate')?.value || null;
    const file = window._pendingDocFile;

    if (!name) { window.showAlert('Required', 'Please enter a document name.'); return; }

    const docId = 'DOC_' + Date.now();

    const saveDoc = (dataUrl) => {
      const doc = {
        id: docId,
        name,
        category: category || 'Other',
        employeeId: empId ? parseInt(empId) : null,
        companyWide: !empId,
        description: desc,
        size: file ? file.size : 0,
        mimeType: file ? file.type : 'application/octet-stream',
        fileName: file ? file.name : name,
        dataUrl: dataUrl || null,
        uploadedAt: new Date().toISOString(),
        uploadedBy: window.currentUser?.name || 'Admin',
        expiryDate: expiry
      };

      window.DB.documents = window.DB.documents || [];
      window.DB.documents.push(doc);
      window.DB.save();
      window.Toast.show(`"${name}" uploaded successfully`, 'success');
      window.closeModal('uploadDocModal');
      delete window._pendingDocFile;
      this.render(document.getElementById('content'));
    };

    if (file) {
      // Read file as base64 for storage (PDF/image/text under 5MB)
      if (file.size > 5 * 1024 * 1024) {
        window.showAlert('File Too Large', 'Maximum file size is 5MB for browser storage.');
        return;
      }
      const reader = new FileReader();
      reader.onload = e => saveDoc(e.target.result);
      reader.onerror = () => saveDoc(null);
      reader.readAsDataURL(file);
    } else {
      // No file selected — save metadata only
      saveDoc(null);
    }
  },

  viewDocument: function (docId) {
    const doc = (window.DB.documents || []).find(d => d.id === docId);
    if (!doc) return;

    if (doc.dataUrl) {
      if (doc.mimeType?.includes('html') || doc.dataUrl.startsWith('data:text/html')) {
        // Show HTML contract/doc in an in-app fullscreen modal (avoids popup blockers)
        const modalHtml = `
          <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;flex-direction:column;">
            <div style="background:#1e293b;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
              <span style="color:white;font-weight:600;font-size:0.9rem;">${doc.name}</span>
              <div style="display:flex;gap:8px;">
                <a href="${doc.dataUrl}" download="${doc.fileName || doc.name}"
                  style="background:#4f46e5;color:white;padding:6px 12px;border-radius:6px;font-size:0.8rem;text-decoration:none;">
                  <i class="fas fa-download"></i> Download
                </a>
                <button onclick="document.getElementById('docViewerOverlay').remove()"
                  style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:0.8rem;">
                  <i class="fas fa-times"></i> Close
                </button>
              </div>
            </div>
            <iframe id="docViewerFrame" src="${doc.dataUrl}"
              style="flex:1;border:none;background:white;"></iframe>
          </div>`;
        const overlay = document.createElement('div');
        overlay.id = 'docViewerOverlay';
        overlay.innerHTML = modalHtml;
        document.body.appendChild(overlay);
      } else if (doc.mimeType?.includes('image')) {
        const overlay = document.createElement('div');
        overlay.id = 'docViewerOverlay';
        overlay.innerHTML = `
          <div style="position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <button onclick="document.getElementById('docViewerOverlay').remove()"
              style="position:absolute;top:16px;right:16px;background:#ef4444;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;">
              <i class="fas fa-times"></i> Close
            </button>
            <img src="${doc.dataUrl}" style="max-width:95vw;max-height:90vh;object-fit:contain;border-radius:8px;">
          </div>`;
        document.body.appendChild(overlay);
      } else if (doc.mimeType?.includes('pdf')) {
        const overlay = document.createElement('div');
        overlay.id = 'docViewerOverlay';
        overlay.innerHTML = `
          <div style="position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;flex-direction:column;">
            <div style="background:#1e293b;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
              <span style="color:white;font-weight:600;font-size:0.9rem;">${doc.name}</span>
              <button onclick="document.getElementById('docViewerOverlay').remove()"
                style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:0.8rem;">
                <i class="fas fa-times"></i> Close
              </button>
            </div>
            <iframe src="${doc.dataUrl}" style="flex:1;border:none;"></iframe>
          </div>`;
        document.body.appendChild(overlay);
      } else {
        // Generic download
        const a = document.createElement('a');
        a.href = doc.dataUrl; a.download = doc.fileName || doc.name; a.click();
      }
    } else {
      // No file data — smart navigation based on category
      if (doc.sourceType === 'payslip' || doc.category === 'Payslip') {
        window._payslipEmpFilter = doc.employeeId;
        window.loadPage('payslips');
        window.Toast.show('Showing payslips for this employee', 'info');
      } else if (doc.sourceType === 'contract' || doc.category === 'Contract') {
        if (doc.employeeId) window.currentEmployeeId = doc.employeeId;
        window.loadPage('contracts');
        window.Toast.show('Navigated to contracts', 'info');
      } else {
        window.showAlert('Document Info', `
          <strong>${doc.name}</strong><br>
          Category: ${doc.category}<br>
          Uploaded: ${doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '—'}<br>
          <em>No file attached to this record.</em>
        `);
      }
    }
  },

  downloadDocument: function (docId) {
    const doc = (window.DB.documents || []).find(d => d.id === docId);
    if (!doc || !doc.dataUrl) {
      window.Toast.show('No file data available for download', 'warning'); return;
    }
    const a = document.createElement('a');
    a.href = doc.dataUrl;
    a.download = doc.fileName || doc.name;
    a.click();
  },

  deleteDocument: function (docId) {
    const doc = (window.DB.documents || []).find(d => d.id === docId);
    if (!doc) return;
    window.showConfirmation('Delete Document',
      `Delete "<strong>${doc.name}</strong>"? This cannot be undone.`,
      () => {
        window.DB.documents = (window.DB.documents || []).filter(d => d.id !== docId);
        window.DB.save();
        window.Toast.show('Document deleted', 'success');
        this.render(document.getElementById('content'));
      }
    );
  },

  // Utility helpers
  _formatSize: function (bytes) {
    if (!bytes || bytes < 1024) return bytes ? bytes + ' B' : '0 B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  _categoryIcon: function (cat) {
    const map = {
      Contract: 'fas fa-file-signature', Payslip: 'fas fa-file-invoice-dollar',
      Policy: 'fas fa-gavel', 'ID Document': 'fas fa-id-card',
      Certificate: 'fas fa-certificate', Medical: 'fas fa-notes-medical',
      Other: 'fas fa-file-alt'
    };
    return map[cat] || 'fas fa-file-alt';
  },

  _categoryColor: function (cat) {
    const map = {
      Contract: 'info', Payslip: 'success', Policy: 'warning',
      'ID Document': 'primary', Certificate: 'teal', Medical: 'danger', Other: 'gray'
    };
    return map[cat] || 'gray';
  }
};

window._docSearch = window._docSearch || '';
window._docCategory = window._docCategory || '';
window._docEmployee = window._docEmployee || '';

window.renderDocuments = function (container) {
  Documents.render(container);
};
window.Documents = Documents;