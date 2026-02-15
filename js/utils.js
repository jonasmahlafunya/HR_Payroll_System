// Utility Functions

// Toast Notification System
class Toast {
  static show(message, type = 'info', duration = 5000) {
    // INTERCEPTION: Redirect 'warning' and 'danger' to centered popup
    if (type === 'warning' || type === 'danger') {
      const title = type === 'danger' ? 'Error' : 'Attention';
      if (window.showAlert) {
        window.showAlert(title, message);
        return null; // Return null as no toast element is created
      }
    }

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

// Alert Dialog (Centered Popup)
function showAlert(title, message) {
  const modalId = 'alertModal';
  const modalContent = `
    <div class="modal-content" style="max-width: 400px; text-align: center;">
      <div class="modal-body" style="padding: 30px 20px;">
        <div style="width: 50px; height: 50px; background: var(--danger-light, #fee2e2); color: var(--danger); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; font-size: 1.5rem;">
          <i class="fas fa-exclamation"></i>
        </div>
        <h3 style="margin-bottom: 8px;">${title}</h3>
        <p style="color: var(--gray-600); margin-bottom: 0;">${message}</p>
      </div>
      <div class="modal-footer" style="padding: 16px; border-top: 1px solid var(--gray-200); display: flex; justify-content: center;">
        <button class="btn btn-primary" onclick="closeModal('${modalId}')" style="min-width: 100px;">
          OK
        </button>
      </div>
    </div>
  `;

  return showModal(modalId, modalContent);
}

window.showAlert = showAlert;

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
// Generic Wizard Class
class Wizard {
  constructor(config) {
    this.steps = config.steps;
    this.containerId = config.containerId;
    this.onFinish = config.onFinish;
    this.currentStep = 0;
    this.data = {};
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const step = this.steps[this.currentStep];
    const isFirst = this.currentStep === 0;
    const isLast = this.currentStep === this.steps.length - 1;

    // Progress Indicator
    const progressHtml = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 24px; position: relative;">
        <!-- Line background -->
        <div style="position: absolute; top: 14px; left: 0; right: 0; height: 2px; background: var(--gray-200); z-index: 0;"></div>
        ${this.steps.map((s, index) => `
          <div style="position: relative; z-index: 1; text-align: center; width: 80px;">
            <div style="width: 30px; height: 30px; border-radius: 50%; background: ${index <= this.currentStep ? 'var(--primary)' : 'var(--white)'}; border: 2px solid ${index <= this.currentStep ? 'var(--primary)' : 'var(--gray-300)'}; color: ${index <= this.currentStep ? 'white' : 'var(--gray-500)'}; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px auto; font-weight: 600; font-size: 0.8rem;">
              ${index + 1}
            </div>
            <div style="font-size: 0.75rem; color: ${index === this.currentStep ? 'var(--primary)' : 'var(--gray-500)'}; font-weight: ${index === this.currentStep ? '600' : '400'};">${s.title}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Step Content
    const contentHtml = `
      <div id="wizard-step-content" style="min-height: 200px; margin-bottom: 24px;">
        ${step.template}
      </div>
    `;

    // Navigation Buttons
    const buttonsHtml = `
      <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--gray-200); padding-top: 20px;">
        <button class="btn btn-outline" onclick="window.currentWizard.prev()" ${isFirst ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Back</button>
        <button class="btn btn-primary" onclick="window.currentWizard.next()">${isLast ? 'Complete & Create' : 'Next Step'}</button>
      </div>
    `;

    container.innerHTML = `
      <div style="padding: 10px;">
        ${progressHtml}
        <h4 style="margin-bottom: 16px; color: var(--gray-800);">${step.title}</h4>
        ${contentHtml}
        ${buttonsHtml}
      </div>
    `;

    // Restore data if exists
    this.restoreData();
    // Execute onShow callback if any setup is needed (e.g., event listeners)
    if (step.onShow) step.onShow();
  }

  next() {
    const step = this.steps[this.currentStep];

    // Save current step data
    this.saveData();

    // Validate
    if (step.validate && !step.validate()) {
      return;
    }

    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.render();
    } else {
      this.onFinish(this.data);
    }
  }

  prev() {
    if (this.currentStep > 0) {
      this.saveData(); // Save content before going back
      this.currentStep--;
      this.render();
    }
  }

  saveData() {
    // Basic auto-save for inputs with IDs
    const container = document.getElementById('wizard-step-content');
    if (!container) return;

    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.id) {
        this.data[input.id] = input.value;
      }
    });
  }

  restoreData() {
    // Basic auto-restore
    Object.keys(this.data).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = this.data[id];
    });
  }
}

// Global Search Function
window.performGlobalSearch = function (searchTerm) {
  const term = searchTerm.toLowerCase().trim();

  if (!term) {
    const tables = document.querySelectorAll('table tbody tr');
    tables.forEach(row => row.style.display = '');
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => card.style.display = '');
    return;
  }

  const tables = document.querySelectorAll('table tbody tr');
  if (tables.length > 0) {
    tables.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  }

  const cards = document.querySelectorAll('.card');
  if (cards.length > 0) {
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(term) ? '' : 'none';
    });
  }
};

window.Wizard = Wizard;
