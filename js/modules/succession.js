const Succession = {
  render: function (container) {
    const html = `
      <div class="page-title-box">
        <h2>Succession Planning</h2>
        <div style="color: var(--gray-500);">Identify and develop future leaders</div>
      </div>

      <div class="grid-2">
         <div class="card">
            <div class="card-header"><h4 class="card-title">Critical Roles Risk</h4></div>
            <div class="card-body">
               ${this.renderRiskRow("Chief Technology Officer", "High", "danger")}
               ${this.renderRiskRow("Head of Sales", "Medium", "warning")}
               ${this.renderRiskRow("Operations Manager", "Low", "success")}
            </div>
         </div>
         <div class="card">
            <div class="card-header"><h4 class="card-title">Talent Pool</h4></div>
            <div class="card-body">
               <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                  <div class="avatar avatar-lg" style="background: var(--primary); text-align: center; color: white; display: flex; align-items: center; justify-content: center;">TM</div>
                  <div class="avatar avatar-lg" style="background: var(--success); text-align: center; color: white; display: flex; align-items: center; justify-content: center;">SV</div>
                  <div style="width: 80px; height: 80px; border-radius: 50%; border: 2px dashed var(--gray-300); display: flex; align-items: center; justify-content: center; color: var(--gray-400);">
                     <i class="fas fa-plus"></i>
                  </div>
               </div>
            </div>
         </div>
      </div>
    `;
    container.innerHTML = html;
  },

  renderRiskRow: function (role, risk, color) {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--gray-100);">
         <div>
            <div style="font-weight: 500;">${role}</div>
            <small style="color: var(--gray-500);">Successor Ready: ${risk === 'High' ? 'None' : 'Yes'}</small>
         </div>
         <span class="badge badge-${color}">Risk: ${risk}</span>
      </div>
    `;
  }
};

window.renderSuccession = function (container) {
  Succession.render(container);
};
