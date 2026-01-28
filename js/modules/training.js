const Training = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Training & Development</h2>
          <div style="color: var(--gray-500);">Learning Management System (LMS)</div>
        </div>
        <button class="btn btn-primary">
          <i class="fas fa-plus"></i> Add Course
        </button>
      </div>

      <div class="search-box" style="margin-bottom: 24px;">
         <input type="text" class="search-input" placeholder="Search for courses...">
      </div>

      <div class="grid-3">
        ${window.DB.training.courses.map(course => `
          <div class="card" style="display: flex; flex-direction: column;">
            <div style="height: 120px; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); display: flex; align-items: center; justify-content: center; color: white;">
               <i class="fas fa-graduation-cap" style="font-size: 3rem; opacity: 0.5;"></i>
            </div>
            <div class="card-body" style="flex: 1; display: flex; flex-direction: column;">
               <span class="badge badge-info" style="align-self: start; margin-bottom: 8px;">${course.category}</span>
               <h4 style="margin-bottom: 8px;">${course.title}</h4>
               <div style="color: var(--gray-500); font-size: 0.9rem; margin-bottom: 16px;">
                  <i class="fas fa-clock"></i> ${course.duration} • ${course.provider}
               </div>
               <div style="margin-top: auto; display: flex; align-items: center; justify-content: space-between;">
                  <div style="font-size: 0.85rem; color: var(--gray-600);"><i class="fas fa-user-friends"></i> ${course.enrolled} Enrolled</div>
                  <button class="btn btn-sm btn-outline">Enroll</button>
               </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    container.innerHTML = html;
  }
};

window.renderTraining = function (container) {
  Training.render(container);
};
