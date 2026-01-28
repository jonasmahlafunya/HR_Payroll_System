const AdvancedPerformance = {
  render: function (container) {
    const html = `
      <div class="page-title-box">
        <h2>OKRs & Strategic Goals</h2>
        <div style="color: var(--gray-500);">Align individual performance with company strategy</div>
      </div>

      <div class="card mb-4" style="background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%); color: white;">
         <div class="card-body">
            <h3 style="margin-bottom: 8px;">Company Objective: "Market Leadership 2025"</h3>
            <div class="progress-bar" style="background: rgba(255,255,255,0.2);"><div class="progress-fill" style="width: 65%; background: white;"></div></div>
            <div style="margin-top: 8px; font-size: 0.9rem;">65% Achieved</div>
         </div>
      </div>

      <div class="grid-2">
         <div class="card">
            <div class="card-header"><h4 class="card-title">Departmental Key Results</h4></div>
            <div class="card-body">
               ${this.renderKR("IT: 99.9% Uptime", 98, "success")}
               ${this.renderKR("Sales: R10M Revenue", 75, "primary")}
               ${this.renderKR("HR: 90% Retention", 88, "info")}
            </div>
         </div>
         <div class="card">
            <div class="card-header"><h4 class="card-title">Calibration & Matrix</h4></div>
            <div class="card-body text-center">
               <div style="padding: 40px; background: var(--gray-50); border-radius: 8px;">
                  <i class="fas fa-th" style="font-size: 3rem; color: var(--gray-400); margin-bottom: 16px;"></i>
                  <h5>9-Box Talent Matrix</h5>
                  <button class="btn btn-outline btn-sm mt-2">View Matrix</button>
               </div>
            </div>
         </div>
      </div>
    `;
    container.innerHTML = html;
  },

  renderKR: function (title, progress, color) {
    return `
      <div style="margin-bottom: 16px;">
         <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 500;">${title}</span>
            <span>${progress}%</span>
         </div>
         <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%; background: var(--${color});"></div></div>
      </div>
    `;
  }
};

window.renderAdvancedPerformance = function (container) {
  AdvancedPerformance.render(container);
};
