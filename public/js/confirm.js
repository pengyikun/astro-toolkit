(function () {
  var modal = document.getElementById('confirm-modal');
  var form = document.getElementById('confirm-modal-form');
  var titleEl = document.getElementById('confirm-modal-title');
  var messageEl = document.getElementById('confirm-modal-message');
  var cancelBtn = document.getElementById('confirm-modal-cancel');
  var submitBtn = document.getElementById('confirm-modal-submit');
  var backdrop = document.getElementById('confirm-modal-backdrop');
  var previousFocus = null;

  if (!modal || !form) return;

  window.openConfirmModal = function (action, title, message) {
    previousFocus = document.activeElement;
    if (title) titleEl.textContent = title;
    if (message) messageEl.textContent = message;
    form.action = action;
    modal.classList.remove('hidden');
    // Focus the cancel button for safe default
    cancelBtn.focus();
  };

  window.closeConfirmModal = function () {
    modal.classList.add('hidden');
    // Restore focus to the element that opened the modal
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }
  };

  // Escape key closes modal
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeConfirmModal();
    }
  });

  // Backdrop click closes modal
  backdrop.addEventListener('click', closeConfirmModal);

  // Cancel button
  cancelBtn.addEventListener('click', closeConfirmModal);

  // Focus trap - keep Tab within the modal
  modal.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var focusable = modal.querySelectorAll('button:not([disabled]), [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])');
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Double-submit prevention
  form.addEventListener('submit', function () {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Deleting...';
  });
})();
