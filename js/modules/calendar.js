/**
 * Nexa HR & Payroll — Payroll Calendar Module
 */
const PayrollCalendar = {
  render: function (container) {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    container.innerHTML = `
      <div class="page-header">
        <div class="header-content">
          <h2 class="page-title">Payroll Calendar</h2>
          <p class="page-subtitle">Deadlines, Pay Cycles, and Tax Dates</p>
        </div>
        <div class="header-actions">
           <button class="btn btn-secondary btn-sm" onclick="PayrollCalendar.prevMonth()">
             <i class="fas fa-chevron-left"></i>
           </button>
           <button class="btn btn-secondary btn-sm" onclick="PayrollCalendar.nextMonth()">
             <i class="fas fa-chevron-right"></i>
           </button>
        </div>
      </div>

      <div class="grid-4" style="margin-bottom:24px;">
        <div class="card stat-card" style="border-left:4px solid #4f46e5;">
          <div class="card-body">
            <div class="stat-label">Next Pay Day</div>
            <div class="stat-value" style="font-size:1.1rem;">25 ${new Intl.DateTimeFormat('en', { month: 'short' }).format(today)}</div>
          </div>
        </div>
        <div class="card stat-card" style="border-left:4px solid #EF4444;">
          <div class="card-body">
            <div class="stat-label">SARS EMP201</div>
            <div class="stat-value" style="font-size:1.1rem;">07 ${new Intl.DateTimeFormat('en', { month: 'short' }).format(today)}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="calendar-wrapper" id="calendarGrid" style="padding:20px;">
           <!-- Calendar JS will inject here -->
        </div>
      </div>
    `;
    
    this.drawCalendar(month, year);
  },

  drawCalendar: function (month, year) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(year, month));

    let html = `
      <h3 style="margin-bottom:20px; text-align:center;">${monthName} ${year}</h3>
      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:1px; background:#e2e8f0; border:1px solid #e2e8f0;">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div style="background:#f8fafc; padding:10px; text-align:center; font-weight:700; font-size:0.8rem; color:#64748b;">${d}</div>`).join('')}
    `;

    // Fill blank days
    for (let i = 0; i < firstDay; i++) {
       html += `<div style="background:#fff; height:100px; padding:10px;"></div>`;
    }

    // Days with events
    for (let d = 1; d <= daysInMonth; d++) {
       const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
       const events = this.getEvents(d, month, year);
       
       html += `
         <div style="background:#fff; height:100px; padding:8px; border:1px solid #f1f5f9; position:relative; ${isToday ? 'background:#f0f9ff;' : ''}">
           <div style="font-size:0.85rem; font-weight:600; ${isToday ? 'color:#4f46e5;' : ''}">${d}</div>
           <div style="margin-top:4px;">
             ${events.map(e => `
               <div style="background:${e.color}; color:white; font-size:0.65rem; padding:2px 4px; border-radius:3px; margin-bottom:2px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;" title="${e.title}">
                 ${e.title}
               </div>
             `).join('')}
           </div>
         </div>
       `;
    }

    html += `</div>`;
    grid.innerHTML = html;
  },

  getEvents: function (day, month, year) {
     const events = [];
     // Fixed dates
     if (day === 7) events.push({ title: 'SARS EMP201', color: '#EF4444' });
     if (day === 25) events.push({ title: 'Monthly Pay Day', color: '#10B981' });
     if (day === 20) events.push({ title: 'Payroll Run Deadline', color: '#4f46e5' });
     
     // UIF declaration usually due same as EMP201
     if (day === 7) events.push({ title: 'UIF Declaration', color: '#F59E0B' });

     return events;
  },

  prevMonth: function () { /* Logic to track current view and redraw */ },
  nextMonth: function () { /* Logic to track current view and redraw */ }
};

window.renderCalendar = function (container) {
  PayrollCalendar.render(container);
};
