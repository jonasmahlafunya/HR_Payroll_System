const Documents = {
  render: function (container) {
    const html = `
      <div class="page-title-box" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Document Library</h2>
          <div style="color: var(--gray-500);">Centralized document repository</div>
        </div>
        <button class="btn btn-primary">
          <i class="fas fa-upload"></i> Upload Document
        </button>
      </div>

      <div class="grid-4" style="margin-bottom: 32px;">
         <div class="card" style="text-align: center; cursor: pointer; transition: var(--transition);">
            <div class="card-body">
              <i class="fas fa-folder" style="font-size: 3rem; color: #fbbf24; margin-bottom: 12px;"></i>
              <h4 style="font-size: 1rem;">Contracts</h4>
              <small style="color: var(--gray-500);">12 Files</small>
            </div>
         </div>
         <div class="card" style="text-align: center; cursor: pointer;">
            <div class="card-body">
              <i class="fas fa-folder" style="font-size: 3rem; color: #fbbf24; margin-bottom: 12px;"></i>
              <h4 style="font-size: 1rem;">Policies</h4>
              <small style="color: var(--gray-500);">5 Files</small>
            </div>
         </div>
         <div class="card" style="text-align: center; cursor: pointer;">
            <div class="card-body">
              <i class="fas fa-folder" style="font-size: 3rem; color: #fbbf24; margin-bottom: 12px;"></i>
              <h4 style="font-size: 1rem;">Tax Forms</h4>
              <small style="color: var(--gray-500);">25 Files</small>
            </div>
         </div>
         <div class="card" style="text-align: center; cursor: pointer;">
            <div class="card-body">
              <i class="fas fa-folder" style="font-size: 3rem; color: #fbbf24; margin-bottom: 12px;"></i>
              <h4 style="font-size: 1rem;">Reports</h4>
              <small style="color: var(--gray-500);">8 Files</small>
            </div>
         </div>
      </div>

      <div class="card">
        <div class="card-header">
           <h4 class="card-title">Recent Files</h4>
           <div class="search-box">
             <input type="text" class="search-input" placeholder="Search files...">
           </div>
        </div>
        <div class="table-responsive">
          <table>
             <thead>
               <tr>
                 <th>Name</th>
                 <th>Category</th>
                 <th>Size</th>
                 <th>Uploaded</th>
                 <th>Actions</th>
               </tr>
             </thead>
             <tbody>
               ${window.DB.documents.map(doc => `
                 <tr>
                   <td>
                     <div style="display: flex; align-items: center; gap: 12px;">
                       <i class="fas fa-file-pdf" style="font-size: 1.5rem; color: #ef4444;"></i>
                       ${doc.name}
                     </div>
                   </td>
                   <td><span class="badge badge-info">${doc.category}</span></td>
                   <td>${doc.size}</td>
                   <td>${doc.date}</td>
                   <td>
                     <button class="btn btn-sm btn-outline"><i class="fas fa-download"></i></button>
                     <button class="btn btn-sm btn-outline"><i class="fas fa-trash"></i></button>
                   </td>
                 </tr>
               `).join('')}
             </tbody>
          </table>
        </div>
      </div>
    `;
    container.innerHTML = html;
  }
};

window.renderDocuments = function (container) {
  Documents.render(container);
};
