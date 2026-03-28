
const Shifts = {
  render: function (container) {
    window.DB.shifts = window.DB.shifts || [];
    const shifts = window.DB.shifts;
    const emps = window.DB.employees.filter(e => e.status === 'Active');
    const depts = [...new Set(emps.map(e => e.department))].filter(Boolean);

    // Build week days
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return { label: d.toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' }), iso: d.toISOString().split('T')[0] };
    });

    const shiftTypes = [
      { key: 'Morning', label: 'Morning (06:00–14:00)', color: '#dbeafe' },
      { key: 'Afternoon', label: 'Afternoon (14:00–22:00)', color: '#dcfce7' },
      { key: 'Night', label: 'Night (22:00–06:00)', color: '#ede9fe' },
      { key: 'Off', label: 'Off', color: '#f3f4f6' }
    ];

    container.innerHTML = `
      <div class="page-title-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <div>
          <h2><i class="fas fa-calendar-week"></i> Shift Scheduling</h2>
          <div style="color:var(--gray-500)">Week of ${weekStart.toLocaleDateString('en-ZA')}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <select class="form-control" id="shiftDeptFilter" style="width:160px;padding:6px 10px;font-size:0.82rem;" onchange="Shifts.render(document.getElementById('content'))">
            <option value="">All Departments</option>
            ${depts.map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" onclick="Shifts.saveSchedule()"><i class="fas fa-save"></i> Save Schedule</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div class="card-body" style="padding:8px 16px;">
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            ${shiftTypes.map(s => `<div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;">
              <div style="width:14px;height:14px;border-radius:3px;background:${s.color};border:1px solid rgba(0,0,0,0.1);"></div>
              ${s.label}
            </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table style="font-size:0.82rem;">
            <thead>
              <tr>
                <th style="min-width:140px;">Employee</th>
                <th>Dept</th>
                ${days.map(d => `<th style="text-align:center;min-width:80px;">${d.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${emps.filter(e => {
                const filter = document.getElementById('shiftDeptFilter')?.value;
                return !filter || e.department === filter;
              }).slice(0, 15).map(emp => `
                <tr>
                  <td style="font-weight:500">${emp.firstName} ${emp.lastName}</td>
                  <td style="color:var(--gray-500)">${emp.department || '—'}</td>
                  ${days.map(d => {
                    const existing = shifts.find(s => s.employeeId === emp.id && s.date === d.iso);
                    const shiftKey = existing?.shift || 'Morning';
                    const color = shiftTypes.find(s => s.key === shiftKey)?.color || '#f3f4f6';
                    return `<td style="text-align:center;padding:4px;">
                      <select style="font-size:0.75rem;padding:2px 4px;border-radius:4px;border:1px solid var(--gray-200);background:${color};cursor:pointer;"
                        id="shift_${emp.id}_${d.iso}"
                        onchange="Shifts.updateColor(this)"
                        data-emp="${emp.id}" data-date="${d.iso}">
                        ${shiftTypes.map(s => `<option value="${s.key}" ${shiftKey === s.key ? 'selected' : ''}>${s.key}</option>`).join('')}
                      </select>
                    </td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  updateColor: function (select) {
    const colors = { Morning: '#dbeafe', Afternoon: '#dcfce7', Night: '#ede9fe', Off: '#f3f4f6' };
    select.style.background = colors[select.value] || '#f3f4f6';
  },

  saveSchedule: function () {
    window.DB.shifts = window.DB.shifts || [];
    const selects = document.querySelectorAll('[id^="shift_"]');
    selects.forEach(sel => {
      const empId = parseInt(sel.dataset.emp);
      const date = sel.dataset.date;
      const shift = sel.value;
      const existing = window.DB.shifts.find(s => s.employeeId === empId && s.date === date);
      if (existing) { existing.shift = shift; }
      else { window.DB.shifts.push({ id: Date.now() + empId, employeeId: empId, date, shift }); }
    });
    window.DB.save();
    window.Toast.show('Shift schedule saved', 'success');
  }
};

window.renderShifts = function (container) { Shifts.render(container); };
