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
  
  window.DB.notifications.forEach(notification => {
    const div = document.createElement('div');
    div.className = `notification-item ${notification.read ? '' : 'unread'}`;
    div.style.cssText = 'padding: 12px; border-bottom: 1px solid var(--gray-200); cursor: pointer;';
    div.innerHTML = `
      <div style="font-weight: 600; color: var(--gray-900);">${notification.title}</div>
      <div style="font-size: 0.9rem; color: var(--gray-600); margin: 4px 0;">${notification.message}</div>
      <div style="font-size: 0.8rem; color: var(--gray-500);">${notification.date}</div>
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
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
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

// Dark Mode Toggle
document.addEventListener('DOMContentLoaded', function() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', function() {
      document.body.classList.toggle('dark-mode');
      const icon = this.querySelector('i');
      if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
        localStorage.setItem('hrpms-dark-mode', 'enabled');
        Toast.show('Dark mode enabled', 'success');
      } else {
        icon.className = 'fas fa-moon';
        localStorage.setItem('hrpms-dark-mode', 'disabled');
        Toast.show('Light mode enabled', 'success');
      }
    });
    
    // Check for saved dark mode preference
    if (localStorage.getItem('hrpms-dark-mode') === 'enabled') {
      document.body.classList.add('dark-mode');
      darkModeToggle.querySelector('i').className = 'fas fa-sun';
    }
  }
});

// Close notification panel when clicking outside
document.addEventListener('click', function(e) {
  const panel = document.getElementById('notificationPanel');
  const bell = document.querySelector('.notification-bell');
  if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) {
    panel.style.display = 'none';
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
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