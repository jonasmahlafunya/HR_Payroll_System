const Engagement = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Employee Engagement</h2>
          <div style="color: var(--gray-500);">Surveys, Feedback & Recognition</div>
        </div>
        <button class="btn btn-primary" onclick="Engagement.giveKudos()">
          <i class="fas fa-medal"></i> Give Kudos
        </button>
      </div>

      <div class="grid-3" style="margin-bottom: 24px;">
         <div class="card">
            <div class="card-body" style="text-align: center;">
               <div style="font-size: 2.5rem; color: var(--success); font-weight: 700;">8.4</div>
               <div style="color: var(--gray-500);">eNPS Score</div>
            </div>
         </div>
         <div class="card">
            <div class="card-body" style="text-align: center;">
               <div style="font-size: 2.5rem; color: var(--primary); font-weight: 700;">92%</div>
               <div style="color: var(--gray-500);">Survey Participation</div>
            </div>
         </div>
         <div class="card">
            <div class="card-body" style="text-align: center;">
               <div style="font-size: 2.5rem; color: var(--warning); font-weight: 700;">15</div>
               <div style="color: var(--gray-500);">Kudos this Month</div>
            </div>
         </div>
      </div>

      <div class="grid-2">
         <div class="card">
            <div class="card-header"><h4 class="card-title">Recognition Wall</h4></div>
            <div class="card-body">
              ${this.renderKudos("Thabo Mokoena", "Reviewing the critical PR so quickly!", "Team Player", 2)}
              ${this.renderKudos("Sarah Van der Merwe", "Staying late to finish the month-end run.", "Dedication", 5)}
              ${this.renderKudos("Michael Chen", "Leading the successful migration.", "Leadership", 1)}
            </div>
         </div>

         <div class="card">
            <div class="card-header"><h4 class="card-title">Active Surveys</h4></div>
            <div class="card-body">
               <div style="border: 1px solid var(--gray-200); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                  <h5 style="margin-bottom: 8px;">Q1 2025 Pulse Check</h5>
                  <p style="font-size: 0.9rem; color: var(--gray-600); margin-bottom: 12px;">How are you feeling about the new hybrid work policy?</p>
                  <button class="btn btn-sm btn-primary" style="width: 100%;">Start Survey</button>
               </div>
               <div style="border: 1px solid var(--gray-200); border-radius: 8px; padding: 16px;">
                  <h5 style="margin-bottom: 8px;">Manager Feedback</h5>
                  <p style="font-size: 0.9rem; color: var(--gray-600); margin-bottom: 12px;">Annual upward feedback for your direct manager.</p>
                  <button class="btn btn-sm btn-outline" style="width: 100%;">Complete</button>
               </div>
            </div>
         </div>
      </div>
    `;
    container.innerHTML = html;
  },

  renderKudos: function (name, message, tag, minsAgo) {
    return `
      <div style="display: flex; gap: 12px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--gray-100);">
         <div class="avatar" style="background: var(--primary-light); color: white; display: flex; align-items: center; justify-content: center;">${name.charAt(0)}</div>
         <div>
            <div style="font-weight: 600;">${name} <span style="font-weight: 400; color: var(--gray-500);">received kudos</span></div>
            <div style="margin: 4px 0; font-size: 0.95rem;">"${message}"</div>
            <div style="display: flex; gap: 8px; align-items: center;">
               <span class="badge badge-info">${tag}</span>
               <small style="color: var(--gray-400);">${minsAgo} days ago</small>
            </div>
         </div>
      </div>
    `;
  },

  giveKudos: function () {
    window.showModal('kudosModal', `<div class='card' style='margin:auto; padding:20px;'><h3>Give Kudos</h3><p>Recognize a colleague.</p><button class='btn btn-primary' onclick='closeModal("kudosModal"); Toast.show("Kudos Sent!", "success");'>Send</button></div>`);
  }
};

window.renderEngagement = function (container) {
  Engagement.render(container);
};
