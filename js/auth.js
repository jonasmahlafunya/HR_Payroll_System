// Authentication Module
class Auth {
  static async login(username, password) {
    // Try server-side auth first (handles bcrypt & plain-text)
    try {
      const res = await fetch('api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        if (data.status === 'success' && data.user) {
          // Store token for subsequent requests
          if (data.token) localStorage.setItem('hrpms_token', data.token);
          // Merge server user with local DB user for full permissions
          const localUser = (window.DB.users || []).find(u => u.username === username);
          const mergedUser = Object.assign({}, data.user, {
            // Prioritize live server permissions over stale local arrays (since an empty array [] evaluates as truthy in JS)
            permissions: (data.user.permissions && data.user.permissions.length) ? data.user.permissions : (localUser?.permissions || []),
            companyIds: (data.user.companyIds && data.user.companyIds.length) ? data.user.companyIds : (localUser?.companyIds || [])
          });
          // Update local DB user record
          if (localUser) {
            Object.assign(localUser, mergedUser);
            window.DB.save();
          }
          return mergedUser;
        } else {
          throw new Error(data.error || 'Invalid username or password');
        }
      }
    } catch (err) {
      // If server is unreachable, fall back to local DB (offline mode)
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        console.warn('[Auth] Server unreachable — using local DB fallback');
        const user = (window.DB.users || []).find(u =>
          u.username === username && (u.password === password || u.password_hash === password)
        );
        if (user) return user;
        throw new Error('Invalid username or password (offline mode)');
      }
      throw err;
    }
    throw new Error('Invalid username or password');
  }

  static logout(reason = '') {
    // Notify server to invalidate session token
    const token = localStorage.getItem('hrpms_token');
    if (token) {
      fetch('api/auth.php?action=logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token }
      }).catch(() => { }); // fire-and-forget
    }

    window.currentUser = null;
    window.currentEmployee = null;
    localStorage.removeItem('hrpms_user');
    localStorage.removeItem('hrpms_token');
    sessionStorage.removeItem('hrpms_session_active');

    // Stop any running timers
    Auth.stopIdleTimer();

    // Close any open modals
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(m => m.remove());

    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';

    // Clear login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();

    // Show reason message
    if (reason) {
      setTimeout(() => Toast.show(reason, 'info'), 200);
    } else {
      Toast.show('Logged out successfully', 'info');
    }

    // Replace history so back button can't return to app
    window.history.replaceState(null, '', window.location.href);
  }

  static getCurrentUser() {
    return window.currentUser;
  }

  static getCurrentEmployee() {
    return window.currentEmployee;
  }

  static hasPermission(page) {
    if (!window.currentUser) return false;
    const p = window.currentUser.permissions || [];
    if (p.includes('all')) return true;

    // Pages that everyone can see
    if (['dashboard', 'profile', 'employeeportal'].includes(page)) return true;
    if (p.includes(page)) return true;

    // HR / Employee Management
    if (['employees', 'orgchart', 'departments', 'companies'].includes(page)) return p.includes('employees.view');
    // HR Actions
    if (['contracts', 'recruitment', 'onboarding', 'offboarding', 'engagement', 'training', 'succession'].includes(page)) return p.includes('employees.edit');
    // Payroll & Finances
    if (['payroll', 'payslips', 'benefits', 'taxcompliance'].includes(page)) return p.includes('payroll.view') || p.includes('payroll.process') || p.includes('tax.view');
    // Time & Scheduling
    if (['timeattendance', 'leave', 'shifts'].includes(page)) return p.includes('employees.view') || p.includes('payroll.view');
    // Analytics & Systems
    if (['reports', 'analytics', 'performance', 'documents', 'lettergenerator'].includes(page)) return p.includes('reports.view') || p.includes('employees.view');
    // Settings
    if (['settings'].includes(page)) return false;

    return false;
  }

  static updateNavigationVisibility() {
    if (!window.currentUser) return;

    document.querySelectorAll('.sidebar .nav-link[data-page]').forEach(link => {
      const page = link.getAttribute('data-page');
      if (!Auth.hasPermission(page)) {
        link.style.display = 'none';
      } else {
        link.style.display = '';
      }
    });

    document.querySelectorAll('.sidebar .nav-section').forEach(section => {
      const visibleLinks = section.querySelectorAll('.nav-link[data-page]:not([style*="display: none"])');
      const hasLogout = section.querySelector('#logoutBtn');
      if (visibleLinks.length === 0 && !hasLogout) {
        section.style.display = 'none';
      } else {
        section.style.display = '';
      }
    });
  }

  // ── Idle timeout manager ──────────────────────────────────────
  static _idleTimer = null;
  static _warningTimer = null;
  static _idleMinutes = 30; // Auto-logout after 30 minutes idle

  static startIdleTimer() {
    Auth.stopIdleTimer();
    const warningMs = (Auth._idleMinutes * 60 - 60) * 1000; // warn 60s before logout
    const logoutMs = Auth._idleMinutes * 60 * 1000;

    Auth._warningTimer = setTimeout(() => {
      if (!window.currentUser) return;
      Auth._showIdleWarning();
    }, warningMs);

    Auth._idleTimer = setTimeout(() => {
      if (!window.currentUser) return;
      Auth.logout('Session expired due to inactivity. Please log in again.');
    }, logoutMs);
  }

  static stopIdleTimer() {
    clearTimeout(Auth._idleTimer);
    clearTimeout(Auth._warningTimer);
    Auth._idleTimer = null;
    Auth._warningTimer = null;
  }

  static resetIdleTimer() {
    if (window.currentUser) Auth.startIdleTimer();
  }

  static _showIdleWarning() {
    // Remove any existing warning
    const existing = document.getElementById('idleWarningModal');
    if (existing) existing.remove();

    let countdown = 60;
    const overlay = document.createElement('div');
    overlay.id = 'idleWarningModal';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);
      z-index:99999;display:flex;align-items:center;justify-content:center;
      animation:nexaFadeIn 0.25s ease;
    `;
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:36px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.25);">
        <div style="width:60px;height:60px;border-radius:50%;background:#FEF3C7;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.6rem;">⏰</div>
        <h3 style="font-size:1.1rem;font-weight:700;color:#0F172A;margin-bottom:8px;">Are you still there?</h3>
        <p style="font-size:0.88rem;color:#64748B;margin-bottom:20px;">
          You'll be automatically logged out in <strong id="idleCountdown">60</strong> seconds due to inactivity.
        </p>
        <button id="idleStayBtn" style="background:#4F46E5;color:#fff;border:none;border-radius:999px;padding:10px 28px;font-weight:600;cursor:pointer;font-size:0.9rem;">
          Stay Logged In
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Countdown
    const countdownEl = document.getElementById('idleCountdown');
    const tick = setInterval(() => {
      countdown--;
      if (countdownEl) countdownEl.textContent = countdown;
      if (countdown <= 0) clearInterval(tick);
    }, 1000);

    // Stay button
    document.getElementById('idleStayBtn').addEventListener('click', () => {
      clearInterval(tick);
      overlay.remove();
      Auth.resetIdleTimer();
    });
  }
}

// ── Initialize login form ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      // Prevent submission if already logged in
      if (window.currentUser) return;

      const username = document.getElementById('username')?.value.trim();
      const password = document.getElementById('password')?.value;

      const loginBtn = document.querySelector('#loginForm button[type="submit"]');
      const btnText = document.getElementById('loginBtnText');
      const spinner = document.getElementById('loginSpinner');

      if (!username || !password) {
        Toast.show('Please enter both username and password', 'warning');
        return;
      }

      if (btnText) btnText.style.display = 'none';
      if (spinner) spinner.style.display = 'inline-block';
      if (loginBtn) loginBtn.disabled = true;

      try {
        const user = await Auth.login(username, password);

        // Save user session
        window.currentUser = user;
        localStorage.setItem('hrpms_user', JSON.stringify(user));
        sessionStorage.setItem('hrpms_session_active', '1');

        // Apply this user's company-specific theme color
        Auth._applyUserTheme(user);

        // Get employee data if user is employee
        if (user.employeeId) {
          window.currentEmployee = window.DB.employees.find(e => e.id === user.employeeId);
        }

        // Switch to app
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'flex';
        document.getElementById('current-user').textContent = user.name;
        document.getElementById('userRole').textContent = user.role;

        // Push a state so the back button triggers popstate
        window.history.pushState({ loggedIn: true }, '', window.location.href);

        // Start idle timer
        Auth.startIdleTimer();

        // Load notifications
        if (typeof updateNotificationCount === 'function') updateNotificationCount();

        // Hide unauthorized tabs dynamically
        if (typeof Auth.updateNavigationVisibility === 'function') Auth.updateNavigationVisibility();

        // Load dashboard
        if (typeof loadPage === 'function') loadPage('dashboard');

        Toast.show(`Welcome back, ${user.name}!`, 'success');

      } catch (error) {
        Toast.show(error.message, 'danger');
      } finally {
        if (btnText) btnText.style.display = 'inline-block';
        if (spinner) spinner.style.display = 'none';
        if (loginBtn) loginBtn.disabled = false;
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof showConfirmation === 'function') {
        showConfirmation(
          'Confirm Logout',
          'Are you sure you want to log out?',
          () => Auth.logout()
        );
      } else {
        Auth.logout();
      }
    });
  }

  // ── Security: no auto-logout on tab switch/refresh ─────────────
  // (visibilitychange logout removed — it caused logout on page refresh)

  // ── Security: browser back button guard ───────────────────────
  // Push an initial state so pressing Back fires popstate
  window.history.pushState(null, '', window.location.href);

  window.addEventListener('popstate', function () {
    if (window.currentUser) {
      // App is open and user pressed back — log out and re-push state
      Auth.logout('You were logged out for security. Please log in again.');
    }
    // Always re-push so back button keeps triggering this
    window.history.pushState(null, '', window.location.href);
  });

  // ── Security: reset idle timer on any user activity ───────────
  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
      if (window.currentUser) Auth.resetIdleTimer();
    }, { passive: true });
  });

  // ── Security: if page refocuses and no session, force login ───
  window.addEventListener('focus', function () {
    // If localStorage was cleared (another tab logout), enforce login
    if (window.currentUser && !localStorage.getItem('hrpms_user')) {
      Auth.logout('Your session was ended in another tab. Please log in again.');
    }
  });
});

// ── Helper: apply the per-user+company theme color ───────────────────────────
Auth._applyUserTheme = function (user) {
  if (!user) return;
  const cs = window.DB?.companySettings || {};
  // Find the first company this user has access to (or first company overall)
  const companyIds = user.companyIds && user.companyIds.length ? user.companyIds : null;
  const companies = window.DB?.companies || [];
  const comp = companyIds
    ? companies.find(c => companyIds.includes(c.id))
    : companies[0];
  if (!comp) return;
  const compCS = cs[comp.id] || {};
  const userColors = compCS.userColors || {};
  const hex = userColors[user.id] || userColors[String(user.id)];
  if (hex) {
    document.documentElement.style.setProperty('--primary', hex);
  }
};

// Export Auth to window object
window.Auth = Auth;