// Authentication Module — Nexa HR & Payroll
// Email-based 2FA: Step 1 = password, Step 2 = email OTP
class Auth {
  static _csrfToken = null;
  static _pendingUsername = null; // held between step 1 and step 2

  // ── Step 1: Password check ────────────────────────────────────
  static async login(username, password) {
    try {
      const res = await fetch('api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('Unexpected server response.');
      const data = await res.json();

      if (data.status === '2fa_email_required') {
        Auth._pendingUsername = username;
        return { status: '2fa_email_required', email_hint: data.email_hint, username };
      }
      if (data.status === 'success' && data.user) {
        return Auth._mergeAndReturn(data);
      }
      throw new Error(data.error || 'Invalid username or password.');

    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        // Offline fallback
        const user = (window.DB?.users || []).find(u =>
          u.username === username && (u.password === password || u.password_hash === password)
        );
        if (user) return user;
        throw new Error('Invalid username or password (offline mode).');
      }
      throw err;
    }
  }

  // ── Step 2: Verify email OTP ──────────────────────────────────
  static async verifyEmailOtp(username, code) {
    const res = await fetch('api/auth.php?action=verify_otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, code })
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return Auth._mergeAndReturn(data);
    }
    throw new Error(data.error || 'Invalid verification code.');
  }

  // ── Resend OTP ────────────────────────────────────────────────
  static async resendOtp(username) {
    const res = await fetch('api/auth.php?action=send_otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not resend code.');
    return data;
  }

  // ── Merge server user with local DB for full permissions ──────
  static _mergeAndReturn(data) {
    const u = data.user;
    const local = (window.DB?.users || []).find(lu => lu.username === u.username);
    const merged = Object.assign({}, u, {
      permissions: (u.permissions?.length) ? u.permissions : (local?.permissions || []),
      companyIds:  (u.companyIds?.length)  ? u.companyIds  : (local?.companyIds  || [])
    });
    window.currentUser = merged;
    sessionStorage.setItem('hrpms_session_active', '1');
    if (data.csrf) Auth._csrfToken = data.csrf;
    if (local) { Object.assign(local, merged); window.DB.save(); }
    return merged;
  }

