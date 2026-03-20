
const Succession = {
  render: function (container) {
    const emps = window.DB.employees.filter(e => e.status === 'Active');

    container.innerHTML = `
      <div class="page-title-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <div>
          <h2><i class="fas fa-users-cog"></i> Succession Planning</h2>
          <div style="color:var(--gray-500)">9-box talent grid and successor identification</div>
        </div>
        <button class="btn btn-primary" onclick="Succession.showAssignModal()"><i class="fas fa-plus"></i> Assign Successor</button>
      </div>

      <div class="grid-2" style="margin-bottom:24px;">
        <div class="card">
          <div class="card-header"><h4>9-Box Talent Grid</h4></div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:4px;height:280px;">
              ${[
                {label:'Solid Prof.',color:'#dbeafe',text:'#1e40af',pos:'bottom-left'},
                {label:'High Perform.',color:'#dcfce7',text:'#166534'},
                {label:'Star',color:'#bbf7d0',text:'#14532d'},
                {label:'Core Emp.',color:'#fef9c3',text:'#713f12'},
                {label:'Emerging',color:'#fef3c7',text:'#92400e'},
                {label:'High Potential',color:'#d1fae5',text:'#065f46'},
                {label:'Underperform.',color:'#fee2e2',text:'#991b1b'},
                {label:'Needs Dev.',color:'#fef3c7',text:'#92400e'},
                {label:'Inconsistent',color:'#e0e7ff',text:'#3730a3'},
              ].map(box => `
                <div style="background:${box.color};border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;cursor:pointer;transition:transform 0.15s;" onmouseenter="this.style.transform='scale(1.03)'" onmouseleave="this.style.transform=''">
                  <div style="font-size:0.65rem;font-weight:700;color:${box.text};text-align:center">${box.label}</div>
                  <div style="font-size:1.1rem;font-weight:700;color:${box.text};margin-top:4px">
                    ${Math.floor(Math.random() * 3)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h4>Successor Assignments</h4></div>
          <div class="table-responsive">
            <table>
              <thead><tr><th>Role / Critical Position</th><th>Incumbent</th><th>Successor</th><th>Readiness</th></tr></thead>
              <tbody>
                ${(window.DB.successionPlans || []).length ? (window.DB.successionPlans || []).map(p => {
                  const inc = window.DB.employees.find(e => e.id === p.incumbentId);
                  const suc = window.DB.employees.find(e => e.id === p.successorId);
                  return `<tr>
                    <td style="font-weight:500">${p.role}</td>
                    <td>${inc ? inc.firstName + ' ' + inc.lastName : '—'}</td>
                    <td>${suc ? suc.firstName + ' ' + suc.lastName : '—'}</td>
                    <td><span class="badge badge-${p.readiness === 'Ready Now' ? 'success' : p.readiness === '1-2 Years' ? 'warning' : 'gray'}">${p.readiness}</span></td>
                  </tr>`;
                }).join('') : '<tr><td colspan="4" class="text-center" style="padding:20px;color:var(--gray-500)">No successor assignments yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h4>Critical Roles & Risk Assessment</h4></div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Risk if Leave</th><th>Successor Identified</th></tr></thead>
            <tbody>
              ${emps.slice(0, 8).map(e => {
                const hasPlan = (window.DB.successionPlans || []).some(p => p.incumbentId === e.id);
                const risk = e.basicSalary > 50000 ? 'High' : e.basicSalary > 25000 ? 'Medium' : 'Low';
                return `<tr>
                  <td style="font-weight:500">${e.firstName} ${e.lastName}</td>
                  <td>${e.position}</td>
                  <td>${e.department}</td>
                  <td><span class="badge badge-${risk === 'High' ? 'danger' : risk === 'Medium' ? 'warning' : 'success'}">${risk}</span></td>
                  <td>${hasPlan ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-gray">No</span>'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  showAssignModal: function () {
    const empOptions = window.DB.employees.filter(e => e.status === 'Active').map(e => `<option value="${e.id}">${e.firstName} ${e.lastName} — ${e.position}</option>`).join('');
    const html = `
      <div class="card" style="width:100%;max-width:520px;margin:auto;">
        <div class="card-header"><h4>Assign Successor</h4><button class="btn btn-outline btn-sm" onclick="closeModal('succModal')"><i class="fas fa-times"></i></button></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Critical Role / Position</label><input type="text" id="suc_role" class="form-control" placeholder="e.g. CFO, Lead Developer"></div>
          <div class="form-group"><label class="form-label">Incumbent Employee</label><select id="suc_incumbent" class="form-control">${empOptions}</select></div>
          <div class="form-group"><label class="form-label">Identified Successor</label><select id="suc_successor" class="form-control">${empOptions}</select></div>
          <div class="form-group"><label class="form-label">Readiness</label>
            <select id="suc_readiness" class="form-control">
              <option>Ready Now</option><option>1-2 Years</option><option>3-5 Years</option><option>Not Ready</option>
            </select>
          </div>
          <button class="btn btn-primary" style="width:100%" onclick="Succession.savePlan()">Save Plan</button>
        </div>
      </div>`;
    window.showModal('succModal', html);
  },

  savePlan: function () {
    window.DB.successionPlans = window.DB.successionPlans || [];
    window.DB.successionPlans.push({
      id: Date.now(),
      role: document.getElementById('suc_role').value,
      incumbentId: parseInt(document.getElementById('suc_incumbent').value),
      successorId: parseInt(document.getElementById('suc_successor').value),
      readiness: document.getElementById('suc_readiness').value
    });
    window.DB.save();
    window.Toast.show('Succession plan saved', 'success');
    closeModal('succModal');
    this.render(document.getElementById('content'));
  }
};

window.renderSuccession = function (container) { Succession.render(container); };
