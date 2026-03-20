// Enhanced Database with complete data for all modules and Persistence Layer
const StorageManager = {
  KEY: 'hrpms_data_v1',

  save: function (data) {
    try {
      // Create a shallow copy to manipulate before saving
      const dataToSave = Object.assign({}, data);

      // Strip out large base64 strings (like logos and photos) to prevent QuotaExceededError (5MB limit)
      if (dataToSave.companies) {
        dataToSave.companies = dataToSave.companies.map(c => ({ ...c, logo: c.logo?.startsWith('data:image') ? null : c.logo }));
      }
      if (dataToSave.employees) {
        dataToSave.employees = dataToSave.employees.map(e => ({ ...e, photo: e.photo?.startsWith('data:image') ? null : e.photo }));
      }

      const json = JSON.stringify(dataToSave);
      localStorage.setItem(this.KEY, json);
      console.log('Data saved to local storage');

      // Trigger background server sync
      this.serverSave(json);
    } catch (e) {
      console.error('Storage quota exceeded or save error:', e);
    }
  },

  serverSave: async function (jsonData) {
    try {
      const userStr = localStorage.getItem('hrpms_user');
      const token = userStr ? JSON.parse(userStr).token : '';

      const response = await fetch('api/sync.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: jsonData
      });
      const result = await response.json();
      if (result.status === 'success') {
        console.log('Successfully synced with MySQL');
      } else if (result.error) {
        console.warn('Sync error:', result.error);
      }
    } catch (err) {
      console.warn('Server sync failed:', err);
    }
  },

  serverLoad: async function () {
    try {
      const userStr = localStorage.getItem('hrpms_user');
      const token = userStr ? JSON.parse(userStr).token : '';

      const response = await fetch('api/sync.php', {
        headers: {
          'X-Auth-Token': token
        }
      });
      const data = await response.json();
      if (data && !data.error && data.status !== 'empty') {
        console.log('Loaded data from MySQL');
        return data;
      }
    } catch (err) {
      console.warn('Server load failed:', err);
    }
    return null;
  },

  load: function () {
    const data = localStorage.getItem(this.KEY);
    return data ? JSON.parse(data) : null;
  },

  clear: function () {
    localStorage.removeItem(this.KEY);
  }
};