  // ── Logout ────────────────────────────────────────────────────
  static logout(reason = '') {
    fetch('api/auth.php?action=logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': Auth._csrfToken || '' }
    }).catch(() => {});

    window.currentUser = null;
    window.currentEmployee = null;
    Auth._pendingUsername = null;
    sessionStorage.removeItem('hrpms_session_active');
    Auth.stopIdleTimer();

    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';

    // Reset both steps
    Auth._showStep('credentials');
    document.getElementById('loginForm')?.reset();

    if (reason) setTimeout(() => Toast.show(reason, 'info'), 200);
    else Toast.show('Logged out successfully', 'info');
    window.history.replaceState(null, '', window.location.href);
  }

  // ── Step display helper ───────────────────────────────────────
  static _showStep(step) {
    const cred = document.getElementById('loginStepCredentials');
    const otp  = document.getElementById('loginStepOtp');
    if (step === 'credentials') {
      if (cred) cred.style.display = 'block';
      if (otp)  otp.style.display  = 'none';
    } else {
      if (cred) cred.style.display = 'none';
      if (otp)  otp.style.display  = 'block';
      document.getElementById('twoFactor')?.focus();
    }
  }

  // ── Finalise login: switch to app ─────────────────────────────
  static _enterApp(user) {
    window.currentUser = user;
    sessionStorage.setItem('hrpms_session_active', '1');
    Auth._applyUserTheme(user);
    if (user.employeeId) {
      window.currentEmployee = window.DB?.employees?.find(e => e.id === user.employeeId);
    }
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display   = 'flex';
    document.getElementById('current-user').textContent  = user.name;
    document.getElementById('userRole').textContent      = user.role;
    Auth._showStep('credentials');
    document.getElementById('loginForm')?.reset();
    document.getElementById('otpForm')?.reset();
    window.history.pushState({ loggedIn: true }, '', window.location.href);
    Auth.startIdleTimer();
    if (typeof updateNotificationCount === 'function') updateNotificationCount();
    if (typeof Auth.updateNavigationVisibility === 'function') Auth.updateNavigationVisibility();
    if (typeof loadPage === 'function') loadPage('dashboard');
    // Pull latest data from server now that session is live
    if (typeof autoSync === 'function') autoSync();
    Toast.show(`Welcome back, ${user.name || user.username}!`, 'success');
  }

  // ── Current user / employee ───────────────────────────────────
  static getCurrentUser() { return window.currentUser; }
  static getCurrentEmployee() { return window.currentEmployee; }

  // ── Permission checks ─────────────────────────────────────────
  static hasPermission(page) {
    if (!window.currentUser) return false;
    const p = window.currentUser.permissions || [];
    if (p.includes('all')) return true;
    if (['dashboard', 'profile', 'employeeportal'].includes(page)) return true;
    if (p.includes(page)) return true;
    if (['employees', 'orgchart', 'departments', 'companies'].includes(page)) return p.includes('employees.view');
    if (['contracts', 'recruitment', 'onboarding', 'offboarding', 'engagement', 'training', 'succession'].includes(page)) return p.includes('employees.edit');
    if (['payroll', 'payslips', 'benefits', 'taxcompliance'].includes(page)) return p.includes('payroll.view') || p.includes('payroll.process') || p.includes('tax.view');
    if (['timeattendance', 'leave', 'shifts'].includes(page)) return p.includes('employees.view') || p.includes('payroll.view');
    if (['reports', 'analytics', 'performance', 'documents', 'lettergenerator'].includes(page)) return p.includes('reports.view') || p.includes('employees.view');
    if (['settings'].includes(page)) return false;
    return false;
  }

  static updateNavigationVisibility() {
    if (!window.currentUser) return;
    document.querySelectorAll('.sidebar .nav-link[data-page]').forEach(link => {
      link.style.display = Auth.hasPermission(link.getAttribute('data-page')) ? '' : 'none';
    });
    document.querySelectorAll('.sidebar .nav-section').forEach(section => {
      const vis = section.querySelectorAll('.nav-link[data-page]:not([style*="display: none"])');
      section.style.display = (vis.length === 0 && !section.querySelector('#logoutBtn')) ? 'none' : '';
    });
  }

  // ── Idle timeout ──────────────────────────────────────────────
  static _idleTimer = null;
  static _warningTimer = null;
  static _idleMinutes = 30;

  static startIdleTimer() {
    Auth.stopIdleTimer();
    const warnMs   = (Auth._idleMinutes * 60 - 60) * 1000;
    const logoutMs = Auth._idleMinutes * 60 * 1000;
    Auth._warningTimer = setTimeout(() => { if (window.currentUser) Auth._showIdleWarning(); }, warnMs);
    Auth._idleTimer    = setTimeout(() => { if (window.currentUser) Auth.logout('Session expired due to inactivity.'); }, logoutMs);
  }
  static stopIdleTimer() {
    clearTimeout(Auth._idleTimer); clearTimeout(Auth._warningTimer);
    Auth._idleTimer = Auth._warningTimer = null;
  }
  static resetIdleTimer() { if (window.currentUser) Auth.startIdleTimer(); }

  static _showIdleWarning() {
    document.getElementById('idleWarningModal')?.remove();
    let countdown = 60;
    const overlay = document.createElement('div');
    overlay.id = 'idleWarningModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:36px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.25);">
        <div style="width:60px;height:60px;border-radius:50%;background:#FEF3C7;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.6rem;">⏰</div>
        <h3 style="font-size:1.1rem;font-weight:700;color:#0F172A;margin-bottom:8px;">Are you still there?</h3>
        <p style="font-size:0.88rem;color:#64748B;margin-bottom:20px;">
          You'll be logged out in <strong id="idleCountdown">60</strong> seconds.
        </p>
        <button id="idleStayBtn" style="background:#0B1D3A;color:#fff;border:none;border-radius:999px;padding:10px 28px;font-weight:600;cursor:pointer;font-size:0.9rem;">Stay Logged In</button>
      </div>`;
    document.body.appendChild(overlay);
    const tick = setInterval(() => { const el = document.getElementById('idleCountdown'); if (el) el.textContent = --countdown; if (countdown <= 0) clearInterval(tick); }, 1000);
    document.getElementById('idleStayBtn').addEventListener('click', () => { clearInterval(tick); overlay.remove(); Auth.resetIdleTimer(); });
  }

  // ── Session verification on page load ─────────────────────────
  static async verifySession() {
    try {
      const res  = await fetch('api/auth.php?action=verify');
      const data = await res.json();
      if (data.valid && data.user) {
        const local = (window.DB?.users || []).find(u => u.username === data.user.username);
        window.currentUser = Object.assign({}, data.user, {
          permissions: (data.user.permissions?.length) ? data.user.permissions : (local?.permissions || []),
          companyIds:  (data.user.companyIds?.length)  ? data.user.companyIds  : (local?.companyIds  || [])
        });
        if (data.csrf) Auth._csrfToken = data.csrf;
        if (window.currentUser.employeeId) {
          window.currentEmployee = window.DB?.employees?.find(e => e.id === window.currentUser.employeeId);
        }
        return true;
      }
    } catch (e) { console.warn('[Auth] Session verify failed:', e); }
    return false;
  }

  // ── Theme per user/company ────────────────────────────────────
  static _applyUserTheme(user) {
    if (!user) return;
    const companies = window.DB?.companies || [];
    const cs = window.DB?.companySettings || {};
    const comp = user.companyIds?.length ? companies.find(c => user.companyIds.includes(c.id)) : companies[0];
    if (!comp) return;
    const hex = (cs[comp.id]?.userColors || {})[user.id];
    if (hex) document.documentElement.style.setProperty('--primary', hex);
  }
}

// ── DOM: wire up both login forms ─────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  // ── Step 1: credentials form ──────────────────────────────────
  document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (window.currentUser) return;

    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;
    const btn      = this.querySelector('button[type="submit"]');
    const btnText  = document.getElementById('loginBtnText');
    const spinner  = document.getElementById('loginSpinner');

    btnText && (btnText.style.display = 'none');
    spinner && (spinner.style.display = 'inline-block');
    if (btn) btn.disabled = true;

    try {
      const result = await Auth.login(username, password);

      if (result.status === '2fa_email_required') {
        // Show OTP step
        const hint = document.getElementById('otpEmailHint');
        if (hint) hint.textContent = result.email_hint || 'your registered email';
        Auth._showStep('otp');
        return;
      }

      // No email on account — direct login
      Auth._enterApp(result);

    } catch (err) {
      Toast.show(err.message, 'danger');
    } finally {
      btnText && (btnText.style.display = 'inline-block');
      spinner && (spinner.style.display = 'none');
      if (btn) btn.disabled = false;
    }
  });

  // ── Step 2: OTP form ──────────────────────────────────────────
  document.getElementById('otpForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = Auth._pendingUsername;
    const code     = document.getElementById('twoFactor')?.value.trim();
    const btn      = this.querySelector('button[type="submit"]');
    const btnText  = document.getElementById('otpBtnText');
    const spinner  = document.getElementById('otpSpinner');

    if (!username) { Toast.show('Session lost. Please log in again.', 'danger'); Auth._showStep('credentials'); return; }
    if (!code)     { Toast.show('Please enter the 6-digit code.', 'warning'); return; }

    btnText && (btnText.style.display = 'none');
    spinner && (spinner.style.display = 'inline-block');
    if (btn) btn.disabled = true;

    try {
      const user = await Auth.verifyEmailOtp(username, code);
      Auth._enterApp(user);
    } catch (err) {
      Toast.show(err.message, 'danger');
    } finally {
      btnText && (btnText.style.display = 'inline-block');
      spinner && (spinner.style.display = 'none');
      if (btn) btn.disabled = false;
    }
  });

  // ── Resend code link ──────────────────────────────────────────
  document.getElementById('resendOtpLink')?.addEventListener('click', async function () {
    const username = Auth._pendingUsername;
    if (!username) { Auth._showStep('credentials'); return; }
    this.style.pointerEvents = 'none';
    this.textContent = 'Sending…';
    try {
      await Auth.resendOtp(username);
      Toast.show('New code sent — check your inbox.', 'success');
    } catch (err) {
      Toast.show(err.message, 'danger');
    } finally {
      this.textContent = 'Resend code';
      this.style.pointerEvents = '';
    }
  });

  // ── Back to sign-in link ──────────────────────────────────────
  document.getElementById('backToLoginLink')?.addEventListener('click', function () {
    Auth._pendingUsername = null;
    Auth._showStep('credentials');
    document.getElementById('twoFactor').value = '';
  });

  // ── Logout button ─────────────────────────────────────────────
  document.getElementById('logoutBtn')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof showConfirmation === 'function') {
      showConfirmation('Confirm Logout', 'Are you sure you want to log out?', () => Auth.logout());
    } else {
      Auth.logout();
    }
  });

  // ── Browser back guard ────────────────────────────────────────
  window.history.pushState(null, '', window.location.href);
  window.addEventListener('popstate', function () {
    if (window.currentUser) Auth.logout('Logged out for security. Please sign in again.');
    window.history.pushState(null, '', window.location.href);
  });

  // ── Idle reset on user activity ───────────────────────────────
  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => { if (window.currentUser) Auth.resetIdleTimer(); }, { passive: true });
  });
});

window.Auth = Auth;
