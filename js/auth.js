// Authentication Module
class Auth {
  static login(username, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = window.DB.users.find(u => u.username === username && u.password === password);
        if (user) {
          resolve(user);
        } else {
          reject(new Error('Invalid username or password'));
        }
      }, 800);
    });
  }

  static logout(reason = '') {
    window.currentUser = null;
    window.currentEmployee = null;
    localStorage.removeItem('hrpms_user');
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

  static hasPermission(permission) {
    if (!window.currentUser) return false;
    if (window.currentUser.permissions.includes('all')) return true;
    return window.currentUser.permissions.includes(permission);
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

  // ── Security: logout when user leaves the tab ─────────────────
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && window.currentUser) {
      // User switched tab or minimised — log out immediately
      Auth.logout('You were logged out because you left the session. Please log in again.');
    }
  });

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

// Export Auth to window object
window.Auth = Auth;