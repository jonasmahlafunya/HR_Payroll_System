// ─────────────────────────────────────────────────────────────────────────────
// StorageManager — localStorage + MySQL sync
// ─────────────────────────────────────────────────────────────────────────────
const StorageManager = {
  KEY: 'hrpms_data_v2',

  save: function (data) {
    try {
      // Stamp save time so autoSync can compare freshness
      data._savedAt = Date.now();

      const toSave = Object.assign({}, data);

      // Strip ONLY employee photos (large base64 blobs) to keep JSON small.
      // Company logos are intentionally kept — they are needed for payslip
      // generation and are typically small (<50 KB). Stripping them causes
      // the logo to disappear after every page refresh.
      if (toSave.employees) {
        toSave.employees = toSave.employees.map(e => ({
          ...e, photo: e.photo?.startsWith('data:image') ? null : e.photo
        }));
      }

      const json = JSON.stringify(toSave);
      localStorage.setItem(this.KEY, json);
      console.log('[StorageManager] Saved to localStorage ✓');
      this.serverSave(json);
    } catch (e) {
      console.warn('[StorageManager] save failed:', e.message);
    }
  },

  serverSave: async function (jsonData) {
    try {
      const token = StorageManager._getToken();
      const res = await fetch('api/sync.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: jsonData
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        console.warn('[Sync] Non-JSON save response (HTTP', res.status, ')');
        return;
      }
      const result = await res.json().catch(() => ({}));
      if (result.status === 'success') {
        console.log('[Sync] Saved to MySQL ✓');
      } else if (result.status === 'db_unavailable') {
        console.warn('[Sync] DB unavailable — data is safe in localStorage.');
      } else if (result.error) {
        console.warn('[Sync] Save warning:', result.error);
      }
    } catch (err) {
      console.warn('[Sync] Server save skipped:', err.message);
    }
  },

  serverLoad: async function () {
    try {
      const token = StorageManager._getToken();
      const res = await fetch('api/sync.php', { headers: { 'X-Auth-Token': token } });
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) return null;
      const text = await res.text();
      if (!text?.trim()) return null;
      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { return null; }
      if (!parsed || parsed.status === 'empty' || parsed.status === 'db_unavailable' || parsed.error) return null;
      console.log('[Sync] Loaded from MySQL ✓');
      return parsed;
    } catch (err) {
      console.warn('[Sync] Load failed:', err.message);
      return null;
    }
  },

  load: function () {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  clearLegacy: function () {
    try { localStorage.removeItem('hrpms_data_v1'); } catch (_) { }
  },

  _getToken: function () {
    try {
      return localStorage.getItem('hrpms_token') || '';
    } catch (_) { return ''; }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// System defaults — NO demo records, only config & lookup tables
// ─────────────────────────────────────────────────────────────────────────────
const InitialData = {
  users: [
    { id: 1, username: 'admin', password: 'Changeme123!', role: 'Super Admin', name: 'Administrator', email: '', status: 'Active', lastLogin: '', permissions: ['all'] }
  ],
  roles: [
    { id: 1, name: 'Super Admin', description: 'Full system access', permissions: ['all'] },
    { id: 2, name: 'HR Manager', description: 'Employee and payroll data', permissions: ['employees.view', 'employees.edit', 'payroll.view', 'reports.view'] },
    { id: 3, name: 'Payroll Officer', description: 'Process payroll and tax', permissions: ['payroll.process', 'tax.view'] },
    { id: 4, name: 'Employee', description: 'Self-service access only', permissions: ['self.view'] }
  ],
  taxTables: [
    { year: '2025', min: 0, max: 237100, rate: 0.18, rebate: 0 },
    { year: '2025', min: 237101, max: 370500, rate: 0.26, rebate: 42678 },
    { year: '2025', min: 370501, max: 512800, rate: 0.31, rebate: 77362 },
    { year: '2025', min: 512801, max: 673000, rate: 0.36, rebate: 121475 },
    { year: '2025', min: 673001, max: 857900, rate: 0.39, rebate: 179147 },
    { year: '2025', min: 857901, max: 1817000, rate: 0.41, rebate: 251258 },
    { year: '2025', min: 1817001, max: 999999999, rate: 0.45, rebate: 644489 }
  ],
  settings: {
    companyName: '', primaryColor: '#4f46e5',
    timezone: 'Africa/Johannesburg (GMT+2)',
    notifications: { email: true, sms: false, inApp: true }
  },
  workflowRules: [
    { id: 1, name: 'Leave Approval > 5 Days', trigger: 'Leave Request', condition: 'Days > 5', action: 'Require Executive Approval', status: 'Active' },
    { id: 2, name: 'High Value Expense', trigger: 'Expense Claim', condition: 'Amount > 5000', action: 'Require CFO Approval', status: 'Active' },
    { id: 3, name: 'New Hire Onboarding', trigger: 'Employee Created', condition: 'Always', action: 'Trigger Onboarding Workflow', status: 'Active' }
  ],
  companies: [], departments: [], locations: [], costCenters: [],
  employees: [], payrollPeriods: [], payrollRuns: [], payslips: [],
  leaveRequests: [], payrollCalendars: [], contracts: [], benefits: [],
  shifts: [], timesheets: [], overtimeRequests: [], surveys: [],
  successionPlans: [], trainingRecords: [], disciplinaryCases: [],
  auditLogs: [], notifications: [], documents: [], clientInvoices: [],
  recruitment: { jobs: [], applicants: [] },
  onboarding: [], offboarding: [],
  performance: { reviews: [], goals: [] },
  training: { courses: [] },
  billingRates: { perEmployee: 50, setupFee: 500, adhocPayroll: 200, taxSubmission: 150, reportGeneration: 100 },
  _savedAt: 0
};

// ─────────────────────────────────────────────────────────────────────────────
// Initialise DB from localStorage
// ─────────────────────────────────────────────────────────────────────────────
StorageManager.clearLegacy();
let DB;

const _local = StorageManager.load();

if (_local && (_local.employees !== undefined || _local.companies !== undefined)) {
  DB = Object.assign({}, InitialData, _local);

  const _liveKeys = [
    'employees', 'companies', 'departments', 'payrollRuns', 'payslips',
    'leaveRequests', 'auditLogs', 'contracts', 'benefits', 'shifts', 'timesheets',
    'overtimeRequests', 'surveys', 'successionPlans', 'trainingRecords',
    'disciplinaryCases', 'notifications', 'documents', 'payrollCalendars',
    'clientInvoices', 'recruitment', 'onboarding', 'offboarding', 'performance',
    'training', '_savedAt'
  ];
  _liveKeys.forEach(k => { if (_local[k] !== undefined) DB[k] = _local[k]; });

  // Back-fill missing permissions on old saves
  if (DB.users) {
    DB.users = DB.users.map(u => {
      if (u.permissions) return u;
      if (u.role === 'Super Admin') return { ...u, permissions: ['all'] };
      if (u.role === 'HR Manager') return { ...u, permissions: ['employees.view', 'employees.edit', 'payroll.view', 'reports.view'] };
      if (u.role === 'Payroll Officer') return { ...u, permissions: ['payroll.process', 'tax.view'] };
      return { ...u, permissions: ['self.view'] };
    });
  }
  console.log('[DB] Loaded from localStorage. Last saved:', new Date(DB._savedAt || 0).toLocaleString());
} else {
  DB = JSON.parse(JSON.stringify(InitialData));
  DB._savedAt = 0;
  console.log('[DB] Fresh install — using system defaults');
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-sync: pull from MySQL and merge — but ONLY if server data is newer
// ─────────────────────────────────────────────────────────────────────────────
async function autoSync() {
  try {
    const serverData = await StorageManager.serverLoad();

    if (!serverData) {
      // DB is empty or unreachable — push our local state up
      if (window.DB._savedAt) StorageManager.serverSave(JSON.stringify(window.DB));
      return;
    }

    const localTs = window.DB._savedAt || 0;
    const serverTs = serverData._savedAt || 0;

    if (serverTs < localTs) {
      console.log('[autoSync] Local is newer — pushing local state to server.');
      StorageManager.serverSave(JSON.stringify(window.DB));
      return;
    }

    if (serverTs === localTs && localTs !== 0) {
      console.log('[autoSync] Already in sync.');
      return;
    }

    // Server is genuinely newer — merge into local DB
    const _mergeKeys = [
      'employees', 'companies', 'departments', 'payrollRuns', 'payslips',
      'leaveRequests', 'auditLogs', 'contracts', 'benefits', 'shifts', 'timesheets',
      'overtimeRequests', 'surveys', 'successionPlans', 'trainingRecords',
      'disciplinaryCases', 'notifications', 'documents', 'payrollCalendars',
      'clientInvoices', 'recruitment', 'onboarding', 'offboarding', 'performance',
      'training', 'settings', 'users', 'roles', 'workflowRules', 'billingRates',
      '_savedAt'
    ];
    _mergeKeys.forEach(k => { if (serverData[k] !== undefined) window.DB[k] = serverData[k]; });

    // Persist merged state back to localStorage
    try { localStorage.setItem(StorageManager.KEY, JSON.stringify(window.DB)); } catch (_) { }

    console.log('[autoSync] Merged newer server data.');

    // Refresh active page
    if (window.currentUser && typeof window.loadPage === 'function') {
      const activePage = document.querySelector('.nav-link.active')?.dataset?.page || 'dashboard';
      window.loadPage(activePage);
    }
  } catch (err) {
    console.warn('[autoSync] Error:', err.message);
  }
}

DB.save = function () { StorageManager.save(this); };

window.DB = DB;
window.StorageManager = StorageManager;

setTimeout(autoSync, 1500);