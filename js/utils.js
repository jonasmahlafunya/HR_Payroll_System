// Utility Functions

// Toast Notification System
class Toast {
  static show(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: 'check-circle',
      warning: 'exclamation-triangle',
      danger: 'times-circle',
      info: 'info-circle'
    };

    toast.innerHTML = `
      <i class="fas fa-${icons[type] || 'info-circle'} toast-icon"></i>
      <div class="toast-content">${message}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }

    return toast;
  }
}

// Modal System
function showModal(modalId, content = '') {
  // Check if modal already exists
  let modal = document.getElementById(modalId);

  if (!modal) {
    // Create modal if it doesn't exist
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    // Ensure fixed positioning for "popup" behavior regardless of scroll
    Object.assign(modal.style, {
      display: 'none',
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: '9999',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      overflowY: 'auto' // Allow scrolling within modal if needed
    });
    document.body.appendChild(modal);
  }

  if (content) {
    modal.innerHTML = content;
  }

  modal.style.display = 'flex';

  // Add click outside to close
  modal.onclick = function (e) {
    if (e.target === modal) {
      closeModal(modalId);
    }
  };

  return modal;
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Confirmation Dialog
function showConfirmation(title, message, onConfirm, onCancel = null) {
  const modalId = 'confirmationModal';
  const modalContent = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="btn btn-outline btn-sm" onclick="closeModal('${modalId}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 12px; padding: 20px; border-top: 1px solid var(--gray-200);">
        <button class="btn btn-outline" onclick="closeModal('${modalId}')${onCancel ? `; ${onCancel}()` : ''}">
          Cancel
        </button>
        <button class="btn btn-danger" id="confirmActionBtn">
          Confirm
        </button>
      </div>
    </div>
  `;

  const modal = showModal(modalId, modalContent);

  // Add confirm event
  document.getElementById('confirmActionBtn').onclick = function () {
    closeModal(modalId);
    if (onConfirm) onConfirm();
  };

  return modal;
}

// Form Validation
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return true;

  const requiredFields = form.querySelectorAll('[required]');
  let isValid = true;

  requiredFields.forEach(field => {
    if (!field.value.trim()) {
      field.style.borderColor = 'var(--danger)';
      isValid = false;
    } else {
      field.style.borderColor = '';
    }
  });

  return isValid;
}

// Date Formatting
function formatDate(date, format = 'long') {
  if (!date) return '';

  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString('en-ZA');
  } else if (format === 'long') {
    return d.toLocaleDateString('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return d.toISOString().split('T')[0];
}

// Currency Formatting (South African Rand)
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(amount);
}

// Generate Random ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Debounce Function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export utilities to window object
window.Toast = Toast;
window.showModal = showModal;
window.closeModal = closeModal;
window.showConfirmation = showConfirmation;
window.validateForm = validateForm;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
window.generateId = generateId;
window.debounce = debounce;