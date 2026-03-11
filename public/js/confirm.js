function openConfirmModal(action, title, message) {
  var modal = document.getElementById('confirm-modal');
  var form = document.getElementById('confirm-modal-form');
  var titleEl = document.getElementById('confirm-modal-title');
  var messageEl = document.getElementById('confirm-modal-message');
  if (title) titleEl.textContent = title;
  if (message) messageEl.textContent = message;
  form.action = action;
  modal.classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
}