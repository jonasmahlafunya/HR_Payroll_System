// ─────────────────────────────────────────────────────────────────────────────
// StorageManager — localStorage (primary) + MySQL blob sync (secondary)
// ─────────────────────────────────────────────────────────────────────────────
const StorageManager = {
  KEY: 'hrpms_data_v2',
  _saveTimer: null,       // debounce rapid saves
  _saveQueue: false,      // track pending save

  // ── Get session token from cookie ─────────────────────────────────────────
  _getToken: function () {
    const m = document.cookie.match(/nexa_session=([^;]+)/);
    return m ? m[1] : '';
  },

  // ── Debounced save: coalesces rapid successive DB.save() calls ────────────
  save: function (data) {
    try {
      data._savedAt = Date.now();

      const toSave = Object.assign({}, data);
      // Strip large base64 employee photos — keep logos (needed for payslips)
      if (toSave.employees) {
        toSave.employees = toSave.employees.map(e => ({
          ...e, photo: e.photo?.startsWith('data:image') ? null : e.photo
        }));
      }

      const json = JSON.stringify(toSave);
      localStorage.setItem(this.KEY, json);

      // Debounce: batch rapid saves into one server call (300ms window)
      this._saveQueue = json;
      if (this._saveTimer) clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        if (this._saveQueue) {
          this.serverSave(this._saveQueue);
          this._saveQueue = false;
        }
        this._saveTimer = null;
      }, 300);

    } catch (e) {
      console.warn('[StorageManager] local save failed:', e.message);
    }
  },

  // ── Server save ───────────────────────────────────────────────────────────
  serverSave: async function (jsonData) {
    const token   = this._getToken();
    const csrf    = window.Auth?._csrfToken || '';

    // Don't attempt if clearly no session
    if (!token && !sessionStorage.getItem('hrpms_session_active')) return;

    try {
      const res = await fetch('api/sync.php', {
        method:      'POST',
        credentials: 'include',          // send the httpOnly cookie
        headers: {
          'Content-Type':  'application/json',
          'X-Auth-Token':  token,
          'X-CSRF-Token':  csrf
        },
        body: jsonData
      });

      if (res.status === 401) {
        // Session expired — don't spam, just warn once
        console.warn('[Sync] Session expired — data safe in localStorage.');
        return;
      }

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        console.warn('[Sync] Non-JSON response (HTTP', res.status, ')');
        return;
      }

      const result = await res.json().catch(() => ({}));
      if (result.status === 'success') {
        console.log('[Sync] ✓ Saved to database');
      } else if (result.status === 'db_unavailable') {
        console.warn('[Sync] DB unavailable — localStorage is the source of truth.');
      } else if (result.error) {
        console.warn('[Sync] Save warning:', result.error);
      }
    } catch (err) {
      console.warn('[Sync] Server save skipped (offline?):', err.message);
    }
  },

  // ── Server load ───────────────────────────────────────────────────────────
  serverLoad: async function () {
    const token = this._getToken();
    try {
      const res = await fetch('api/sync.php', {
        credentials: 'include',
        headers: { 'X-Auth-Token': token }
      });
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) return null;
      const text = await res.text();
      if (!text?.trim()) return null;
      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { return null; }
      if (!parsed || parsed.status === 'empty' || parsed.status === 'db_unavailable' || parsed.error) return null;
      console.log('[Sync] ✓ Loaded from database');
      return parsed;
    } catch (err) {
      console.warn('[Sync] Load failed:', err.message);
      return null;
    }
  },

  // ── Local load ────────────────────────────────────────────────────────────
  load: function () {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  clearLegacy: function () {
    try { localStorage.removeItem('hrpms_data_v1'); } catch (_) {}
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// System defaults — lookup tables and config only, no demo records
// ─────────────────────────────────────────────────────────────────────────────
const InitialData = {
  users: [
    { id: 1, username: 'admin', password: 'Changeme123!', role: 'Super Admin',
      name: 'Administrator', email: '', status: 'Active', lastLogin: '', permissions: ['all'] }
  ],
  roles: [
    { id: 1, name: 'Super Admin',      description: 'Full system access',              permissions: ['all'] },
    { id: 2, name: 'HR Manager',       description: 'Employee and payroll data',       permissions: ['employees.view','employees.edit','payroll.view','reports.view'] },
    { id: 3, name: 'Payroll Officer',  description: 'Process payroll and tax',         permissions: ['payroll.process','tax.view'] },
    { id: 4, name: 'Employee',         description: 'Self-service access only',        permissions: ['self.view'] }
  ],
  taxTables: [
    { year:'2025', min:0,       max:237100,    rate:0.18, rebate:0      },
    { year:'2025', min:237101,  max:370500,    rate:0.26, rebate:42678  },
    { year:'2025', min:370501,  max:512800,    rate:0.31, rebate:77362  },
    { year:'2025', min:512801,  max:673000,    rate:0.36, rebate:121475 },
    { year:'2025', min:673001,  max:857900,    rate:0.39, rebate:179147 },
    { year:'2025', min:857901,  max:1817000,   rate:0.41, rebate:251258 },
    { year:'2025', min:1817001, max:999999999, rate:0.45, rebate:644489 }
  ],
  settings: {
    companyName: '', primaryColor: '#4f46e5',
    timezone: 'Africa/Johannesburg (GMT+2)',
    notifications: { email: true, sms: false, inApp: true }
  },
  workflowRules: [
    { id:1, name:'Leave Approval > 5 Days', trigger:'Leave Request',   condition:'Days > 5',      action:'Require Executive Approval', status:'Active' },
    { id:2, name:'High Value Expense',      trigger:'Expense Claim',   condition:'Amount > 5000', action:'Require CFO Approval',        status:'Active' },
    { id:3, name:'New Hire Onboarding',     trigger:'Employee Created',condition:'Always',        action:'Trigger Onboarding Workflow', status:'Active' }
  ],
  companies:[], departments:[], locations:[], costCenters:[],
  employees:[], payrollPeriods:[], payrollRuns:[], payslips:[],
  leaveRequests:[], payrollCalendars:[], contracts:[], benefits:[],
  shifts:[], timesheets:[], overtimeRequests:[], surveys:[],
  successionPlans:[], trainingRecords:[], disciplinaryCases:[],
  auditLogs:[], notifications:[], documents:[], clientInvoices:[],
  recruitment:{ jobs:[], applicants:[] },
  onboarding:[], offboarding:[],
  performance:{ reviews:[], goals:[] },
  training:{ courses:[] },
  billingRates:{ perEmployee:50, setupFee:500, adhocPayroll:200, taxSubmission:150, reportGeneration:100 },
  _savedAt: 0
};

// ─────────────────────────────────────────────────────────────────────────────
// Initialise DB from localStorage first (instant), then reconcile with server
// ─────────────────────────────────────────────────────────────────────────────
StorageManager.clearLegacy();

let DB;
const _local = StorageManager.load();
const LIVE_KEYS = [
  'employees','companies','departments','payrollRuns','payslips',
  'leaveRequests','auditLogs','contracts','benefits','shifts','timesheets',
  'overtimeRequests','surveys','successionPlans','trainingRecords',
  'disciplinaryCases','notifications','documents','payrollCalendars',
  'clientInvoices','recruitment','onboarding','offboarding','performance',
  'training','settings','users','roles','workflowRules','billingRates','_savedAt'
];

if (_local && (_local.employees !== undefined || _local.companies !== undefined)) {
  DB = Object.assign({}, InitialData, _local);
  LIVE_KEYS.forEach(k => { if (_local[k] !== undefined) DB[k] = _local[k]; });

  // Back-fill missing permissions on old saves
  if (DB.users) {
    DB.users = DB.users.map(u => {
      if (u.permissions) return u;
      if (u.role === 'Super Admin')     return { ...u, permissions: ['all'] };
      if (u.role === 'HR Manager')      return { ...u, permissions: ['employees.view','employees.edit','payroll.view','reports.view'] };
      if (u.role === 'Payroll Officer') return { ...u, permissions: ['payroll.process','tax.view'] };
      return { ...u, permissions: ['self.view'] };
    });
  }
  console.log('[DB] Loaded from localStorage. Last saved:', new Date(DB._savedAt || 0).toLocaleString());
} else {
  DB = JSON.parse(JSON.stringify(InitialData));
  console.log('[DB] Fresh install — using system defaults');
}

// ─────────────────────────────────────────────────────────────────────────────
// autoSync — called after login so session cookie is available
// Pulls from MySQL and merges only if server timestamp is newer
// ─────────────────────────────────────────────────────────────────────────────
async function autoSync() {
  try {
    const serverData = await StorageManager.serverLoad();

    if (!serverData) {
      // No server data yet — push our local state up (first run)
      if (window.DB._savedAt) {
        const json = JSON.stringify(window.DB);
        StorageManager.serverSave(json);
      }
      return;
    }

    const localTs  = window.DB._savedAt  || 0;
    const serverTs = serverData._savedAt || 0;

    if (serverTs < localTs) {
      console.log('[autoSync] Local is newer — pushing to server.');
      StorageManager.serverSave(JSON.stringify(window.DB));
      return;
    }
    if (serverTs === localTs && localTs !== 0) {
      console.log('[autoSync] Already in sync ✓');
      return;
    }

    // Server is newer — merge into local
    LIVE_KEYS.forEach(k => { if (serverData[k] !== undefined) window.DB[k] = serverData[k]; });
    try { localStorage.setItem(StorageManager.KEY, JSON.stringify(window.DB)); } catch (_) {}
    console.log('[autoSync] Merged newer server data ✓');

    // Refresh active view
    if (window.currentUser && typeof window.loadPage === 'function') {
      const active = document.querySelector('.nav-link.active')?.dataset?.page || 'dashboard';
      window.loadPage(active);
    }
  } catch (err) {
    console.warn('[autoSync] Error:', err.message);
  }
}

DB.save = function () { StorageManager.save(this); };

window.DB            = DB;
window.StorageManager = StorageManager;
window.autoSync       = autoSync;

// autoSync runs AFTER login (called from auth.js _enterApp), not on page load
// so the session cookie is guaranteed to be present.
