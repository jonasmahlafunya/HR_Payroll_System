
const Engagement = {
  render: function (container) {
    window.DB.surveys = window.DB.surveys || [];
    const surveys = window.DB.surveys;

    container.innerHTML = `
      <div class="page-title-box" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <div>
          <h2><i class="fas fa-heart"></i> Employee Engagement</h2>
          <div style="color:var(--gray-500)">Pulse surveys and eNPS tracking</div>
        </div>
        <button class="btn btn-primary" onclick="Engagement.createSurvey()"><i class="fas fa-plus"></i> New Survey</button>
      </div>

      <div class="grid-4" style="margin-bottom:24px;">
        <div class="kpi-card">
          <div class="kpi-label">eNPS Score</div>
          <div class="kpi-value" style="color:var(--success);font-size:2rem;">+42</div>
          <div style="font-size:0.75rem;color:var(--gray-500)">Good (above 30)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Surveys Created</div>
          <div class="kpi-value">${surveys.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Avg Response Rate</div>
          <div class="kpi-value">78%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Satisfaction</div>
          <div class="kpi-value" style="color:var(--primary)">4.1 / 5</div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:24px;">
        <div class="card">
          <div class="card-header"><h4>eNPS Trend</h4></div>
          <div class="card-body">
            <div style="display:flex;align-items:flex-end;gap:8px;height:120px;">
              ${[28, 35, 38, 40, 42].map((v, i) => {
                const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
                return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                  <div style="font-size:0.7rem;font-weight:600;color:var(--primary)">${v}</div>
                  <div style="width:100%;background:var(--primary);border-radius:4px 4px 0 0;height:${(v/50)*90}px;"></div>
                  <div style="font-size:0.65rem;color:var(--gray-500)">${months[i]}</div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h4>Sentiment by Category</h4></div>
          <div class="card-body">
            ${[
              { cat: 'Work Environment', score: 4.2 },
              { cat: 'Management', score: 3.8 },
              { cat: 'Career Growth', score: 3.5 },
              { cat: 'Compensation', score: 3.9 },
              { cat: 'Work-Life Balance', score: 4.4 }
            ].map(s => `
              <div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:0.82rem;">
                  <span>${s.cat}</span><span style="font-weight:600">${s.score}/5</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${(s.score/5)*100}%;background:${s.score >= 4 ? 'var(--success)' : s.score >= 3.5 ? 'var(--warning)' : 'var(--danger)'};"></div></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h4>Surveys</h4></div>
        <div class="table-responsive">
          <table>
            <thead><tr><th>Survey Title</th><th>Created</th><th>Deadline</th><th>Responses</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${surveys.length ? surveys.map(s => `<tr>
                <td style="font-weight:500">${s.title}</td>
                <td>${s.createdAt?.split('T')[0] || '—'}</td>
                <td>${s.deadline || '—'}</td>
                <td>${s.responses || 0}</td>
                <td><span class="badge badge-${s.status === 'Active' ? 'success' : 'gray'}">${s.status}</span></td>
                <td>
                  <button class="btn-icon" title="View Results" onclick="Engagement.viewResults(${s.id})"><i class="fas fa-chart-bar"></i></button>
                  <button class="btn-icon text-danger" onclick="Engagement.deleteSurvey(${s.id})"><i class="fas fa-trash"></i></button>
                </td>
              </tr>`).join('') : `
                <tr><td colspan="6" class="text-center" style="padding:24px;">
                  <div style="color:var(--gray-500)">No surveys created yet.</div>
                  <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="Engagement.createSurvey()"><i class="fas fa-plus"></i> Create Your First Survey</button>
                </td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  createSurvey: function () {
    const html = `
      <div class="card" style="width:100%;max-width:520px;margin:auto;">
        <div class="card-header"><h4>Create Pulse Survey</h4><button class="btn btn-outline btn-sm" onclick="closeModal('surveyModal')"><i class="fas fa-times"></i></button></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Survey Title</label><input type="text" id="sv_title" class="form-control" placeholder="e.g. Q1 Engagement Pulse"></div>
          <div class="form-group"><label class="form-label">Deadline</label><input type="date" id="sv_deadline" class="form-control"></div>
          <div class="form-group"><label class="form-label">Questions (one per line)</label><textarea id="sv_questions" class="form-control" rows="5" placeholder="How satisfied are you with your work environment?&#10;Would you recommend this company to a friend? (0-10)&#10;Do you feel valued by your manager?"></textarea></div>
          <button class="btn btn-primary" style="width:100%" onclick="Engagement.saveSurvey()">Launch Survey</button>
        </div>
      </div>`;
    window.showModal('surveyModal', html);
  },

  saveSurvey: function () {
    window.DB.surveys = window.DB.surveys || [];
    window.DB.surveys.unshift({
      id: Date.now(),
      title: document.getElementById('sv_title').value || 'Untitled Survey',
      deadline: document.getElementById('sv_deadline').value,
      questions: document.getElementById('sv_questions').value.split('\n').filter(Boolean),
      status: 'Active', responses: 0,
      createdAt: new Date().toISOString()
    });
    window.DB.save();
    window.Toast.show('Survey launched! Employees will be notified.', 'success');
    closeModal('surveyModal');
    this.render(document.getElementById('content'));
  },

  viewResults: function (id) {
    const s = (window.DB.surveys || []).find(s => s.id === id);
    if (!s) return;
    window.Toast.show(`${s.title} — ${s.responses} responses received`, 'info');
  },

  deleteSurvey: function (id) {
    window.DB.surveys = (window.DB.surveys || []).filter(s => s.id !== id);
    window.DB.save();
    this.render(document.getElementById('content'));
  }
};

window.renderEngagement = function (container) { Engagement.render(container); };
