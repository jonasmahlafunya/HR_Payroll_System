// ─── Utility Functions ────────────────────────────────────────────────────────

// Toast Notification System
class Toast {
  static show(message, type = 'info', duration = 5000) {
    if (type === 'danger') {
      if (window.showAlert) { window.showAlert('Error', message, 'danger'); return null; }
    }

    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: 'check-circle', warning: 'exclamation-triangle',
      danger: 'times-circle', info: 'info-circle', error: 'times-circle'
    };

    toast.innerHTML = `
      <div class="toast-icon"><i class="fas fa-${icons[type] || 'info-circle'}"></i></div>
      <div class="toast-content">${message}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>`;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

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
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement('div');
    modal.id        = modalId;
    modal.className = 'modal';
    Object.assign(modal.style, {
      display: 'none', position: 'fixed', top: '0', left: '0',
      width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: '9999', justifyContent: 'center',
      alignItems: 'center', padding: '20px', overflowY: 'auto'
    });
    document.body.appendChild(modal);
  }

  if (content) modal.innerHTML = content;
  modal.style.display = 'flex';

  modal.onclick = function (e) {
    if (e.target === modal) closeModal(modalId);
  };

  return modal;
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

// Confirmation Dialog
function showConfirmation(title, message, onConfirm, onCancel = null) {
  const backdropId = 'nexaConfirmBackdrop';
  const existing   = document.getElementById(backdropId);
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id        = backdropId;
  backdrop.className = 'nexa-alert-backdrop';
  backdrop.innerHTML = `
    <div class="nexa-confirm-box">
      <div class="nexa-confirm-header">
        <h3>${title}</h3>
        <button class="btn btn-sm btn-outline"
          onclick="document.getElementById('${backdropId}').remove()"
          style="padding:4px 8px;border-radius:6px;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="nexa-confirm-body">${message}</div>
      <div class="nexa-confirm-footer">
        <button class="btn btn-outline" id="nexaCancelBtn">Cancel</button>
        <button class="btn btn-danger"  id="nexaConfirmBtn">Confirm</button>
      </div>
    </div>`;

  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);

  document.getElementById('nexaConfirmBtn').onclick = () => { backdrop.remove(); if (onConfirm) onConfirm(); };
  document.getElementById('nexaCancelBtn').onclick  = () => { backdrop.remove(); if (onCancel)  onCancel();  };

  return backdrop;
}

// Alert Dialog
function showAlert(title, message, type = 'danger') {
  const backdropId = 'nexaAlertBackdrop';
  const existing   = document.getElementById(backdropId);
  if (existing) existing.remove();

  const iconMap = {
    danger:  { icon: 'exclamation',          cls: 'danger'  },
    warning: { icon: 'exclamation-triangle', cls: 'warning' },
    success: { icon: 'check',                cls: 'success' },
    info:    { icon: 'info',                 cls: 'info'    },
  };
  const t = iconMap[type] || iconMap.danger;

  const backdrop = document.createElement('div');
  backdrop.id        = backdropId;
  backdrop.className = 'nexa-alert-backdrop';
  backdrop.innerHTML = `
    <div class="nexa-alert-box">
      <div class="nexa-alert-icon-wrap">
        <div class="nexa-alert-icon ${t.cls}"><i class="fas fa-${t.icon}"></i></div>
      </div>
      <div class="nexa-alert-body">
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
      <div class="nexa-alert-footer">
        <button class="btn btn-primary" id="nexaAlertOkBtn" style="min-width:100px;">OK</button>
      </div>
    </div>`;

  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);
  document.getElementById('nexaAlertOkBtn').onclick = () => backdrop.remove();

  return backdrop;
}

window.showAlert = showAlert;

// Form Validation
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return true;
  let isValid = true;
  form.querySelectorAll('[required]').forEach(field => {
    if (!field.value.trim()) { field.style.borderColor = 'var(--danger)'; isValid = false; }
    else field.style.borderColor = '';
  });
  return isValid;
}