// Initial Mock Data (Used for seeding)
const InitialData = {
  companies: [
    {
      id: 1,
      name: "Acme Corp SA",
      taxReference: "9123456789",
      registrationNumber: "2015/123456/07",
      country: "ZA",
      employees: 125,
      address: "123 Main Street, Sandton, Johannesburg, 2196",
      contact: "+27 11 123 4567",
      sarsBranchCode: "012345",
      beeLevel: "Level 4",
      uifNumber: "UIF12345678",
      sdlNumber: "SDL1234567",
      banking: { bankName: "First National Bank", accountNumber: "62012345678", branchCode: "250655", accountType: "Business Cheque" },
      status: "Active"
    },
    {
      id: 2,
      name: "Tech Innovations SA",
      taxReference: "9123456790",
      registrationNumber: "2018/987654/07",
      country: "ZA",
      employees: 48,
      address: "456 Tech Park, Century City, Cape Town, 7441",
      contact: "+27 21 987 6543",
      sarsBranchCode: "012346",
      beeLevel: "Level 2",
      uifNumber: "UIF12345679",
      status: "Active"
    }
  ],

  // Advanced Admin Data
  departments: [
    { id: 1, name: "Information Technology", code: "IT", manager: "Michael Chen", budget: 1500000 },
    { id: 2, name: "Finance", code: "FIN", manager: "Sarah Van der Merwe", budget: 1200000 },
    { id: 3, name: "Human Resources", code: "HR", manager: "Admin User", budget: 800000 },
    { id: 4, name: "Operations", code: "OPS", manager: "TBD", budget: 2000000 }
  ],

  locations: [
    { id: 1, name: "Johannesburg HQ", address: "123 Main St, Sandton", type: "Headquarters" },
    { id: 2, name: "Cape Town Branch", address: "456 Tech Park, Century City", type: "Branch" },
    { id: 3, name: "Remote", address: "N/A", type: "Virtual" }
  ],

  costCenters: [
    { id: 1, code: "CC001", name: "Development", status: "Active" },
    { id: 2, code: "CC002", name: "Administration", status: "Active" },
    { id: 3, code: "CC003", name: "Sales", status: "Active" }
  ],

  roles: [
    { id: 1, name: "Super Admin", description: "Full system access", permissions: ["all"] },
    { id: 2, name: "HR Manager", description: "Access to employee and payroll data", permissions: ["employees.view", "employees.edit", "payroll.view", "reports.view"] },
    { id: 3, name: "Payroll Officer", description: "Process payroll and tax", permissions: ["payroll.process", "tax.view"] },
    { id: 4, name: "Employee", description: "Self service access only", permissions: ["self.view"] }
  ],

  users: [
    { id: 1, username: "admin", password: "admin", role: "Super Admin", name: "Admin User", email: "admin@acmecorp.co.za", status: "Active", lastLogin: "2025-01-25 09:15", permissions: ["all"] },
    { id: 2, username: "payroll", password: "payroll", role: "Payroll Officer", name: "Thandi Nkosi", email: "payroll@acmecorp.co.za", status: "Active", lastLogin: "2025-01-24 14:30", permissions: ["payroll.process", "tax.view"] },
    { id: 3, username: "emp001", password: "pass", role: "Employee", name: "Thabo Mokoena", employeeId: 1, status: "Active", lastLogin: "2025-01-25 08:45", permissions: ["self.view"] },
    { id: 4, username: "emp002", password: "pass", role: "Employee", name: "Sarah Van der Merwe", employeeId: 2, status: "Active", lastLogin: "2025-01-24 09:00", permissions: ["self.view"] },
    { id: 5, username: "emp003", password: "pass", role: "Employee", name: "Michael Chen", employeeId: 5, status: "Active", lastLogin: "2025-01-23 11:20", permissions: ["self.view"] },
    { id: 6, username: "manager1", password: "pass", role: "HR Manager", name: "Michael Chen", employeeId: 5, status: "Active", lastLogin: "2025-01-23 11:20", permissions: ["employees.view", "employees.edit", "payroll.view", "reports.view"] }
  ],

  taxTables: [
    { year: "2025", min: 0, max: 237100, rate: 0.18, rebate: 0 },
    { year: "2025", min: 237101, max: 370500, rate: 0.26, rebate: 42678 },
    { year: "2025", min: 370501, max: 512800, rate: 0.31, rebate: 77362 },
    { year: "2025", min: 512801, max: 673000, rate: 0.36, rebate: 121475 },
    { year: "2025", min: 673001, max: 857900, rate: 0.39, rebate: 179147 },
    { year: "2025", min: 857901, max: 1817000, rate: 0.41, rebate: 251258 },
    { year: "2025", min: 1817001, max: 999999999, rate: 0.45, rebate: 644489 }
  ],

  workflowRules: [
    { id: 1, name: "Leave Approval > 5 Days", trigger: "Leave Request", condition: "Days > 5", action: "Require Executive Approval", status: "Active" },
    { id: 2, name: "High Value Expense", trigger: "Expense Claim", condition: "Amount > 5000", action: "Require CFO Approval", status: "Active" },
    { id: 3, name: "New Hire Onboarding", trigger: "Employee Created", condition: "Always", action: "Trigger Onboarding Workflow", status: "Active" }
  ],

  systemLogs: [
    { id: 1001, timestamp: "2025-01-25 10:45:22", user: "Admin User", action: "Updated Settings", module: "System", details: "Changed Primary Color" },
    { id: 1000, timestamp: "2025-01-25 09:15:01", user: "Admin User", action: "Login", module: "Auth", details: "Successful login from IP 192.168.1.5" },
    { id: 999, timestamp: "2025-01-24 16:30:15", user: "Payroll Officer", action: "Processed Payroll", module: "Payroll", details: "Run ID #2345 completed" },
    { id: 998, timestamp: "2025-01-24 14:20:10", user: "Thabo Mokoena", action: "Applied for Leave", module: "Leave", details: "Annual Leave: 5 Days" },
    { id: 997, timestamp: "2025-01-24 11:05:33", user: "Michael Chen", action: "Approved Leave", module: "Leave", details: "Approved request #45" }
  ],

  employees: [
    {
      id: 1,
      employeeNumber: "EMP001",
      firstName: "Thabo",
      lastName: "Mokoena",
      idNumber: "850101 5023 088",
      dateOfBirth: "1985-01-01",
      gender: "Male",
      race: "African",
      email: "thabo.mokoena@acmecorp.co.za",
      phone: "+27 82 123 4567",
      address: "456 Oak Avenue, Randburg, 2194",
      position: "Senior Full Stack Developer",
      department: "IT",
      employmentType: "Permanent",
      managerId: 5,
      hireDate: "2020-03-15",
      basicSalary: 65000,
      allowances: { travel: 3500, housing: 8000, communication: 1500, meal: 1000 },
      taxNumber: "1234567890",
      taxThreshold: "Primary",
      uifNumber: "UF12345678",
      medicalAidTaxCredit: true,
      medicalDependents: 2,
      benefits: { medicalAid: "Discovery Health Classic Comprehensive", medicalMembers: 3, pensionFund: "Allan Gray", pensionPercent: 7.5 },
      leaveBalances: { annual: { total: 21, taken: 3, remaining: 18 }, sick: { total: 30, taken: 2, remaining: 28 }, familyResponsibility: { total: 3, taken: 0, remaining: 3 } },
      bankName: "FNB", accountNumber: "62123456789", branchCode: "250655",
      performanceRating: 4.7,
      status: "Active",
      skills: [{ name: "JavaScript", level: "Expert" }, { name: "React", level: "Expert" }]
    },
    {
      id: 2,
      employeeNumber: "EMP002",
      firstName: "Sarah",
      lastName: "Van der Merwe",
      idNumber: "900202 5018 088",
      dateOfBirth: "1990-02-02",
      gender: "Female",
      race: "White",
      email: "sarah.vdm@acmecorp.co.za",
      position: "Senior Accountant",
      department: "Finance",
      employmentType: "Permanent",
      managerId: 3,
      hireDate: "2021-06-01",
      basicSalary: 55000,
      allowances: { travel: 2500, housing: 6000, carAllowance: 4000 },
      benefits: { medicalAid: "Momentum Health", medicalMembers: 1, pensionFund: "Sanlam", pensionPercent: 7.5 },
      status: "Active"
    },
    {
      id: 5,
      employeeNumber: "MNG001",
      firstName: "Michael",
      lastName: "Chen",
      position: "IT Manager",
      department: "IT",
      email: "michael.chen@acmecorp.co.za",
      status: "Active",
      basicSalary: 85000
    }
  ],

  payrollPeriods: [
    {
      id: 1, name: "January 2025", startDate: "2025-01-01", endDate: "2025-01-31", payDate: "2025-01-25",
      status: "Processed", totalGross: 4250000, totalPAYE: 945320, totalUIF: 22150, totalSDL: 42500, totalNet: 3189030
    }
  ],

  leaveRequests: [
    { id: 1, employeeId: 1, employeeName: "Thabo Mokoena", type: "Annual Leave", startDate: "2025-02-10", endDate: "2025-02-14", days: 5, status: "Approved", reason: "Family vacation" }
  ],

  recruitment: {
    jobs: [
      { id: 1, title: "Senior Full Stack Developer", department: "IT", location: "JHB", type: "Permanent", salary: "R65k-R85k", status: "Open", applicants: 12 },
      { id: 2, title: "HR Intern", department: "HR", location: "CPT", type: "Contract", salary: "R15k", status: "Active", applicants: 45 }
    ],
    applicants: [
      { id: 1, jobId: 1, name: "John Doe", email: "john@email.com", stage: "Interview", rating: 4 },
      { id: 2, jobId: 1, name: "Jane Smith", email: "jane@email.com", stage: "Screening", rating: 3 }
    ]
  },

  onboarding: [
    { id: 1, employeeName: "New Hire 1", position: "Junior Dev", startDate: "2025-02-01", progress: 20, status: "In Progress" }
  ],

  offboarding: [
    { id: 1, employeeName: "Resigning Employee", position: "Designer", exitDate: "2025-01-31", progress: 60, status: "Pending Final Pay" }
  ],

  performance: {
    reviews: [
      { id: 1, employeeId: 1, period: "2024 H2", score: 4.7, reviewer: "Michael Chen", status: "Completed" },
      { id: 2, employeeId: 2, period: "2024 H2", score: 4.2, reviewer: "CFO", status: "Completed" }
    ],
    goals: [
      { id: 1, employeeId: 1, title: "Migrate to Cloud", progress: 75, status: "On Track" }
    ]
  },

  training: {
    courses: [
      { id: 1, title: "Cyber Security Basics", category: "Security", duration: "4h", provider: "Internal", enrolled: 45 },
      { id: 2, title: "Advanced React Patterns", category: "Technical", duration: "12h", provider: "Udemy", enrolled: 5 }
    ]
  },

  documents: [
    { id: 1, name: "Company_Policy_2025.pdf", category: "Policy", size: "2.4MB", date: "2025-01-01" },
    { id: 2, name: "Thabo_Mokoena_Contract.pdf", category: "Contract", size: "1.1MB", date: "2020-03-15" }
  ],

  notifications: [
    { id: 1, title: "Payroll Due", message: "Process January Payroll", time: "2 hours ago", type: "warning" },
    { id: 2, title: "Leave Approved", message: "Thabo Mokoena - Annual Leave", time: "5 hours ago", type: "success" }
  ],

  // NEW: Production Grade Payroll Collections
  payrollRuns: [
    // Historical runs will be stored here
    // Enhanced structure with status tracking, approval workflow, and audit trail
    // {
    //   id: 1,
    //   company: 'Acme Corp SA',
    //   companyId: 1,
    //   period: 'February 2025',
    //   type: 'regular', // regular, bonus, correction, termination, adhoc
    //   status: 'Draft', // Draft, Pending Validation, Validated, Pending Approval, Approved, Finalized, Paid
    //   statusColor: 'warning',
    //   createdBy: 'Admin User',
    //   createdDate: '2025-02-01T10:00:00Z',
    //   approvedBy: null,
    //   approvedDate: null,
    //   finalizedBy: null,
    //   finalizedDate: null,
    //   locked: false,
    //   version: 1,
    //   parentRunId: null, // For correction payrolls
    //   correctionReason: null,
    //   totalGross: 0,
    //   totalNet: 0,
    //   totalPAYE: 0,
    //   totalUIF: 0,
    //   totalSDL: 0,
    //   employeeCount: 0,
    //   errors: [], // Critical errors that block payroll
    //   warnings: [], // Warnings that allow continuation
    //   variances: [], // Variances from previous month
    //   lines: [] // Employee pay lines
    // }
  ],

  payslips: [
    // Individual line items for every finalized payslip
    // { id: "RUN_202501_EMP001", runId: "2025-01", employeeId: 1, basicSalary: 0, gross: 0, net: 0, deductions: {}, contributions: {}, taxes: {} }
  ],

  // ─── New Feature Collections ──────────────────────────────────────────────

  disciplinaryCases: [],    // Disciplinary/grievance { id, employeeId, type, date, details, outcome, status }
  shifts: [],               // Shift schedule { id, employeeId, date, shift: 'Morning'|'Afternoon'|'Night'|'Off' }
  timesheets: [],           // Weekly timesheets { id, employeeId, weekStart, hours[], status, approvedBy }
  trainingRecords: [],      // Feeds WSP/ATR { id, employeeId, course, provider, date, duration, cost, status }
  overtimeRequests: [],     // OT approval { id, employeeId, date, hours, rate, reason, status }
  surveys: [],              // Engagement surveys { id, title, deadline, questions[], status, responses }
  successionPlans: [],      // 9-box & successors { id, role, incumbentId, successorId, readiness }

  // Audit Log System
  auditLogs: [],



  // Payroll Calendar System
  payrollCalendars: [
    {
      companyId: 1,
      companyName: 'Acme Corp SA',
      payrollFrequency: 'Monthly',
      payDay: 25,
      inputCutOff: 20,
      approvalCutOff: 22,
      reminderDays: [15, 18, 20],
      nextPayrollDate: '2025-02-25',
      nextCutOffDate: '2025-02-20'
    },
    {
      companyId: 2,
      companyName: 'Tech Innovations SA',
      payrollFrequency: 'Monthly',
      payDay: 25,
      inputCutOff: 20,
      approvalCutOff: 22,
      reminderDays: [15, 18, 20],
      nextPayrollDate: '2025-02-25',
      nextCutOffDate: '2025-02-20'
    }
  ],

  // Client Billing System
  clientInvoices: [],
  billingRates: {
    perEmployee: 50, // R50 per employee per month
    setupFee: 500,
    adhocPayroll: 200,
    taxSubmission: 150,
    reportGeneration: 100
  },

  settings: {
    companyName: "Acme Corp SA",
    primaryColor: "#4f46e5",
    timezone: "Africa/Johannesburg (GMT+2)",
    notifications: { email: true, sms: true, inApp: true }
  }
};

