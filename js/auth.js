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

  static logout() {
    window.currentUser = null;
    window.currentEmployee = null;
    localStorage.removeItem('hrpms_user');

    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    
    // Clear login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();

    Toast.show('Logged out successfully', 'info');
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
}

// Initialize login form
document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      
      // Prevent submission if already logged in (extra safety to avoid ghost submissions)
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

        // Get employee data if user is employee
        if (user.employeeId) {
          window.currentEmployee = window.DB.employees.find(e => e.id === user.employeeId);
        }

        // Switch to app
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'flex';
        document.getElementById('current-user').textContent = user.name;
        document.getElementById('userRole').textContent = user.role;

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
});

// Export Auth to window object
window.Auth = Auth;