// Date / Currency helpers
function formatDate(date, format = 'long') {
  if (!date) return '';
  const d = new Date(date);
  if (format === 'short')  return d.toLocaleDateString('en-ZA');
  if (format === 'long')   return d.toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  return d.toISOString().split('T')[0];
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZA', { style:'currency', currency:'ZAR', minimumFractionDigits:2 }).format(amount || 0);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Wizard Class
// ─────────────────────────────────────────────────────────────────────────────
class Wizard {
  constructor(config) {
    this.steps         = config.steps;
    this.containerId   = config.containerId;
    this.onFinish      = config.onFinish;
    this.currentStep   = 0;
    this.data          = {};
    this.isTransitioning = false;
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const step    = this.steps[this.currentStep];
    const isFirst = this.currentStep === 0;
    const isLast  = this.currentStep === this.steps.length - 1;

    // Progress bar
    const progressHtml = `
      <div style="display:flex;justify-content:space-between;margin-bottom:24px;position:relative;">
        <div style="position:absolute;top:14px;left:0;right:0;height:2px;
                    background:var(--gray-200);z-index:0;"></div>
        ${this.steps.map((s, i) => `
          <div style="position:relative;z-index:1;text-align:center;width:80px;">
            <div style="width:30px;height:30px;border-radius:50%;
                        background:${i <= this.currentStep ? 'var(--primary)' : 'var(--white)'};
                        border:2px solid ${i <= this.currentStep ? 'var(--primary)' : 'var(--gray-300)'};
                        color:${i <= this.currentStep ? 'white' : 'var(--gray-500)'};
                        display:flex;align-items:center;justify-content:center;
                        margin:0 auto 8px;font-weight:600;font-size:0.8rem;">
              ${i + 1}
            </div>
            <div style="font-size:0.75rem;
                        color:${i === this.currentStep ? 'var(--primary)' : 'var(--gray-500)'};
                        font-weight:${i === this.currentStep ? '600' : '400'};">
              ${s.title}
            </div>
          </div>`).join('')}
      </div>`;

    container.innerHTML = `
      <div style="padding:10px;">
        ${progressHtml}
        <h4 style="margin-bottom:16px;color:var(--gray-800);">${step.title}</h4>
        <div id="wizard-step-content" style="min-height:200px;margin-bottom:24px;">
          ${step.template}
        </div>
        <div style="display:flex;justify-content:space-between;
                    border-top:1px solid var(--gray-200);padding-top:20px;">
          <button class="btn btn-outline"
            onclick="window.currentWizard.prev()"
            ${isFirst ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
            Back
          </button>
          <button class="btn btn-primary" id="wizardNextBtn"
            onclick="window.currentWizard.next()">
            ${isLast ? 'Complete & Create' : 'Next Step'}
          </button>
        </div>
      </div>`;

    this.restoreData();
    if (step.onShow) step.onShow();
  }

  // ── FIXED next() — resets isTransitioning even when validate throws ────────
  next() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    try {
      this.saveData();

      const step = this.steps[this.currentStep];

      // Run validate — reset flag and bail on failure
      if (step.validate) {
        let valid = false;
        try {
          valid = step.validate();
        } catch (validateErr) {
          console.error('[Wizard] validate() threw:', validateErr);
          window.Toast.show('Validation error: ' + validateErr.message, 'warning');
          this.isTransitioning = false;
          return;
        }
        if (!valid) {
          this.isTransitioning = false;
          return;
        }
      }

      if (this.currentStep < this.steps.length - 1) {
        this.currentStep++;
        this.render();
      } else {
        this.onFinish(this.data);
      }
    } catch (err) {
      console.error('[Wizard] next() error:', err);
      window.Toast.show('Unexpected error: ' + err.message, 'warning');
    } finally {
      // Always reset the flag after a short delay so rapid double-clicks are
      // still debounced, but a failed click never permanently locks the wizard
      setTimeout(() => { this.isTransitioning = false; }, 350);
    }
  }

  prev() {
    if (this.isTransitioning) return;
    if (this.currentStep > 0) {
      this.saveData();
      this.currentStep--;
      this.render();
    }
  }

  // ── Save data from the current step's inputs into this.data ───────────────
  saveData() {
    const container = document.getElementById('wizard-step-content');
    if (!container) return;
    container.querySelectorAll('input, select, textarea').forEach(input => {
      if (input.id) this.data[input.id] = input.value;
    });
  }

  // ── Restore saved values when re-rendering a previous step ────────────────
  restoreData() {
    Object.keys(this.data).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = this.data[id];
    });
  }
}

// Global search
window.performGlobalSearch = function (searchTerm) {
  const term = (searchTerm || '').toLowerCase().trim();
  document.querySelectorAll('table tbody tr').forEach(row => {
    row.style.display = !term || row.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
};

// Exports
window.Toast            = Toast;
window.showModal        = showModal;
window.closeModal       = closeModal;
window.showConfirmation = showConfirmation;
window.validateForm     = validateForm;
window.formatDate       = formatDate;
window.formatCurrency   = formatCurrency;
window.generateId       = generateId;
window.debounce         = debounce;
window.Wizard           = Wizard;