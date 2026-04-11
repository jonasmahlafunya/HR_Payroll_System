/**
 * Nexa HR & Payroll — Payroll Calendar
 * South African public holidays 2026 + SARS deadlines
 */
const PayrollCalendar = {
  _year:  new Date().getFullYear(),
  _month: new Date().getMonth(),

  // SA Public Holidays 2026 (fixed + calculated)
  _holidays: {
    '2026-01-01': "New Year's Day",
    '2026-03-21': 'Human Rights Day',
    '2026-04-03': 'Good Friday',
    '2026-04-06': 'Family Day (Easter Monday)',
    '2026-04-27': 'Freedom Day',
    '2026-05-01': "Workers' Day",
    '2026-06-16': 'Youth Day',
    '2026-08-09': "Women's Day",
    '2026-08-10': "Women's Day (observed)",   // 9 Aug is Sunday
    '2026-09-24': 'Heritage Day',
    '2026-12-16': 'Day of Reconciliation',
    '2026-12-25': 'Christmas Day',
    '2026-12-26': 'Day of Goodwill',
  },

  render: function (container) {
    this._year  = new Date().getFullYear();
    this._month = new Date().getMonth();

    container.innerHTML = `
      <div class="page-header">
        <div class="header-content">
          <h2 class="page-title"><i class="fas fa-calendar-alt" style="color:var(--primary);margin-right:10px;"></i>Payroll Calendar</h2>
          <p class="page-subtitle">SARS deadlines, pay cycles, and South African public holidays 2026</p>
        </div>
      </div>

      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
        <div class="card" style="border-left:4px solid var(--success);padding:16px 20px;">
          <div style="font-size:0.73rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);letter-spacing:1px;">Monthly Pay Day</div>
          <div style="font-size:1.4rem;font-weight:700;color:var(--gray-900);margin-top:4px;">25th</div>
          <div style="font-size:0.8rem;color:var(--gray-500);">or last business day</div>
        </div>
        <div class="card" style="border-left:4px solid var(--danger);padding:16px 20px;">
          <div style="font-size:0.73rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);letter-spacing:1px;">SARS EMP201 Due</div>
          <div style="font-size:1.4rem;font-weight:700;color:var(--gray-900);margin-top:4px;">7th</div>
          <div style="font-size:0.8rem;color:var(--gray-500);">of the following month</div>
        </div>
        <div class="card" style="border-left:4px solid var(--warning);padding:16px 20px;">
          <div style="font-size:0.73rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);letter-spacing:1px;">UIF Declaration</div>
          <div style="font-size:1.4rem;font-weight:700;color:var(--gray-900);margin-top:4px;">7th</div>
          <div style="font-size:0.8rem;color:var(--gray-500);">of the following month</div>
        </div>
        <div class="card" style="border-left:4px solid var(--info);padding:16px 20px;">
          <div style="font-size:0.73rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);letter-spacing:1px;">SDL Contribution</div>
          <div style="font-size:1.4rem;font-weight:700;color:var(--gray-900);margin-top:4px;">1% Payroll</div>
          <div style="font-size:0.8rem;color:var(--gray-500);">via EMP201 monthly</div>
        </div>
      </div>

      <!-- Navigation + calendar -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--gray-100);">
          <button class="btn btn-outline btn-sm" onclick="PayrollCalendar.prevMonth()">
            <i class="fas fa-chevron-left"></i> Prev
          </button>
          <h3 id="calMonthTitle" style="margin:0;font-size:1.1rem;font-weight:700;"></h3>
          <button class="btn btn-outline btn-sm" onclick="PayrollCalendar.nextMonth()">
            Next <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <div id="calendarGrid" style="padding:16px 20px;"></div>
      </div>

      <!-- Legend -->
      <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:16px;padding:0 4px;">
        ${[
          ['#10B981','Pay Day'],
          ['#EF4444','SARS / Tax Deadline'],
          ['#F59E0B','UIF Deadline'],
          ['#6366F1','Payroll Run'],
          ['#64748B','Public Holiday'],
        ].map(([c,l]) => `
          <div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:var(--gray-600);">
            <div style="width:12px;height:12px;border-radius:3px;background:${c};"></div> ${l}
          </div>`).join('')}
      </div>
    `;
    this._draw();
  },

  _draw: function () {
    const y = this._year, m = this._month;
    const title = document.getElementById('calMonthTitle');
    const grid  = document.getElementById('calendarGrid');
    if (!title || !grid) return;

    title.textContent = new Date(y, m, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

    const firstDay     = new Date(y, m, 1).getDay();
    const daysInMonth  = new Date(y, m + 1, 0).getDate();
    const today        = new Date();
    const isThisMonth  = today.getFullYear() === y && today.getMonth() === m;

    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let html = `
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">
        ${days.map(d => `
          <div style="text-align:center;font-weight:700;font-size:0.72rem;color:var(--gray-500);
                      text-transform:uppercase;padding:8px 2px;letter-spacing:0.5px;">${d}</div>
        `).join('')}
    `;

    // Leading blanks
    for (let i = 0; i < firstDay; i++) {
      html += `<div style="min-height:90px;background:var(--gray-50);border-radius:6px;"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr  = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday  = isThisMonth && d === today.getDate();
      const isWeekend= [0,6].includes(new Date(y,m,d).getDay());
      const events   = this._getEvents(d, m, y);
      const holiday  = this._holidays[dateStr];

      html += `
        <div style="min-height:90px;padding:6px;border-radius:6px;position:relative;
          background:${holiday ? 'rgba(100,116,139,0.06)' : isWeekend ? 'var(--gray-50)' : '#fff'};
          border:1px solid ${isToday ? 'var(--primary)' : 'var(--gray-100)'};
          ${isToday ? 'box-shadow:0 0 0 2px var(--primary-soft);' : ''}">
          <div style="font-size:0.82rem;font-weight:${isToday ? '700' : '500'};
            color:${isToday ? 'var(--primary)' : isWeekend ? 'var(--gray-400)' : 'var(--gray-700)'};
            margin-bottom:3px;">${d}</div>
          ${holiday ? `<div style="font-size:0.62rem;color:#64748B;font-weight:600;line-height:1.2;margin-bottom:3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" title="${holiday}">🇿🇦 ${holiday}</div>` : ''}
          ${events.map(e => `
            <div title="${e.label}" style="background:${e.color};color:#fff;font-size:0.62rem;font-weight:600;
              padding:2px 5px;border-radius:3px;margin-bottom:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">
              ${e.label}
            </div>
          `).join('')}
        </div>
      `;
    }
    html += '</div>';
    grid.innerHTML = html;
  },

  _getEvents: function (d, m, y) {
    const events = [];
    const lastBizDay = this._lastBizDay(y, m);

    // Pay day — 25th or last business day if 25th is weekend/holiday
    const payDay = this._adjustBizDay(y, m, 25);
    if (d === payDay) events.push({ label: 'Pay Day', color: '#10B981' });

    // Payroll run deadline — 20th or last business day
    const runDay = this._adjustBizDay(y, m, 20);
    if (d === runDay) events.push({ label: 'Payroll Cut-off', color: '#6366F1' });

    // SARS EMP201 — 7th of the month (for previous month payroll)
    if (d === 7) events.push({ label: 'SARS EMP201', color: '#EF4444' });

    // UIF declaration — 7th
    if (d === 7) events.push({ label: 'UIF Declaration', color: '#F59E0B' });

    // SARS EMP501 reconciliation — bi-annually (last day of Aug and Feb)
    if ((m === 7 && d === lastBizDay) || (m === 1 && d === lastBizDay)) {
      events.push({ label: 'EMP501 Due', color: '#DC2626' });
    }

    // IRP5 / IT3(a) — end of October (following tax year end)
    if (m === 9 && d === 31 && new Date(y, m, 31).getDate() === 31) {
      events.push({ label: 'IRP5 Submission', color: '#8B5CF6' });
    }

    return events;
  },

  // Last business day of the month
  _lastBizDay: function (y, m) {
    let d = new Date(y, m + 1, 0); // last day of month
    while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() - 1);
    return d.getDate();
  },

  // Move a target day earlier if it falls on weekend/holiday
  _adjustBizDay: function (y, m, target) {
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let d = Math.min(target, daysInMonth);
    let date = new Date(y, m, d);
    while ([0, 6].includes(date.getDay())) {
      date.setDate(date.getDate() - 1);
    }
    return date.getDate();
  },

  prevMonth: function () {
    this._month--;
    if (this._month < 0) { this._month = 11; this._year--; }
    this._draw();
  },

  nextMonth: function () {
    this._month++;
    if (this._month > 11) { this._month = 0; this._year++; }
    this._draw();
  }
};

window.PayrollCalendar = PayrollCalendar;
window.renderCalendar  = c => PayrollCalendar.render(c);
