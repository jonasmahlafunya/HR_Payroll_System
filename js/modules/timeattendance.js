const TimeAttendance = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Time & Attendance</h2>
          <div style="color: var(--gray-500);">Track work hours, overtime and shifts</div>
        </div>
        <div>
           <span style="font-size: 1.2rem; font-weight: 700; margin-right: 16px;" id="liveClock">00:00:00</span>
           <button class="btn btn-success" id="clockBtn" onclick="TimeAttendance.toggleClock()">
             <i class="fas fa-sign-in-alt"></i> Clock In
           </button>
        </div>
      </div>

      <div class="grid-3" style="margin-bottom: 24px;">
         <div class="card">
            <div class="card-body" style="text-align: center;">
               <div style="color: var(--gray-500);">Hours Worked (This Week)</div>
               <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">38.5</div>
            </div>
         </div>
         <div class="card">
            <div class="card-body" style="text-align: center;">
               <div style="color: var(--gray-500);">Overtime</div>
               <div style="font-size: 2rem; font-weight: 700; color: var(--warning);">2.0</div>
            </div>
         </div>
         <div class="card">
            <div class="card-body" style="text-align: center;">
               <div style="color: var(--gray-500);">Attendance Score</div>
               <div style="font-size: 2rem; font-weight: 700; color: var(--success);">98%</div>
            </div>
         </div>
      </div>

      <div class="card">
        <div class="card-header"><h4 class="card-title">Weekly Timesheet</h4></div>
        <div class="table-responsive">
          <table>
             <thead>
               <tr>
                 <th>Date</th>
                 <th>Day</th>
                 <th>Clock In</th>
                 <th>Clock Out</th>
                 <th>Total Hours</th>
                 <th>Status</th>
               </tr>
             </thead>
             <tbody>
               ${this.renderTimesheetRow("2025-01-20", "Monday", "08:00", "17:00", "9h", "Regular")}
               ${this.renderTimesheetRow("2025-01-21", "Tuesday", "08:15", "17:15", "9h", "Regular")}
               ${this.renderTimesheetRow("2025-01-22", "Wednesday", "08:00", "17:00", "9h", "Regular")}
               ${this.renderTimesheetRow("2025-01-23", "Thursday", "08:00", "18:00", "10h", "Overtime")}
               ${this.renderTimesheetRow("2025-01-24", "Friday", "08:00", "16:00", "8h", "Regular")}
             </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
    this.startClock();
  },

  renderTimesheetRow: function (date, day, start, end, total, status) {
    return `
       <tr>
         <td>${date}</td>
         <td>${day}</td>
         <td>${start}</td>
         <td>${end}</td>
         <td style="font-weight: 600;">${total}</td>
         <td><span class="badge ${status === 'Overtime' ? 'badge-warning' : 'badge-success'}">${status}</span></td>
       </tr>
     `;
  },

  toggleClock: function () {
    const btn = document.getElementById('clockBtn');
    if (btn.innerHTML.includes('Clock In')) {
      btn.innerHTML = `<i class="fas fa-sign-out-alt"></i> Clock Out`;
      btn.className = 'btn btn-danger';
      window.Toast.show("Clocked In Successfully at " + new Date().toLocaleTimeString(), "success");
    } else {
      btn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Clock In`;
      btn.className = 'btn btn-success';
      window.Toast.show("Clocked Out Successfully at " + new Date().toLocaleTimeString(), "warning");
    }
  },

  startClock: function () {
    setInterval(() => {
      const el = document.getElementById('liveClock');
      if (el) el.textContent = new Date().toLocaleTimeString();
    }, 1000);
  }
};

window.renderTimeAttendance = function (container) {
  TimeAttendance.render(container);
};