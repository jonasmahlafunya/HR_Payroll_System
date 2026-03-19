
const OrgChart = {
  render: function (container) {
    container.innerHTML = `
      <div class="page-title-box">
        <h2><i class="fas fa-sitemap"></i> Organisation Chart</h2>
        <div style="display:flex;gap:8px;">
          <select class="form-control" id="orgCompanyFilter" style="width:200px;padding:6px 10px;font-size:0.82rem;" onchange="OrgChart.rebuild(this.value)">
            <option value="">All Companies</option>
            ${(window.DB.companies || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
          <button class="btn btn-outline btn-sm" onclick="OrgChart.rebuild('')"><i class="fas fa-sync"></i> Refresh</button>
        </div>
      </div>
      <div id="orgChartBody">${this.buildChart('')}</div>
    `;
  },

  rebuild: function (companyId) {
    const body = document.getElementById('orgChartBody');
    if (body) body.innerHTML = this.buildChart(companyId);
  },

  buildChart: function (companyId) {
    const emps = window.DB.employees.filter(e => {
      if (e.status === 'Terminated') return false;
      if (companyId) {
        const comp = window.DB.companies.find(c => c.id == companyId);
        return e.companyName === comp?.name || e.companyId == companyId;
      }
      return true;
    });

    if (!emps.length) return '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-sitemap"></i></div><div class="empty-state-title">No employees found</div></div>';

    // Group by department
    const depts = {};
    emps.forEach(e => {
      const dept = e.department || 'General';
      if (!depts[dept]) depts[dept] = [];
      depts[dept].push(e);
    });

    const renderCard = (emp) => `
      <div style="background:white;border:1px solid var(--gray-200);border-radius:12px;padding:16px;text-align:center;min-width:140px;max-width:160px;box-shadow:var(--shadow-sm);transition:transform 0.2s;cursor:pointer;" onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform=''" onclick="Employees.viewEmployee(${emp.id})">
        ${emp.photo
          ? `<img src="${emp.photo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;margin:0 auto 8px;display:block;">`
          : `<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark,#3730a3));color:white;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;margin:0 auto 8px;">${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}</div>`
        }
        <div style="font-weight:600;font-size:0.82rem;margin-bottom:2px;">${emp.firstName} ${emp.lastName}</div>
        <div style="font-size:0.72rem;color:var(--gray-500);">${emp.position || 'Employee'}</div>
        <div style="font-size:0.68rem;color:var(--primary);margin-top:4px;">${window.formatCurrency(emp.basicSalary || 0)}/mo</div>
      </div>
    `;

    return `
      <div style="overflow-x:auto;padding:16px 0;">
        ${Object.entries(depts).map(([dept, members]) => `
          <div style="margin-bottom:32px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
              <div style="width:4px;height:24px;background:var(--primary);border-radius:2px;"></div>
              <h4 style="margin:0;color:var(--gray-800);">${dept}</h4>
              <span class="badge badge-primary">${members.length}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:16px;padding-left:16px;">
              ${members.map(renderCard).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};

window.renderOrgchart = function (container) {
  OrgChart.render(container);
};
