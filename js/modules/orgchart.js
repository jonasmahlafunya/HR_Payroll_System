// ─────────────────────────────────────────────────────────────────────────────
// Nexa HR & Payroll — js/modules/orgchart.js
// Interactive Organization Chart Module
// ─────────────────────────────────────────────────────────────────────────────

const OrgChart = {
  // Config
  zoomPos: 1,
  panX: 0,
  panY: 0,

  // Cache
  _treeData: null,
  _draggedEmpId: null,

  render: function (container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.3rem;margin:0;">Organization Chart</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">Interactive Visual Hierarchy</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <select id="orgChartCompanySelect" class="form-control form-control-sm" style="width:200px;" onchange="OrgChart.loadTree(this.value)">
            ${this._renderCompanyOptions()}
          </select>
          <button class="btn btn-outline btn-sm" onclick="OrgChart.resetView()" title="Reset View">
            <i class="fas fa-compress-arrows-alt"></i> Reset
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.print()" title="Print / PDF">
            <i class="fas fa-print"></i> Print
          </button>
        </div>
      </div>

      <div class="card" style="position:relative;height:calc(100vh - 200px);min-height:600px;overflow:hidden;background:var(--gray-50);">
        <!-- Controls overlay -->
        <div style="position:absolute;top:16px;right:16px;z-index:10;display:flex;flex-direction:column;gap:6px;
                    background:white;padding:6px;border-radius:8px;box-shadow:var(--shadow-sm);border:1px solid var(--gray-200);">
          <button class="btn btn-outline btn-sm" style="width:32px;height:32px;padding:0;" onclick="OrgChart.zoom(0.1)" title="Zoom In">
            <i class="fas fa-plus"></i>
          </button>
          <div style="text-align:center;font-size:0.7rem;font-weight:600;color:var(--gray-500);" id="zoomLabel">100%</div>
          <button class="btn btn-outline btn-sm" style="width:32px;height:32px;padding:0;" onclick="OrgChart.zoom(-0.1)" title="Zoom Out">
            <i class="fas fa-minus"></i>
          </button>
        </div>

        <div style="position:absolute;top:16px;left:16px;z-index:10;background:white;padding:8px 12px;border-radius:8px;
                    box-shadow:var(--shadow-sm);border:1px solid var(--gray-200);font-size:0.75rem;color:var(--gray-600);">
          <i class="fas fa-info-circle text-primary"></i> <strong>Tip:</strong> Drag staff members onto a department to reassign them.
        </div>

        <!-- Canvas Area -->
        <div id="orgChartCanvas" style="width:100%;height:100%;cursor:grab;position:relative;overflow:hidden;"
             onmousedown="OrgChart.startPan(event)" onmousemove="OrgChart.doPan(event)" onmouseup="OrgChart.stopPan()" onmouseleave="OrgChart.stopPan()">
          <div id="orgChartContainer" style="position:absolute;transform-origin:top center;transition:transform 0.1s ease-out;
                      left:50%;transform:translateX(-50%) scale(1);padding-top:40px;">
            <!-- Tree renders here -->
          </div>
        </div>
      </div>

      <!-- Add CSS for the tree drawing -->
      <style>
        /* Tree Layout CSS */
        .org-tree ul {
          padding-top: 20px; position: relative;
          transition: all 0.5s;
          display: flex; justify-content: center;
        }

        .org-tree li {
          float: left; text-align: center;
          list-style-type: none;
          position: relative;
          padding: 20px 5px 0 5px;
          transition: all 0.5s;
        }

        /* Connecting lines */
        .org-tree li::before, .org-tree li::after {
          content: ''; position: absolute; top: 0; right: 50%;
          border-top: 2px solid var(--gray-300);
          width: 50%; height: 20px;
        }
        .org-tree li::after { right: auto; left: 50%; border-left: 2px solid var(--gray-300); }
        .org-tree li:only-child::after, .org-tree li:only-child::before { display: none; }
        .org-tree li:only-child { padding-top: 0; }
        .org-tree li:first-child::before, .org-tree li:last-child::after { border: 0 none; }
        .org-tree li:last-child::before {
          border-right: 2px solid var(--gray-300);
          border-radius: 0 5px 0 0;
        }
        .org-tree li:first-child::after {
          border-radius: 5px 0 0 0;
        }
        .org-tree ul ul::before {
          content: ''; position: absolute; top: 0; left: 50%;
          border-left: 2px solid var(--gray-300);
          width: 0; height: 20px;
        }

        /* Node Styling */
        .org-node {
          background: white; border: 1px solid var(--gray-200);
          border-radius: 8px; box-shadow: var(--shadow-sm);
          padding: 12px 16px; margin: 0 auto;
          display: inline-block; min-width: 140px;
          position: relative; z-index: 2; transition: all 0.2s;
        }
        .org-node:hover {
          box-shadow: var(--shadow-md); border-color: var(--primary); transform: translateY(-2px);
        }
        
        .node-company { border-top: 4px solid var(--primary); }
        .node-dept { border-top: 4px solid var(--info); cursor: pointer; }
        .node-emp { border-top: 4px solid var(--gray-400); cursor: grab; }
        .node-emp:active { cursor: grabbing; }

        .drop-target {
          background: var(--info-soft) !important;
          border-color: var(--info) !important;
          border-style: dashed !important;
        }

        .org-avatar {
          width: 40px; height: 40px; border-radius: 50%; background: var(--gray-100);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; color: var(--primary); margin: 0 auto 8px auto;
          font-size: 1.1rem; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .org-name { font-weight: 700; font-size: 0.85rem; color: var(--gray-900); white-space: nowrap; }
        .org-title { font-size: 0.7rem; color: var(--gray-500); margin-top: 2px; }
        .org-email { font-size: 0.65rem; color: var(--primary); margin-top: 4px; opacity: 0.8; }
        
        /* Collapse toggle */
        .collapse-toggle {
          position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%);
          width: 20px; height: 20px; background: white; border: 1px solid var(--gray-300);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 0.6rem; color: var(--gray-500); cursor: pointer; z-index: 3; box-shadow: var(--shadow-sm);
        }
        .collapse-toggle:hover { color: var(--primary); border-color: var(--primary); }
        
        /* Hidden subtrees */
        .org-hidden { display: none !important; }
      </style>
    `;

    // Initialize
    setTimeout(() => {
      const select = document.getElementById('orgChartCompanySelect');
      if (select && select.value) {
        this.loadTree(select.value);
      } else {
        document.getElementById('orgChartContainer').innerHTML = `
          <div class="empty-state" style="margin-top:100px;">
            <i class="fas fa-sitemap empty-state-icon"></i>
            <div class="empty-state-title">No Company Selected</div>
            <div class="empty-state-desc">Please select a company to view its org chart or add a company first.</div>
          </div>`;
      }
    }, 50);
  },

  _renderCompanyOptions: function () {
    const companies = window.DB.companies || [];
    if (!companies.length) return '<option value="">Found No Companies</option>';
    return companies.map((c, i) => `<option value="${c.id}" ${i === 0 ? 'selected' : ''}>${c.name}</option>`).join('');
  },

  // ── Tree Data Building ───────────────────────────────────────────────────
  loadTree: function (companyId) {
    if (!companyId) return;
    const comp = (window.DB.companies || []).find(c => c.id == companyId);
    if (!comp) return;

    const employees = (window.DB.employees || []).filter(e =>
      (e.companyId == companyId || e.companyName === comp.name) &&
      e.status !== 'Terminated'
    );

    // Build hierarchy: Company -> Departments -> Employees
    // For a deeper org chart, you'd link by managerId, but NEXA groups by Department currently.
    const depts = {};
    employees.forEach(e => {
      const d = e.department || 'Unassigned';
      if (!depts[d]) depts[d] = [];
      depts[d].push(e);
    });

    this._treeData = {
      id: 'comp_' + comp.id,
      type: 'company',
      name: comp.name,
      title: 'Company HQ',
      children: Object.keys(depts).sort().map(deptName => {
        return {
          id: 'dept_' + encodeURIComponent(deptName),
          type: 'department',
          name: deptName,
          title: depts[deptName].length + ' Employees',
          rawDeptName: deptName, // used for dropping
          collapsed: false,
          children: depts[deptName].sort((a, b) => a.firstName.localeCompare(b.firstName)).map(emp => ({
            id: emp.id,
            type: 'employee',
            name: `${emp.firstName} ${emp.lastName}`,
            title: emp.position || 'Employee',
            email: emp.email || '',
            initials: (emp.firstName[0] || '') + (emp.lastName[0] || '')
          }))
        };
      })
    };

    this.resetView(); // zoom & pan
    this.drawTree();
  },

  drawTree: function () {
    const container = document.getElementById('orgChartContainer');
    if (!container || !this._treeData) return;

    container.innerHTML = `<div class="org-tree"><ul>${this._renderNode(this._treeData)}</ul></div>`;
    this._attachDragEvents();
  },

  _renderNode: function (node) {
    let innerHtml = '';
    let classes = 'org-node ';
    let extraAttrs = '';

    if (node.type === 'company') {
      classes += 'node-company';
      innerHtml = `
        <div class="org-avatar" style="background:var(--primary-soft);color:var(--primary);">
          <i class="fas fa-building"></i>
        </div>
        <div class="org-name">${node.name}</div>
        <div class="org-title">${node.title}</div>
      `;
    } else if (node.type === 'department') {
      classes += 'node-dept dropzone';
      extraAttrs = `data-dept="${node.rawDeptName}"`;
      innerHtml = `
        <div style="font-size:1.2rem;color:var(--info);margin-bottom:8px;"><i class="fas fa-users-cog"></i></div>
        <div class="org-name">${node.name}</div>
        <div class="org-title">${node.title}</div>
      `;
    } else if (node.type === 'employee') {
      classes += 'node-emp draggable';
      extraAttrs = `draggable="true" data-empid="${node.id}"`;
      innerHtml = `
        <div class="org-avatar">${node.initials}</div>
        <div class="org-name">${node.name}</div>
        <div class="org-title">${node.title}</div>
        ${node.email ? `<div class="org-email"><i class="fas fa-envelope"></i> ${node.email.split('@')[0]}</div>` : ''}
      `;
    }

    // Collapse toggle button
    let toggleHtml = '';
    if (node.children && node.children.length > 0) {
      toggleHtml = `
        <div class="collapse-toggle" onclick="OrgChart.toggleNode('${node.id}')" title="Expand/Collapse">
          <i class="fas fa-${node.collapsed ? 'plus' : 'minus'}"></i>
        </div>
      `;
    }

    let html = `
      <li>
        <div class="${classes}" id="node_${node.id}" ${extraAttrs}>
          ${innerHtml}
          ${toggleHtml}
        </div>
    `;

    // Render children
    if (node.children && node.children.length > 0) {
      html += `<ul class="${node.collapsed ? 'org-hidden' : ''}" id="children_${node.id}">`;
      node.children.forEach(child => {
        html += this._renderNode(child);
      });
      html += `</ul>`;
    }

    html += `</li>`;
    return html;
  },

  toggleNode: function (nodeId) {
    // Traverse treeData to toggle
    const toggleRecursive = (node) => {
      if (node.id === nodeId) {
        node.collapsed = !node.collapsed;
        return true;
      }
      if (node.children) {
        for (let c of node.children) {
          if (toggleRecursive(c)) return true;
        }
      }
      return false;
    };
    toggleRecursive(this._treeData);
    this.drawTree();
  },

  // ── Zoom & Pan ───────────────────────────────────────────────────────────
  zoom: function (delta) {
    this.zoomPos = Math.max(0.3, Math.min(2.0, this.zoomPos + delta));
    document.getElementById('zoomLabel').textContent = Math.round(this.zoomPos * 100) + '%';
    this.applyTransform();
  },

  resetView: function () {
    this.zoomPos = 1;
    this.panX = 0;
    this.panY = 0;
    const l = document.getElementById('zoomLabel');
    if (l) l.textContent = '100%';
    this.applyTransform();
  },

  applyTransform: function () {
    const el = document.getElementById('orgChartContainer');
    if (el) {
      // Base transform uses centering, so we add panX/panY to the translation
      el.style.transform = `translateX(calc(-50% + ${this.panX}px)) translateY(${this.panY}px) scale(${this.zoomPos})`;
    }
  },

  // Panning state
  _isPanning: false,
  _startX: 0,
  _startY: 0,

  startPan: function (e) {
    // Only pan if clicking on empty space, not a node
    if (e.target.closest('.org-node')) return;
    this._isPanning = true;
    this._startX = e.clientX - this.panX;
    this._startY = e.clientY - this.panY;
    document.getElementById('orgChartCanvas').style.cursor = 'grabbing';
  },

  doPan: function (e) {
    if (!this._isPanning) return;
    e.preventDefault();
    this.panX = e.clientX - this._startX;
    this.panY = e.clientY - this._startY;
    this.applyTransform();
  },

  stopPan: function () {
    this._isPanning = false;
    const canvas = document.getElementById('orgChartCanvas');
    if (canvas) canvas.style.cursor = 'grab';
  },

  // ── Drag and Drop Reassignment ───────────────────────────────────────────
  _attachDragEvents: function () {
    const draggables = document.querySelectorAll('.draggable');
    const dropzones = document.querySelectorAll('.dropzone');

    draggables.forEach(dr => {
      dr.addEventListener('dragstart', (e) => {
        this._draggedEmpId = parseInt(e.target.closest('.org-node').dataset.empid);
        e.target.style.opacity = '0.5';
      });
      dr.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
        this._draggedEmpId = null;
        dropzones.forEach(dz => dz.classList.remove('drop-target'));
      });
    });

    dropzones.forEach(dz => {
      dz.addEventListener('dragover', (e) => {
        e.preventDefault(); // needed to allow drop
        dz.classList.add('drop-target');
      });
      dz.addEventListener('dragleave', (e) => {
        dz.classList.remove('drop-target');
      });
      dz.addEventListener('drop', (e) => {
        e.preventDefault();
        dz.classList.remove('drop-target');
        const targetDept = dz.dataset.dept;
        if (this._draggedEmpId && targetDept) {
          this._reassignEmployee(this._draggedEmpId, targetDept);
        }
      });
    });
  },

  _reassignEmployee: function (empId, newDept) {
    const emp = (window.DB.employees || []).find(e => e.id === empId);
    if (!emp) return;

    if (emp.department === newDept) return; // No change

    // Save
    const oldDept = emp.department || 'Unassigned';
    emp.department = newDept;
    window.DB.save();

    window.Toast.show(`Moved ${emp.firstName} to ${newDept}`, 'success');

    // Reload tree
    const compSel = document.getElementById('orgChartCompanySelect')?.value;
    if (compSel) this.loadTree(compSel);
  }
};

window.OrgChart = OrgChart;
