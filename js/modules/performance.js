// ─── Performance Module ───────────────────────────────────────────────────────
const Performance = {

  render: function (container) {
    const perf      = window.DB.performance || { reviews: [], goals: [] };
    const employees = window.DB.employees   || [];
    const reviews   = perf.reviews          || [];
    const goals     = perf.goals            || [];

    const activeEmps = employees.filter(e => e.status !== 'Terminated');

    // Stats
    const avgRating   = reviews.length
      ? (reviews.reduce((s, r) => s + (r.overallRating || 0), 0) / reviews.length).toFixed(1)
      : '—';
    const goalsOpen   = goals.filter(g => g.status === 'In Progress' || g.status === 'Not Started').length;
    const goalsDone   = goals.filter(g => g.status === 'Completed').length;

    const activeTab = window._perfTab || 'overview';

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:1.25rem;margin:0;">Performance Management</h2>
          <div style="color:var(--gray-500);font-size:0.82rem;">
            Goal tracking, performance reviews &amp; employee ratings
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="Performance.addGoalModal()">
            <i class="fas fa-bullseye"></i> New Goal
          </button>
          <button class="btn btn-primary btn-sm" onclick="Performance.addReviewModal()">
            <i class="fas fa-star"></i> New Review
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid-4" style="gap:12px;margin-bottom:20px;">
        <div class="card" style="padding:14px;border-left:4px solid var(--primary);">
          <div style="font-size:0.68rem;text-transform:uppercase;color:var(--gray-400);margin-bottom:4px;">Employees Reviewed</div>
          <div style="font-size:1.6rem;font-weight:800;">${reviews.length}</div>
          <div style="font-size:0.72rem;color:var(--gray-500);">Total reviews</div>
        </div>
        <div class="card" style="padding:14px;border-left:4px solid var(--success);">
          <div style="font-size:0.68rem;text-transform:uppercase;color:var(--gray-400);margin-bottom:4px;">Average Rating</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--success);">${avgRating}</div>
          <div style="font-size:0.72rem;color:var(--gray-500);">Out of 5.0</div>
        </div>
        <div class="card" style="padding:14px;border-left:4px solid var(--warning);">
          <div style="font-size:0.68rem;text-transform:uppercase;color:var(--gray-400);margin-bottom:4px;">Active Goals</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--warning);">${goalsOpen}</div>
          <div style="font-size:0.72rem;color:var(--gray-500);">${goalsDone} completed</div>
        </div>
        <div class="card" style="padding:14px;border-left:4px solid var(--info);">
          <div style="font-size:0.68rem;text-transform:uppercase;color:var(--gray-400);margin-bottom:4px;">Due for Review</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--info);">${this._dueForReview(activeEmps, reviews)}</div>
          <div style="font-size:0.72rem;color:var(--gray-500);">No review in 6+ months</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="border-bottom:1px solid var(--gray-200);margin-bottom:16px;">
        <button class="tab-btn ${activeTab==='overview'?'active':''}" onclick="window._perfTab='overview';Performance.render(document.getElementById('content'))">
          <i class="fas fa-chart-bar"></i> Overview
        </button>
        <button class="tab-btn ${activeTab==='goals'?'active':''}" onclick="window._perfTab='goals';Performance.render(document.getElementById('content'))">
          <i class="fas fa-bullseye"></i> Goals (${goals.length})
        </button>
        <button class="tab-btn ${activeTab==='reviews'?'active':''}" onclick="window._perfTab='reviews';Performance.render(document.getElementById('content'))">
          <i class="fas fa-star"></i> Reviews (${reviews.length})
        </button>
        <button class="tab-btn ${activeTab==='ratings'?'active':''}" onclick="window._perfTab='ratings';Performance.render(document.getElementById('content'))">
          <i class="fas fa-users"></i> Employee Ratings
        </button>
      </div>

      <div id="perfTabContent">
        ${activeTab === 'overview'  ? this.renderOverview(reviews, goals, employees)     : ''}
        ${activeTab === 'goals'     ? this.renderGoals(goals, employees)                  : ''}
        ${activeTab === 'reviews'   ? this.renderReviews(reviews, employees)              : ''}
        ${activeTab === 'ratings'   ? this.renderRatings(reviews, employees, activeEmps)  : ''}
      </div>`;
  },

  renderOverview: function (reviews, goals, employees) {
    const now = new Date();
    const recent = reviews.slice(-5).reverse();

    // Goal status breakdown
    const statusBreakdown = {
      'Completed':   goals.filter(g=>g.status==='Completed').length,
      'In Progress': goals.filter(g=>g.status==='In Progress').length,
      'Not Started': goals.filter(g=>g.status==='Not Started').length,
      'Overdue':     goals.filter(g=>{
        if (g.status==='Completed') return false;
        return g.dueDate && new Date(g.dueDate) < now;
      }).length
    };

    // Rating distribution
    const ratingBuckets = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    reviews.forEach(r => {
      const rounded = Math.round(r.overallRating || 0);
      if (rounded >= 1 && rounded <= 5) ratingBuckets[String(rounded)]++;
    });

    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <!-- Goal status -->
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i class="fas fa-bullseye text-warning"></i> Goal Status</h3></div>
          <div class="card-body">
            ${Object.entries(statusBreakdown).map(([status, count]) => {
              const color = status==='Completed'?'success':status==='Overdue'?'danger':status==='In Progress'?'primary':'gray';
              const total = goals.length || 1;
              const pct   = Math.round((count/total)*100);
              return `
                <div style="margin-bottom:12px;">
                  <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
                    <span style="font-weight:500;">${status}</span>
                    <span style="color:var(--gray-500);">${count} (${pct}%)</span>
                  </div>
                  <div style="height:6px;background:var(--gray-100);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:var(--${color});border-radius:99px;"></div>
                  </div>
                </div>`;
            }).join('')}
            ${!goals.length ? '<div style="color:var(--gray-400);text-align:center;padding:16px;">No goals set yet</div>' : ''}
          </div>
        </div>

        <!-- Rating distribution -->
        <div class="card">
          <div class="card-header"><h3 class="card-title"><i class="fas fa-star text-warning"></i> Rating Distribution</h3></div>
          <div class="card-body">
            ${['5','4','3','2','1'].map(star => {
              const count = ratingBuckets[star];
              const pct   = reviews.length ? Math.round((count/reviews.length)*100) : 0;
              return `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                  <div style="width:14px;font-size:0.75rem;font-weight:600;text-align:right;">${star}</div>
                  <i class="fas fa-star" style="color:#f59e0b;font-size:0.7rem;"></i>
                  <div style="flex:1;height:8px;background:var(--gray-100);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:#f59e0b;border-radius:99px;"></div>
                  </div>
                  <div style="width:28px;font-size:0.72rem;color:var(--gray-500);">${count}</div>
                </div>`;
            }).join('')}
            ${!reviews.length ? '<div style="color:var(--gray-400);text-align:center;padding:16px;">No reviews yet</div>' : ''}
          </div>
        </div>
      </div>

      <!-- Recent reviews -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-history text-info"></i> Recent Reviews</h3>
          <button class="btn btn-outline btn-xs" onclick="window._perfTab='reviews';Performance.render(document.getElementById('content'))">View All</button>
        </div>
        <div class="card-body" style="padding:0;">
          ${recent.length ? recent.map(r => {
            const emp = (window.DB.employees||[]).find(e=>e.id==r.employeeId);
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--gray-100);">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-soft);
                            color:var(--primary);display:flex;align-items:center;justify-content:center;
                            font-weight:700;font-size:0.72rem;flex-shrink:0;">
                  ${emp ? emp.firstName.charAt(0)+emp.lastName.charAt(0) : '?'}
                </div>
                <div style="flex:1;">
                  <div style="font-size:0.85rem;font-weight:600;">${emp ? emp.firstName+' '+emp.lastName : 'Unknown'}</div>
                  <div style="font-size:0.72rem;color:var(--gray-500);">${r.period||'—'} &bull; ${r.reviewer||'Manager'}</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:1.1rem;font-weight:700;color:${r.overallRating>=4?'var(--success)':r.overallRating>=3?'var(--warning)':'var(--danger)'};">
                    ${(r.overallRating||0).toFixed(1)}
                  </div>
                  <div style="font-size:0.62rem;color:var(--gray-400);">/ 5.0</div>
                </div>
                <div>${this._starRating(r.overallRating||0)}</div>
              </div>`;
          }).join('') : `<div style="padding:40px;text-align:center;color:var(--gray-400);">No reviews yet</div>`}
        </div>
      </div>`;
  },

  renderGoals: function (goals, employees) {
    if (!goals.length) return `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-bullseye"></i></div>
        <div class="empty-state-title">No Goals Set</div>
        <div class="empty-state-desc">Set performance goals for employees to track their progress.</div>
        <button class="btn btn-primary btn-sm" style="margin-top:16px;" onclick="Performance.addGoalModal()">
          <i class="fas fa-plus"></i> Add Goal
        </button>
      </div>`;

    const now = new Date();
    return `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Goal</th>
              <th>Category</th>
              <th>Due Date</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${goals.map(g => {
              const emp = employees.find(e => e.id == g.employeeId);
              const isOverdue = g.status !== 'Completed' && g.dueDate && new Date(g.dueDate) < now;
              const status = isOverdue ? 'Overdue' : (g.status || 'Not Started');
              const statusColor = { Completed:'success', 'In Progress':'primary', 'Not Started':'gray', Overdue:'danger' };
              const prog = g.progress || 0;
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div style="width:28px;height:28px;border-radius:50%;background:var(--primary-soft);
                                  color:var(--primary);display:flex;align-items:center;justify-content:center;
                                  font-size:0.68rem;font-weight:700;flex-shrink:0;">
                        ${emp ? emp.firstName.charAt(0)+emp.lastName.charAt(0) : '?'}
                      </div>
                      <div style="font-size:0.82rem;font-weight:500;">
                        ${emp ? emp.firstName+' '+emp.lastName : 'Unknown'}
                      </div>
                    </div>
                  </td>
                  <td style="max-width:200px;">
                    <div style="font-size:0.82rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${g.title||'—'}
                    </div>
                    ${g.description ? `<div style="font-size:0.7rem;color:var(--gray-500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${g.description}</div>` : ''}
                  </td>
                  <td>
                    <span class="badge badge-info" style="font-size:0.65rem;">${g.category||'General'}</span>
                  </td>
                  <td style="font-size:0.8rem;${isOverdue?'color:var(--danger);font-weight:600;':''}">${g.dueDate||'—'}</td>
                  <td style="min-width:100px;">
                    <div style="font-size:0.7rem;color:var(--gray-500);margin-bottom:3px;">${prog}%</div>
                    <div style="height:5px;background:var(--gray-100);border-radius:99px;overflow:hidden;">
                      <div style="height:100%;width:${prog}%;background:${prog>=100?'var(--success)':prog>=50?'var(--primary)':'var(--warning)'};border-radius:99px;"></div>
                    </div>
                  </td>
                  <td>
                    <span class="badge badge-${statusColor[status]||'gray'}">${status}</span>
                  </td>
                  <td>
                    <div style="display:flex;gap:4px;">
                      <button class="btn-icon" title="Update Progress" onclick="Performance.updateGoalProgress('${g.id}')">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn-icon" title="Mark Complete" onclick="Performance.completeGoal('${g.id}')"
                        style="${status==='Completed'?'opacity:0.3;cursor:default;':''}">
                        <i class="fas fa-check"></i>
                      </button>
                      <button class="btn-icon" title="Delete" style="color:var(--danger);"
                        onclick="Performance.deleteGoal('${g.id}')">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  renderReviews: function (reviews, employees) {
    if (!reviews.length) return `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-star"></i></div>
        <div class="empty-state-title">No Reviews Yet</div>
        <div class="empty-state-desc">Conduct performance reviews to evaluate and develop your team.</div>
        <button class="btn btn-primary btn-sm" style="margin-top:16px;" onclick="Performance.addReviewModal()">
          <i class="fas fa-plus"></i> Add Review
        </button>
      </div>`;

    return `
      <div class="grid-auto" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;">
        ${reviews.map(r => {
          const emp = employees.find(e => e.id == r.employeeId);
          const rating = r.overallRating || 0;
          const ratingColor = rating >= 4 ? 'var(--success)' : rating >= 3 ? 'var(--warning)' : 'var(--danger)';

          return `
            <div class="card" style="padding:0;overflow:hidden;">
              <div style="padding:14px 16px;border-bottom:1px solid var(--gray-100);">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:38px;height:38px;border-radius:50%;background:var(--primary-soft);
                              color:var(--primary);display:flex;align-items:center;justify-content:center;
                              font-weight:700;font-size:0.8rem;flex-shrink:0;">
                    ${emp ? emp.firstName.charAt(0)+emp.lastName.charAt(0) : '?'}
                  </div>
                  <div>
                    <div style="font-weight:600;font-size:0.88rem;">
                      ${emp ? emp.firstName+' '+emp.lastName : 'Unknown Employee'}
                    </div>
                    <div style="font-size:0.72rem;color:var(--gray-500);">
                      ${emp?.position||'—'} &bull; ${r.period||'—'}
                    </div>
                  </div>
                  <div style="margin-left:auto;text-align:center;">
                    <div style="font-size:1.4rem;font-weight:800;color:${ratingColor};">${rating.toFixed(1)}</div>
                    <div style="font-size:0.6rem;color:var(--gray-400);">/ 5.0</div>
                  </div>
                </div>
              </div>

              <div style="padding:12px 16px;">
                <div style="margin-bottom:10px;">${this._starRating(rating)}</div>

                ${['performance','communication','teamwork','leadership','initiative'].map(cat => {
                  const val = r[cat+'Rating'] || r[cat] || 0;
                  if (!val) return '';
                  return `
                    <div style="margin-bottom:6px;">
                      <div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:2px;">
                        <span style="text-transform:capitalize;color:var(--gray-600);">${cat}</span>
                        <span style="font-weight:600;">${val}/5</span>
                      </div>
                      <div style="height:4px;background:var(--gray-100);border-radius:99px;overflow:hidden;">
                        <div style="height:100%;width:${(val/5)*100}%;background:var(--primary);border-radius:99px;"></div>
                      </div>
                    </div>`;
                }).join('')}

                ${r.notes ? `
                  <div style="margin-top:10px;padding:8px;background:var(--gray-50);border-radius:6px;
                              font-size:0.75rem;color:var(--gray-600);font-style:italic;">
                    "${r.notes}"
                  </div>` : ''}

                <div style="margin-top:10px;font-size:0.68rem;color:var(--gray-400);">
                  Reviewed by: ${r.reviewer||'Manager'} &bull; ${r.reviewDate||'—'}
                </div>
              </div>

              <div style="padding:8px 12px;border-top:1px solid var(--gray-100);
                          display:flex;justify-content:flex-end;gap:6px;">
                <button class="btn btn-xs btn-outline" onclick="Performance.editReview('${r.id}')">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-xs btn-outline" style="color:var(--danger);"
                  onclick="Performance.deleteReview('${r.id}')">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  renderRatings: function (reviews, employees, activeEmps) {
    // Build per-employee aggregated ratings
    const empRatings = activeEmps.map(emp => {
      const empReviews = reviews.filter(r => r.employeeId == emp.id);
      const avg = empReviews.length
        ? empReviews.reduce((s,r) => s + (r.overallRating||0), 0) / empReviews.length
        : null;
      const last = empReviews[empReviews.length - 1];
      return { emp, avg, reviewCount: empReviews.length, last };
    }).sort((a, b) => (b.avg||0) - (a.avg||0));

    if (!activeEmps.length) return `
      <div class="empty-state"><div class="empty-state-title">No employees found</div></div>`;

    return `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Reviews</th>
              <th>Average Rating</th>
              <th>Last Review</th>
              <th>Performance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${empRatings.map(({ emp, avg, reviewCount, last }) => {
              const label = avg === null ? 'No Review'
                : avg >= 4.5 ? 'Excellent'
                : avg >= 3.5 ? 'Good'
                : avg >= 2.5 ? 'Average'
                : 'Needs Improvement';
              const labelColor = avg === null ? 'gray'
                : avg >= 4.5 ? 'success' : avg >= 3.5 ? 'primary' : avg >= 2.5 ? 'warning' : 'danger';
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div style="width:30px;height:30px;border-radius:50%;background:var(--primary-soft);
                                  color:var(--primary);display:flex;align-items:center;justify-content:center;
                                  font-size:0.68rem;font-weight:700;flex-shrink:0;">
                        ${emp.firstName.charAt(0)+emp.lastName.charAt(0)}
                      </div>
                      <div>
                        <div style="font-size:0.83rem;font-weight:600;">${emp.firstName} ${emp.lastName}</div>
                        <div style="font-size:0.7rem;color:var(--gray-500);">${emp.position||'—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style="font-size:0.8rem;">${emp.department||'—'}</td>
                  <td style="text-align:center;">${reviewCount}</td>
                  <td style="text-align:center;">
                    ${avg !== null ? `
                      <div style="font-size:1rem;font-weight:700;color:${avg>=4?'var(--success)':avg>=3?'var(--warning)':'var(--danger)'};">
                        ${avg.toFixed(1)}
                      </div>
                      <div>${this._starRating(avg, true)}</div>` : `
                      <span style="color:var(--gray-400);font-size:0.8rem;">Not reviewed</span>`}
                  </td>
                  <td style="font-size:0.78rem;">${last?.reviewDate||last?.period||'—'}</td>
                  <td><span class="badge badge-${labelColor}">${label}</span></td>
                  <td>
                    <button class="btn btn-xs btn-primary" onclick="Performance.addReviewModal(${emp.id})">
                      <i class="fas fa-star"></i> Review
                    </button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  },

  // ── Modals ─────────────────────────────────────────────────────────────────
  addGoalModal: function (preEmpId) {
    const employees = (window.DB.employees||[]).filter(e=>e.status!=='Terminated');
    const html = `
      <div class="card" style="width:100%;max-width:540px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-bullseye text-warning"></i> Set Performance Goal</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addGoalModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Employee *</label>
            <select id="goal_emp" class="form-control">
              <option value="">— Select Employee —</option>
              ${employees.map(e=>`<option value="${e.id}" ${preEmpId==e.id?'selected':''}>${e.firstName} ${e.lastName}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Goal Title *</label>
            <input id="goal_title" class="form-control" placeholder="e.g. Increase sales by 20%"></div>
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Category</label>
              <select id="goal_category" class="form-control">
                <option>Performance</option><option>Skills Development</option>
                <option>Leadership</option><option>Customer Service</option>
                <option>Productivity</option><option>Compliance</option><option>Other</option>
              </select></div>
            <div class="form-group"><label class="form-label">Due Date</label>
              <input id="goal_due" type="date" class="form-control"></div>
          </div>
          <div class="form-group"><label class="form-label">Description / Key Results</label>
            <textarea id="goal_desc" class="form-control" rows="3" placeholder="Describe what success looks like..."></textarea></div>
          <div class="form-group"><label class="form-label">Initial Progress (%)</label>
            <input id="goal_progress" type="range" min="0" max="100" value="0" class="form-control"
              style="padding:0;" oninput="document.getElementById('goal_progress_val').textContent=this.value+'%'">
            <div id="goal_progress_val" style="font-size:0.75rem;text-align:center;color:var(--primary);">0%</div>
          </div>
          <button class="btn btn-primary" style="width:100%;" onclick="Performance.saveGoal()">
            <i class="fas fa-save"></i> Save Goal
          </button>
        </div>
      </div>`;
    window.showModal('addGoalModal', html);
  },

  saveGoal: function () {
    const empId = document.getElementById('goal_emp')?.value;
    const title = document.getElementById('goal_title')?.value?.trim();
    if (!empId || !title) { window.showAlert('Required', 'Please select an employee and enter a goal title.'); return; }

    const goal = {
      id:          'GOAL_' + Date.now(),
      employeeId:  parseInt(empId),
      title,
      category:    document.getElementById('goal_category')?.value || 'Performance',
      dueDate:     document.getElementById('goal_due')?.value || '',
      description: document.getElementById('goal_desc')?.value?.trim() || '',
      progress:    parseInt(document.getElementById('goal_progress')?.value || 0),
      status:      'Not Started',
      createdAt:   new Date().toISOString()
    };
    if (goal.progress > 0) goal.status = goal.progress >= 100 ? 'Completed' : 'In Progress';

    window.DB.performance = window.DB.performance || { reviews: [], goals: [] };
    window.DB.performance.goals = window.DB.performance.goals || [];
    window.DB.performance.goals.push(goal);
    window.DB.save();

    window.Toast.show('Goal saved!', 'success');
    window.closeModal('addGoalModal');
    this.render(document.getElementById('content'));
  },

  updateGoalProgress: function (goalId) {
    const goals = window.DB.performance?.goals || [];
    const goal  = goals.find(g => g.id === goalId);
    if (!goal) return;

    const html = `
      <div class="card" style="width:100%;max-width:420px;margin:auto;">
        <div class="card-header">
          <h3 class="card-title">Update Goal Progress</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('updateGoalModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div style="font-size:0.9rem;font-weight:600;margin-bottom:12px;">${goal.title}</div>
          <div class="form-group"><label class="form-label">Progress: <span id="progVal">${goal.progress||0}%</span></label>
            <input type="range" id="progressSlider" min="0" max="100" value="${goal.progress||0}"
              class="form-control" style="padding:0;"
              oninput="document.getElementById('progVal').textContent=this.value+'%'">
          </div>
          <div class="form-group"><label class="form-label">Status</label>
            <select id="goalStatus" class="form-control">
              <option value="Not Started" ${goal.status==='Not Started'?'selected':''}>Not Started</option>
              <option value="In Progress" ${goal.status==='In Progress'?'selected':''}>In Progress</option>
              <option value="Completed" ${goal.status==='Completed'?'selected':''}>Completed</option>
            </select></div>
          <button class="btn btn-primary" style="width:100%;" onclick="Performance._saveGoalProgress('${goalId}')">
            Update
          </button>
        </div>
      </div>`;
    window.showModal('updateGoalModal', html);
  },

  _saveGoalProgress: function (goalId) {
    const goal = (window.DB.performance?.goals||[]).find(g => g.id === goalId);
    if (!goal) return;
    goal.progress = parseInt(document.getElementById('progressSlider')?.value || goal.progress);
    goal.status   = document.getElementById('goalStatus')?.value || goal.status;
    window.DB.save();
    window.Toast.show('Goal updated', 'success');
    window.closeModal('updateGoalModal');
    this.render(document.getElementById('content'));
  },

  completeGoal: function (goalId) {
    const goal = (window.DB.performance?.goals||[]).find(g => g.id === goalId);
    if (!goal || goal.status === 'Completed') return;
    window.showConfirmation('Complete Goal', `Mark "<strong>${goal.title}</strong>" as completed?`, () => {
      goal.status   = 'Completed';
      goal.progress = 100;
      goal.completedAt = new Date().toISOString();
      window.DB.save();
      window.Toast.show('Goal marked as completed!', 'success');
      this.render(document.getElementById('content'));
    });
  },

  deleteGoal: function (goalId) {
    window.showConfirmation('Delete Goal', 'Delete this goal? This cannot be undone.', () => {
      window.DB.performance.goals = (window.DB.performance?.goals||[]).filter(g => g.id !== goalId);
      window.DB.save();
      window.Toast.show('Goal deleted', 'success');
      this.render(document.getElementById('content'));
    });
  },

  addReviewModal: function (preEmpId) {
    const employees = (window.DB.employees||[]).filter(e=>e.status!=='Terminated');
    const cu = window.currentUser;
    const today = new Date().toISOString().split('T')[0];

    const html = `
      <div class="card" style="width:100%;max-width:620px;margin:auto;max-height:92vh;overflow-y:auto;">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-star text-warning"></i> Performance Review</h3>
          <button class="btn btn-outline btn-sm" onclick="closeModal('addReviewModal')"><i class="fas fa-times"></i></button>
        </div>
        <div class="card-body">
          <div class="grid-2">
            <div class="form-group"><label class="form-label">Employee *</label>
              <select id="rev_emp" class="form-control">
                <option value="">— Select —</option>
                ${employees.map(e=>`<option value="${e.id}" ${preEmpId==e.id?'selected':''}>${e.firstName} ${e.lastName}</option>`).join('')}
              </select></div>
            <div class="form-group"><label class="form-label">Review Period</label>
              <select id="rev_period" class="form-control">
                ${['Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026','Annual 2025','Annual 2024']
                  .map(p=>`<option>${p}</option>`).join('')}
              </select></div>
            <div class="form-group"><label class="form-label">Reviewer</label>
              <input id="rev_reviewer" class="form-control" value="${cu?.name||'Manager'}"></div>
            <div class="form-group"><label class="form-label">Review Date</label>
              <input id="rev_date" type="date" class="form-control" value="${today}"></div>
          </div>

          <div style="font-size:0.8rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);
                      letter-spacing:0.5px;margin:16px 0 8px;">Performance Ratings (1=Poor, 5=Excellent)</div>
          <div class="grid-2">
            ${[
              ['performance', 'Overall Performance'],
              ['communication', 'Communication Skills'],
              ['teamwork', 'Teamwork & Collaboration'],
              ['leadership', 'Leadership & Initiative'],
              ['initiative', 'Problem Solving'],
            ].map(([key, label]) => `
              <div class="form-group">
                <label class="form-label">${label}: <span id="${key}_val" style="color:var(--primary);font-weight:700;">3</span>/5</label>
                <div style="display:flex;gap:6px;margin-top:4px;">
                  ${[1,2,3,4,5].map(n => `
                    <button type="button"
                      class="rating-star-btn"
                      data-key="${key}"
                      data-val="${n}"
                      style="width:32px;height:32px;border-radius:50%;border:2px solid var(--gray-200);
                             background:${n<=3?'var(--warning)':'white'};color:${n<=3?'white':'var(--gray-300)'};
                             cursor:pointer;font-size:0.72rem;font-weight:700;transition:all 0.15s;"
                      onclick="Performance._setRating('${key}', ${n})">
                      ${n}
                    </button>`).join('')}
                </div>
              </div>`).join('')}
          </div>

          <div class="form-group">
            <label class="form-label">Strengths</label>
            <textarea id="rev_strengths" class="form-control" rows="2"
              placeholder="What does this employee do well?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Areas for Improvement</label>
            <textarea id="rev_improvements" class="form-control" rows="2"
              placeholder="What should they work on?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Reviewer Notes</label>
            <textarea id="rev_notes" class="form-control" rows="2"
              placeholder="Additional comments..."></textarea>
          </div>

          <button class="btn btn-primary" style="width:100%;margin-top:8px;" onclick="Performance.saveReview()">
            <i class="fas fa-save"></i> Save Review
          </button>
        </div>
      </div>`;
    window.showModal('addReviewModal', html);

    // Init rating state
    window._reviewRatings = { performance:3, communication:3, teamwork:3, leadership:3, initiative:3 };
  },

  _setRating: function (key, val) {
    window._reviewRatings = window._reviewRatings || {};
    window._reviewRatings[key] = val;
    const valEl = document.getElementById(`${key}_val`);
    if (valEl) valEl.textContent = val;

    // Update star button styles
    document.querySelectorAll(`.rating-star-btn[data-key="${key}"]`).forEach(btn => {
      const n = parseInt(btn.dataset.val);
      btn.style.background = n <= val ? 'var(--warning)' : 'white';
      btn.style.color       = n <= val ? 'white' : 'var(--gray-300)';
      btn.style.borderColor = n <= val ? 'var(--warning)' : 'var(--gray-200)';
    });
  },

  saveReview: function () {
    const empId = document.getElementById('rev_emp')?.value;
    if (!empId) { window.showAlert('Required', 'Please select an employee.'); return; }

    const ratings = window._reviewRatings || {};
    const avg = Object.values(ratings).reduce((s,v)=>s+v,0) / Math.max(Object.values(ratings).length,1);

    const review = {
      id:           'REV_' + Date.now(),
      employeeId:   parseInt(empId),
      period:       document.getElementById('rev_period')?.value,
      reviewer:     document.getElementById('rev_reviewer')?.value?.trim() || 'Manager',
      reviewDate:   document.getElementById('rev_date')?.value || new Date().toISOString().split('T')[0],
      performanceRating:   ratings.performance   || 3,
      communicationRating: ratings.communication || 3,
      teamworkRating:      ratings.teamwork      || 3,
      leadershipRating:    ratings.leadership    || 3,
      initiativeRating:    ratings.initiative    || 3,
      overallRating:       Math.round(avg * 10) / 10,
      strengths:    document.getElementById('rev_strengths')?.value?.trim()   || '',
      improvements: document.getElementById('rev_improvements')?.value?.trim()|| '',
      notes:        document.getElementById('rev_notes')?.value?.trim()       || '',
      createdAt:    new Date().toISOString()
    };

    window.DB.performance = window.DB.performance || { reviews: [], goals: [] };
    window.DB.performance.reviews = window.DB.performance.reviews || [];
    window.DB.performance.reviews.push(review);
    window.DB.save();

    delete window._reviewRatings;
    window.Toast.show('Performance review saved!', 'success');
    window.closeModal('addReviewModal');
    this.render(document.getElementById('content'));
  },

  editReview: function (reviewId) {
    const review = (window.DB.performance?.reviews||[]).find(r => r.id === reviewId);
    if (!review) return;

    window.showConfirmation('Delete Review?',
      'Do you want to delete this review and create a new one?',
      () => { this.deleteReview(reviewId); });
  },

  deleteReview: function (reviewId) {
    window.showConfirmation('Delete Review', 'Delete this performance review?', () => {
      window.DB.performance.reviews = (window.DB.performance?.reviews||[]).filter(r => r.id !== reviewId);
      window.DB.save();
      window.Toast.show('Review deleted', 'success');
      this.render(document.getElementById('content'));
    });
  },

  // ── Helpers ────────────────────────────────────────────────────────────────
  _starRating: function (rating, small = false) {
    const size = small ? '0.65rem' : '0.8rem';
    const full  = Math.floor(rating);
    const half  = rating - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return `<div style="color:#f59e0b;font-size:${size};">
      ${'<i class="fas fa-star"></i>'.repeat(full)}
      ${half ? '<i class="fas fa-star-half-alt"></i>' : ''}
      ${'<i class="far fa-star"></i>'.repeat(empty)}
    </div>`;
  },

  _dueForReview: function (employees, reviews) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return employees.filter(emp => {
      const empReviews = reviews.filter(r => r.employeeId == emp.id);
      if (!empReviews.length) return true;
      const lastDate = new Date(empReviews[empReviews.length-1].reviewDate || empReviews[empReviews.length-1].createdAt);
      return lastDate < sixMonthsAgo;
    }).length;
  }
};

window._perfTab = window._perfTab || 'overview';

window.renderPerformance = function (container) {
  Performance.render(container);
};
window.Performance = Performance;