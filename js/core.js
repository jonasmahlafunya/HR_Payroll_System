// Core Application Functionality

// Chart Manager
class ChartManager {
  static charts = {};

  static createChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }
    this.charts[canvasId] = new Chart(ctx, config);
    return this.charts[canvasId];
  }

  static destroyChart(canvasId) {
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
      delete this.charts[canvasId];
    }
  }

  static getChart(canvasId) {
    return this.charts[canvasId];
  }
}

// Notification System
function updateNotificationCount() {
  const unread = window.DB?.notifications?.filter(n => !n.read).length || 0;
  const countElement = document.getElementById('notificationCount');
  if (countElement) {
    countElement.textContent = unread;
    countElement.style.display = unread > 0 ? 'inline-flex' : 'none';
  }
}

function showNotifications() {
  const panel = document.getElementById('notificationPanel');
  if (panel.style.display === 'block') {
    panel.style.display = 'none';
  } else {
    panel.style.display = 'block';
    renderNotifications();
  }
}

function renderNotifications() {
  const container = document.getElementById('notificationList');
  if (!container) return;

  container.innerHTML = '';

  if (!window.DB?.notifications?.length) {
    container.innerHTML = `<div style="padding: 24px; text-align: center; color: #94A3B8; font-size: 0.85rem;">
      <i class="fas fa-bell-slash" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i>
      No notifications
    </div>`;
    return;
  }

  const typeConfig = {
    leave: { icon: 'plane-departure', bg: '#FEF3C7', color: '#D97706' },
    payroll: { icon: 'money-bill-wave', bg: '#DCFCE7', color: '#16A34A' },
    system: { icon: 'cog', bg: '#DBEAFE', color: '#2563EB' },
    alert: { icon: 'exclamation', bg: '#FEE2E2', color: '#DC2626' },
    info: { icon: 'info-circle', bg: '#DBEAFE', color: '#2563EB' },
  };

  window.DB.notifications.forEach(notification => {
    const cfg = typeConfig[notification.type] || typeConfig.info;
    const div = document.createElement('div');
    div.className = 'notif-item';
    div.innerHTML = `
      <div class="notif-item-icon" style="background: ${cfg.bg}; color: ${cfg.color};">
        <i class="fas fa-${cfg.icon}"></i>
      </div>
      <div class="notif-item-body">
        <div class="notif-item-title">${notification.title}</div>
        <div class="notif-item-desc">${notification.message}</div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
        <span class="notif-item-time">${notification.date || 'Now'}</span>
        ${!notification.read ? '<div class="notif-unread-dot"></div>' : ''}
      </div>
    `;

    div.addEventListener('click', () => {
      notification.read = true;
      updateNotificationCount();
      renderNotifications();
      Toast.show('Notification marked as read', 'info');
    });

    container.appendChild(div);
  });
}

function markAllAsRead() {
  window.DB.notifications.forEach(n => n.read = true);
  updateNotificationCount();
  renderNotifications();
  Toast.show('All notifications marked as read', 'success');
}

// Global Search
let searchTimeout;
document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length > 2) {
          performGlobalSearch(query);
        }
      }, 300);
    });
  }
});

function performGlobalSearch(query) {
  const results = [];

  // Search employees
  window.DB.employees.forEach(emp => {
    if (
      emp.firstName.toLowerCase().includes(query.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(query.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(query.toLowerCase()) ||
      emp.email.toLowerCase().includes(query.toLowerCase())
    ) {
      results.push({
        type: 'Employee',
        title: `${emp.firstName} ${emp.lastName}`,
        subtitle: emp.position,
        action: () => viewEmployee(emp.id)
      });
    }
  });

  // Show search results in toast
  if (results.length > 0) {
    Toast.show(`Found ${results.length} results for "${query}"`, 'info');
  } else {
    Toast.show(`No results found for "${query}"`, 'warning');
  }
}

function viewEmployee(empId) {
  const employee = window.DB.employees.find(e => e.id === empId);
  if (employee) {
    Toast.show(`Viewing ${employee.firstName} ${employee.lastName}`, 'info');
    loadPage('employees');
    // In a real app, you would scroll to or highlight the employee
  }
}

// Close notification panel when clicking outside
document.addEventListener('click', function (e) {
  const panel = document.getElementById('notificationPanel');
  const bell = document.querySelector('.notification-bell');
  if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) {
    panel.style.display = 'none';
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
  // Ctrl/Cmd + K for search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) searchInput.focus();
  }

  // Escape to close modals and panels
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(modal => {
      if (modal.style.display === 'flex') {
        modal.style.display = 'none';
      }
    });
    document.getElementById('notificationPanel').style.display = 'none';
  }
});

// Print functionality
function printPage() {
  window.print();
}

// Export functionality
function exportData(format, data, filename) {
  Toast.show(`Exporting data as ${format}...`, 'info');
  // In a real application, this would generate and download the file
  setTimeout(() => {
    Toast.show(`Data exported successfully as ${format}`, 'success');

    // Create download link
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

// Initialize notification count
updateNotificationCount();

// Export core functions
window.ChartManager = ChartManager;
window.showNotifications = showNotifications;
window.markAllAsRead = markAllAsRead;
window.performGlobalSearch = performGlobalSearch;
window.printPage = printPage;
window.exportData = exportData;