// Offline Connectivity Check
function updateOnlineStatus() {
  const indicator = document.getElementById('offline-indicator');
  if (indicator) indicator.style.display = navigator.onLine ? 'none' : 'block';
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
document.addEventListener('DOMContentLoaded', updateOnlineStatus);

// Navigation and Page Loading System

let currentPage = 'dashboard';
let pageHistory = [];

// ── Page title mapping ───────────────────────────────────────────────────────
const pageTitles = {
  dashboard: 'Dashboard',
  profile: 'My Profile',
  employeeportal: 'Employee Portal',
  companies: 'Companies',
  employees: 'Employees',
  orgchart: 'Organization Chart',
  contracts: 'Employment Contracts',      // ← NEW
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
  shifts: 'Shift Scheduling',
  performance: 'Performance Management',
  training: 'Training & Development',
  succession: 'Succession Planning',
  documents: 'Document Management',
  departments: 'Department / Position',
  engagement: 'Employee Engagement',
  analytics: 'Analytics',
  integrations: 'System Integrations',
  reports: 'Reports & Analytics',
  settings: 'System Settings',
  lettergenerator: 'Letter Generator',
  audit: 'Audit Log',
  calendar: 'Payroll Calendar',
  import: 'Employee Import'
};

// ── Load a page ──────────────────────────────────────────────────────────────
function loadPage(page) {
  if (window.Auth && !window.Auth.hasPermission(page)) {
    window.Toast.show('Access Denied: Insufficient permissions', 'error');
    return;
  }

  pageHistory.push(currentPage);
  if (pageHistory.length > 10) pageHistory.shift();

  currentPage = page;

  // Update nav highlight
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.nav-link[data-page="${page}"]`)?.classList.add('active');

  // Update topbar title
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;

  // Update breadcrumb
  updateBreadcrumb(page, pageTitles[page]);

  // Loading skeleton
  const content = document.getElementById('content');
  content.innerHTML = `
    <div style="display: grid; gap: 24px;">
      <div class="skeleton" style="height: 50px; width: 300px;"></div>
      <div class="skeleton" style="height: 200px;"></div>
      <div class="skeleton" style="height: 400px;"></div>
    </div>
  `;

  setTimeout(() => renderPage(page), 300);
}

// ── Update breadcrumb ────────────────────────────────────────────────────────
function updateBreadcrumb(page, title) {
  const breadcrumb = document.getElementById('breadcrumb');
  const pages = [
    { id: 'dashboard', title: 'Dashboard' },
    { id: page, title: title }
  ];

  breadcrumb.innerHTML = pages.map((p, i) => `
    ${i > 0 ? '<span class="breadcrumb-separator">/</span>' : ''}
    ${i === pages.length - 1
      ? `<span>${p.title}</span>`
      : `<a href="#" onclick="loadPage('${p.id}')">${p.title}</a>`
    }
  `).join('');
}

// ── Render page content ──────────────────────────────────────────────────────
function renderPage(page) {
  const content = document.getElementById('content');

  // Module function map
  const funcMap = {
    'dashboard': 'renderDashboard',
    'profile': 'renderProfile',
    'employeeportal': 'renderEmployeePortal',
    'companies': 'renderCompanies',
    'employees': 'renderEmployees',
    'orgchart': 'renderOrgchart',
    'contracts': 'renderContracts',          // ← NEW
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
    'shifts': 'renderShifts',
    'performance': 'renderPerformance',
    'advancedperformance': 'renderAdvancedPerformance',
    'training': 'renderTraining',
    'succession': 'renderSuccession',
    'documents': 'renderDocuments',
    'departments': 'renderDepartments',
    'engagement': 'renderEngagement',
    'reports': 'renderReports',
    'analytics': 'renderAnalytics',
    'settings': 'renderSettings',
    'lettergenerator': 'LetterGenerator.render.bind(LetterGenerator)',
    'orgchart': 'OrgChart.render.bind(OrgChart)',
    'audit': 'AuditLog.render.bind(AuditLog)',
    'calendar': 'PayrollCalendar.render.bind(PayrollCalendar)',
    'import': 'EmployeeImport.render.bind(EmployeeImport)'
  };

  const renderFuncName = funcMap[page];

  // Safely resolve the render function (replaces eval)
  let renderFunction;
  if (typeof renderFuncName === 'string') {
    if (renderFuncName.includes('.')) {
      const parts = renderFuncName.split('.');
      let obj = window;
      for (const p of parts) {
        if (p.includes('bind')) {
          // If it ends in .bind(Obj), extract it
          const match = p.match(/^(\w+)\.bind\((\w+)\)$/);
          if (match) {
            const [_, method, context] = match;
            if (obj[method] && window[context]) {
              renderFunction = obj[method].bind(window[context]);
            }
            break;
          }
        }
        obj = obj[p];
        if (!obj) break;
      }
      if (!renderFunction) renderFunction = obj;
    } else {
      renderFunction = window[renderFuncName];
    }
  } else {
    renderFunction = renderFuncName;
  }

  if (typeof renderFunction === 'function') {
    try {
      renderFunction(content);
    } catch (error) {
      console.error(`Error rendering page ${page}:`, error);
      content.innerHTML = `
        <div class="alert alert-danger">
          <h4>Error Loading Page</h4>
          <p>There was an error loading this page. Please try again.</p>
          <pre style="font-size:0.8rem;margin-top:8px;">${error.message}</pre>
        </div>
      `;
    }
  } else {
    // Fallback — module not yet loaded or page under construction
    content.innerHTML = `
      <div style="text-align: center; padding: 64px 24px;">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--gray-100);
                    display:flex;align-items:center;justify-content:center;
                    font-size:1.8rem;color:var(--gray-400);margin:0 auto 20px;">
          <i class="fas fa-tools"></i>
        </div>
        <h3 style="margin-bottom:8px;color:var(--gray-700);">
          ${pageTitles[page] || page}
        </h3>
        <p style="color: var(--gray-500); margin-bottom:24px;">
          This module is currently being built.
        </p>
        <button class="btn btn-primary" onclick="loadPage('dashboard')">
          <i class="fas fa-home"></i> Return to Dashboard
        </button>
      </div>
    `;
  }
}

// ── Go back ──────────────────────────────────────────────────────────────────
function goBack() {
  if (pageHistory.length > 0) {
    loadPage(pageHistory.pop());
  }
}

// ── Wire up nav links on DOM ready ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      loadPage(this.getAttribute('data-page'));
    });
  });
});

// ── Exports ──────────────────────────────────────────────────────────────────
window.loadPage = loadPage;
window.goBack = goBack;
window.renderPage = renderPage;
window.updateBreadcrumb = updateBreadcrumb;

// ── Global Error Boundary ───────────────────────────────────────────────────
window.onerror = function (message, source, lineno, colno, error) {
  console.error('Captured Global Error:', message, error);
  if (window.Toast) {
    window.Toast.show(`An unexpected error occurred: ${message}`, 'danger');
  }
  return false;
};

window.onunhandledrejection = function (event) {
  console.error('Unhandled Promise Rejection:', event.reason);
  if (window.Toast) {
    window.Toast.show(`Network or system error: ${event.reason.message || 'Action failed'}`, 'warning');
  }
};