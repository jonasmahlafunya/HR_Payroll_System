// Navigation and Page Loading System

let currentPage = 'dashboard';
let pageHistory = [];

// Page title mapping
const pageTitles = {
  dashboard: 'Dashboard',
  profile: 'My Profile',
  employeeportal: 'Employee Portal',
  companies: 'Companies',
  employees: 'Employees',
  orgchart: 'Organization Chart',
  recruitment: 'Recruitment',
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',
  payroll: 'Payroll',
  advancedpayroll: 'Advanced Payroll',
  payslips: 'Payslips',
  benefits: 'Benefits',
  taxcompliance: 'Tax Compliance',
  timeattendance: 'Time & Attendance',
  leave: 'Leave Management',
  shiftscheduling: 'Shift Scheduling',
  performance: 'Performance Management',
  advancedperformance: 'Advanced Performance',
  training: 'Training & Development',
  succession: 'Succession Planning',
  documents: 'Document Management',
  engagement: 'Employee Engagement',
  reports: 'Reports & Analytics',
  advancedanalytics: 'Advanced Analytics',
  integrations: 'System Integrations',
  settings: 'Settings'
};

// Load a page
function loadPage(page) {
  if (currentPage === page) return;

  // Add to history
  pageHistory.push(currentPage);
  if (pageHistory.length > 10) pageHistory.shift();

  currentPage = page;

  // Update navigation
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.nav-link[data-page="${page}"]`)?.classList.add('active');

  // Update page title
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;

  // Update breadcrumb
  updateBreadcrumb(page, pageTitles[page]);

  // Show loading skeleton
  const content = document.getElementById('content');
  content.innerHTML = `
    <div style="display: grid; gap: 24px;">
      <div class="skeleton" style="height: 50px; width: 300px;"></div>
      <div class="skeleton" style="height: 200px;"></div>
      <div class="skeleton" style="height: 400px;"></div>
    </div>
  `;

  // Load page content with delay for smooth transition
  setTimeout(() => {
    renderPage(page);
  }, 300);
}

// Update breadcrumb
function updateBreadcrumb(page, title) {
  const breadcrumb = document.getElementById('breadcrumb');
  const pages = [
    { id: 'dashboard', title: 'Dashboard' },
    { id: page, title: title }
  ];

  breadcrumb.innerHTML = pages.map((p, i) => `
    ${i > 0 ? '<span class="breadcrumb-separator">/</span>' : ''}
    ${i === pages.length - 1 ?
      `<span>${p.title}</span>` :
      `<a href="#" onclick="loadPage('${p.id}')">${p.title}</a>`
    }
  `).join('');
}

// Render page content
// Render page content
function renderPage(page) {
  const content = document.getElementById('content');

  // Module mapping
  // Convert page name to PascalCase for function name (e.g. 'dashboard' -> 'Dashboard')
  // Special cases mapping
  const funcMap = {
    'dashboard': 'renderDashboard',
    'profile': 'renderProfile',
    'employeeportal': 'renderEmployeePortal',
    'companies': 'renderCompanies',
    'employees': 'renderEmployees',
    'recruitment': 'renderRecruitment',
    'onboarding': 'renderOnboarding',
    'offboarding': 'renderOffboarding',
    'payroll': 'renderPayroll',
    'advancedpayroll': 'renderAdvancedPayroll',
    'payslips': 'renderPayslips',
    'benefits': 'renderBenefits',
    'taxcompliance': 'renderTaxCompliance',
    'timeattendance': 'renderTimeAttendance',
    'leave': 'renderLeave',
    'shiftscheduling': 'renderShiftScheduling',
    'performance': 'renderPerformance',
    'advancedperformance': 'renderAdvancedPerformance',
    'training': 'renderTraining',
    'succession': 'renderSuccession',
    'documents': 'renderDocuments',
    'engagement': 'renderEngagement',
    'reports': 'renderReports',
    'advancedanalytics': 'renderAdvancedAnalytics',
    'settings': 'renderSettings'
  };

  const renderFuncName = funcMap[page];
  const renderFunction = window[renderFuncName];

  if (typeof renderFunction === 'function') {
    try {
      renderFunction(content);
    } catch (error) {
      console.error(`Error rendering page ${page}:`, error);
      content.innerHTML = `
        <div class="alert alert-danger">
          <h4>Error Loading Page</h4>
          <p>There was an error loading this page. Please try again later.</p>
          <pre>${error.message}</pre>
        </div>
      `;
    }
  } else {
    // Fallback for missing modules
    if (page === 'payroll' && window.renderPayroll) {
      window.renderPayroll(content);
    } else {
      content.innerHTML = `
        <div style="text-align: center; padding: 48px;">
          <i class="fas fa-tools" style="font-size: 3rem; color: var(--gray-400); margin-bottom: 16px;"></i>
          <h3>Page Under Construction</h3>
          <p style="color: var(--gray-600);">The ${pageTitles[page] || page} module is currently being built.</p>
          <button class="btn btn-primary" onclick="loadPage('dashboard')" style="margin-top: 16px;">
            Return to Dashboard
          </button>
        </div>
      `;
    }
  }
}

// Go back to previous page
function goBack() {
  if (pageHistory.length > 0) {
    const previousPage = pageHistory.pop();
    loadPage(previousPage);
  }
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', function () {
  // Add click events to nav links
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      loadPage(this.getAttribute('data-page'));
    });
  });
});

// Export navigation functions
window.loadPage = loadPage;
window.goBack = goBack;
window.renderPage = renderPage;
window.updateBreadcrumb = updateBreadcrumb;