// Initialize DB
let DB;
const savedData = StorageManager.load();

// More robust check: if savedData exists and has any core key, use it.
// This prevents a single missing key (like systemLogs) from wiping all data.
if (savedData && (savedData.users || savedData.employees || savedData.payrollRuns)) {
  // Merge missing keys from InitialData to handle schema upgrades
  DB = Object.assign({}, InitialData, savedData);
  // Always keep the saved data — don't override with empty arrays on schema upgrade
  const persistedKeys = ['payrollRuns', 'payslips', 'auditLogs', 'leaveRequests',
    'disciplinaryCases', 'shifts', 'timesheets', 'trainingRecords',
    'overtimeRequests', 'surveys', 'successionPlans'];
  persistedKeys.forEach(key => {
    if (savedData[key]) DB[key] = savedData[key];
  });

  // Ensure users always have permissions (add if missing from old saves)
  if (DB.users) {
    DB.users = DB.users.map(u => {
      if (!u.permissions) {
        if (u.role === 'Super Admin') u.permissions = ['all'];
        else if (u.role === 'HR Manager') u.permissions = ['employees.view', 'employees.edit', 'payroll.view', 'reports.view'];
        else if (u.role === 'Payroll Officer') u.permissions = ['payroll.process', 'tax.view'];
        else u.permissions = ['self.view'];
      }
      return u;
    });
  }
  console.log('Loaded data from local storage');
} else {
  DB = JSON.parse(JSON.stringify(InitialData)); // Deep copy
  StorageManager.save(DB);
  console.log('Seeded initial data (Fresh/Upgrade)');
}

// Global Sync Function
async function autoSync() {
  const serverData = await StorageManager.serverLoad();
  if (serverData) {
    // Merge strategy: Server wins for production-ready persistence
    Object.assign(window.DB, serverData);
    console.log('Synchronized with Server Database');

    // If we are logged in, refresh the current page to reflect server state
    if (window.currentUser) {
      const currentRoute = document.querySelector('.nav-item.active')?.dataset?.page || 'dashboard';
      if (window.loadPage) window.loadPage(currentRoute);
    }
  }
}

// Initial server sync
autoSync();

// Add Save Method to DB object for convenience
DB.save = function () {
  StorageManager.save(this);
};

window.DB = DB;
window.StorageManager = StorageManager;