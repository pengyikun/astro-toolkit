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

  window.openConfirmModal = function (action, title, message, buttonLabel) {
    previousFocus = document.activeElement;
    if (title) titleEl.textContent = title;
    if (message) messageEl.textContent = message;
    // Dynamic button label — extract verb from title or use provided label
    var label = buttonLabel || (title ? title.split(' ')[0] : 'Delete');
    submitBtn.textContent = label;
    submitBtn.disabled = false;
    form.action = action;
    modal.classList.remove('hidden');
    cancelBtn.focus();
  };

  window.closeConfirmModal = function () {
    modal.classList.add('hidden');
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeConfirmModal();
    }
  });

  backdrop.addEventListener('click', closeConfirmModal);
  cancelBtn.addEventListener('click', closeConfirmModal);

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

  form.addEventListener('submit', function () {
    var label = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = label + '...';
  });
})();
