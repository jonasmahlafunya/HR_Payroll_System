const ShiftScheduling = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2>Shift Scheduling</h2>
        <div style="color: var(--gray-500);">Manage rosters and shifts</div>
        <button class="btn btn-primary" onclick="Toast.show('Publishing Roster...', 'success')">Publish Roster</button>
      </div>

      <div class="card">
         <div class="card-header">
            <div style="display: flex; justify-content: space-between; width: 100%;">
               <h4>Jan 20 - Jan 26, 2025</h4>
               <div>
                  <button class="btn btn-sm btn-outline"><i class="fas fa-chevron-left"></i></button>
                  <button class="btn btn-sm btn-outline"><i class="fas fa-chevron-right"></i></button>
               </div>
            </div>
         </div>
         <div class="table-responsive">
            <table style="text-align: center;">
               <thead>
                  <tr><th>Employee</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr>
               </thead>
               <tbody>
                  <tr>
                     <td style="text-align: left; font-weight: 500;">Thabo Mokoena</td>
                     <td><span class="badge badge-primary">09:00 - 17:00</span></td>
                     <td><span class="badge badge-primary">09:00 - 17:00</span></td>
                     <td><span class="badge badge-primary">09:00 - 17:00</span></td>
                     <td><span class="badge badge-primary">09:00 - 17:00</span></td>
                     <td><span class="badge badge-primary">09:00 - 17:00</span></td>
                  </tr>
                  <tr>
                     <td style="text-align: left; font-weight: 500;">Support Team</td>
                     <td><span class="badge badge-info">08:00 - 16:00</span></td>
                     <td><span class="badge badge-info">08:00 - 16:00</span></td>
                     <td><span class="badge badge-info">08:00 - 16:00</span></td>
                     <td><span class="badge badge-info">08:00 - 16:00</span></td>
                     <td><span class="badge badge-info">08:00 - 16:00</span></td>
                  </tr>
               </tbody>
            </table>
         </div>
      </div>
    `;
    container.innerHTML = html;
  }
};

window.renderShiftScheduling = function (container) {
  ShiftScheduling.render(container);
};
