(function () {
  var form = document.getElementById('account-form');
  if (!form) return;

  var stepButtons = Array.prototype.slice.call(document.querySelectorAll('[data-step-target]'));
  var stepPanels = Array.prototype.slice.call(document.querySelectorAll('[data-step-panel]'));
  var nextButtons = Array.prototype.slice.call(document.querySelectorAll('[data-next-step]'));
  var prevButtons = Array.prototype.slice.call(document.querySelectorAll('[data-prev-step]'));
  var currentStep = 1;

  var searchInput = document.getElementById('region-search');
  var hiddenInput = document.getElementById('region_code');
  var dropdown = document.getElementById('region-dropdown');
  var noMatch = document.getElementById('region-no-match');
  var currencyInput = document.getElementById('currency');
  var options = Array.prototype.slice.call(document.querySelectorAll('.region-option'));
  var transferRadios = Array.prototype.slice.call(document.querySelectorAll('.transfer-type-radio'));
  var accountTypeRadios = Array.prototype.slice.call(document.querySelectorAll('.account-type-radio'));
  var internationalFields = document.getElementById('international-fields');
  var domesticFields = document.getElementById('domestic-fields');
  var regionFieldsContainer = document.getElementById('region-fields-container');
  var regionFields = document.getElementById('region-fields');
  var regionTitle = document.getElementById('region-fields-title');
  var addCustomFieldButton = document.getElementById('add-custom-field');
  var customFieldsContainer = document.getElementById('custom-fields');
  var customFieldsEmpty = document.getElementById('custom-fields-empty');

  function showStep(step) {
    currentStep = step;
    stepButtons.forEach(function (button) {
      var target = Number(button.getAttribute('data-step-target'));
      button.classList.toggle('is-active', target === currentStep);
      button.setAttribute('aria-current', target === currentStep ? 'step' : 'false');
    });
    stepPanels.forEach(function (panel) {
      panel.classList.toggle('is-active', Number(panel.getAttribute('data-step-panel')) === currentStep);
    });
    updateStepCompletion();
    var activePanel = stepPanels.find(function (panel) {
      return Number(panel.getAttribute('data-step-panel')) === currentStep;
    });
    if (activePanel) {
      activePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function validateStep(step) {
    var panel = stepPanels.find(function (item) {
      return Number(item.getAttribute('data-step-panel')) === step;
    });
    if (!panel) return true;

    var fields = Array.prototype.slice.call(panel.querySelectorAll('input, select, textarea')).filter(function (field) {
      if (field.disabled || field.type === 'hidden' || !field.willValidate) return false;
      if (field.closest('.hidden')) return false;
      return true;
    });

    var firstInvalid = null;
    var valid = fields.every(function (field) {
      var fieldValid = field.reportValidity();
      if (!fieldValid && !firstInvalid) {
        firstInvalid = field;
      }
      return fieldValid;
    });

    if (firstInvalid) {
      firstInvalid.focus();
    }

    return valid;
  }

  function updateSummary(key, value) {
    Array.prototype.slice.call(document.querySelectorAll('[data-summary="' + key + '"]')).forEach(function (el) {
      el.textContent = value;
    });
  }

  function updateStepCompletion() {
    var completion = {
      1: Boolean((document.getElementById('name') || {}).value && hiddenInput.value && getCheckedValue(accountTypeRadios) && getCheckedValue(transferRadios)),
      2: getCheckedValue(transferRadios) === 'international'
        ? Boolean((document.getElementById('generic_account_holder') || {}).value || (document.getElementById('generic_iban') || {}).value || (document.getElementById('generic_swift_bic') || {}).value)
        : Boolean(hiddenInput.value && regionFieldsContainer && !regionFieldsContainer.classList.contains('hidden')),
      3: true,
      4: false,
    };

    stepButtons.forEach(function (button) {
      var target = Number(button.getAttribute('data-step-target'));
      button.classList.toggle('is-complete', Boolean(completion[target]) && target !== currentStep);
    });
  }

  function getCheckedValue(radios) {
    var match = radios.find(function (radio) { return radio.checked; });
    return match ? match.value : '';
  }

  function updateChoiceCards(radios) {
    radios.forEach(function (radio) {
      var card = radio.closest('.record-card');
      if (!card) return;
      card.classList.toggle('is-selected', radio.checked);
    });
  }

  function updateTransferVisibility() {
    var transfer = getCheckedValue(transferRadios) || 'domestic';
    updateSummary('transfer', transfer);

    if (internationalFields) {
      internationalFields.classList.toggle('hidden', transfer !== 'international');
    }
    if (domesticFields) {
      domesticFields.classList.toggle('hidden', transfer === 'international');
    }
    if (regionFieldsContainer) {
      regionFieldsContainer.classList.toggle('hidden', transfer === 'international' || !hiddenInput.value);
    }
  }

  function clearRegionFields() {
    if (!regionFieldsContainer || !regionFields) return;
    regionFields.innerHTML = '';
    regionFieldsContainer.classList.add('hidden');
  }

  function addHidden(parent, name, value) {
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    parent.appendChild(input);
  }

  function buildRegionField(field) {
    var wrapper = document.createElement('div');
    var label = document.createElement('label');
    label.className = 'console-label';
    label.innerHTML = field.label + (field.required ? ' <span class="text-danger">*</span>' : '');
    wrapper.appendChild(label);

    addHidden(wrapper, 'field_key[]', field.key);
    addHidden(wrapper, 'field_label[]', field.label);
    addHidden(wrapper, 'field_type[]', field.type || 'text');
    addHidden(wrapper, 'field_is_custom[]', '0');

    if (field.type === 'textarea') {
      var textarea = document.createElement('textarea');
      textarea.name = 'field_value[]';
      textarea.rows = 3;
      textarea.className = 'console-textarea';
      textarea.placeholder = field.placeholder || '';
      textarea.required = Boolean(field.required);
      wrapper.appendChild(textarea);
      return wrapper;
    }

    if (field.type === 'select' && field.options) {
      var select = document.createElement('select');
      select.name = 'field_value[]';
      select.className = 'console-select';
      select.required = Boolean(field.required);
      var defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select...';
      select.appendChild(defaultOption);
      field.options.forEach(function (optionValue) {
        var option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        select.appendChild(option);
      });
      wrapper.appendChild(select);
      return wrapper;
    }

    var input = document.createElement('input');
    input.type = 'text';
    input.name = 'field_value[]';
    input.className = 'console-input';
    input.placeholder = field.placeholder || '';
    input.required = Boolean(field.required);
    if (field.validation) input.pattern = field.validation;
    wrapper.appendChild(input);
    return wrapper;
  }

  function loadRegionFields(code) {
    if (!regionFieldsContainer || !regionFields) return;

    regionFieldsContainer.classList.remove('hidden');
    regionTitle.textContent = code;
    regionFields.innerHTML = '<p class="text-sm text-ink-secondary">Loading schema for ' + code + '…</p>';

    fetch('/api/regions/' + code + '/fields')
      .then(function (response) { return response.json(); })
      .then(function (fields) {
        if (!fields || !fields.length) {
          clearRegionFields();
          return;
        }

        regionFieldsContainer.classList.toggle('hidden', getCheckedValue(transferRadios) === 'international');
        regionFields.innerHTML = '';
        regionTitle.textContent = code;

        fields.forEach(function (field) {
          regionFields.appendChild(buildRegionField(field));
        });

        updateStepCompletion();
      })
      .catch(function () {
        regionFields.innerHTML = '<p class="text-sm text-danger">Failed to load region fields. Please try again.</p>';
      });
  }

  function filterOptions(query) {
    var q = query.toLowerCase().trim();
    var anyVisible = false;
    options.forEach(function (option) {
      var values = [
        option.getAttribute('data-name'),
        option.getAttribute('data-code'),
        option.getAttribute('data-currency'),
      ].join(' ').toLowerCase();
      var match = !q || values.indexOf(q) !== -1;
      option.style.display = match ? '' : 'none';
      anyVisible = anyVisible || match;
    });

    if (noMatch) {
      noMatch.classList.toggle('hidden', anyVisible);
    }
  }

  function selectRegion(option) {
    var code = option.getAttribute('data-code');
    var name = option.getAttribute('data-name');
    var currency = option.getAttribute('data-currency');

    hiddenInput.value = code;
    searchInput.value = name + ' (' + code + ')';
    currencyInput.value = currency;
    dropdown.classList.add('hidden');

    updateSummary('region', code);
    updateSummary('currency', currency);

    if (getCheckedValue(transferRadios) !== 'international') {
      loadRegionFields(code);
    } else {
      clearRegionFields();
    }

    updateStepCompletion();
  }

  function hideDropdownOnOutsideClick(event) {
    if (!searchInput || !dropdown) return;
    if (!searchInput.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.classList.add('hidden');
    }
  }

  function ensureCustomFieldsEmptyState() {
    if (!customFieldsContainer) return;
    var rows = customFieldsContainer.querySelectorAll('.custom-field-row').length;
    if (customFieldsEmpty) {
      customFieldsEmpty.classList.toggle('hidden', rows > 0);
    }
  }

  function createCustomFieldRow() {
    var row = document.createElement('div');
    row.className = 'custom-field-row grid gap-3 lg:grid-cols-[1fr_1fr_1.3fr_auto]';
    row.innerHTML = '' +
      '<input type="text" name="field_key[]" placeholder="field_key" class="console-input font-mono">' +
      '<input type="text" name="field_label[]" placeholder="Display label" class="console-input">' +
      '<input type="text" name="field_value[]" placeholder="Stored value" class="console-input">' +
      '<input type="hidden" name="field_type[]" value="text">' +
      '<input type="hidden" name="field_is_custom[]" value="1">' +
      '<button type="button" class="console-button-danger !min-h-0 !px-4 !py-2 custom-field-remove">Remove</button>';
    return row;
  }

  function bindCustomFieldRemovals() {
    Array.prototype.slice.call(document.querySelectorAll('.custom-field-remove')).forEach(function (button) {
      button.onclick = function () {
        var row = button.closest('.custom-field-row');
        if (row) row.remove();
        ensureCustomFieldsEmptyState();
      };
    });
  }

  nextButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (!validateStep(currentStep)) return;
      showStep(Number(button.getAttribute('data-next-step')));
    });
  });

  prevButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      showStep(Number(button.getAttribute('data-prev-step')));
    });
  });

  stepButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var target = Number(button.getAttribute('data-step-target'));
      if (target > currentStep && !validateStep(currentStep)) return;
      showStep(target);
    });
  });

  if (searchInput && dropdown) {
    var highlightedIndex = -1;

    searchInput.addEventListener('focus', function () {
      dropdown.classList.remove('hidden');
      filterOptions(searchInput.value);
    });

    searchInput.addEventListener('input', function () {
      dropdown.classList.remove('hidden');
      filterOptions(searchInput.value);
      if (!searchInput.value.trim()) {
        hiddenInput.value = '';
        currencyInput.value = '';
        updateSummary('region', 'Select region');
        updateSummary('currency', '---');
        clearRegionFields();
        updateStepCompletion();
      }
    });

    searchInput.addEventListener('keydown', function (event) {
      var visible = options.filter(function (option) {
        return option.style.display !== 'none';
      });

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, visible.length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, 0);
      } else if (event.key === 'Enter' && highlightedIndex >= 0 && visible[highlightedIndex]) {
        event.preventDefault();
        selectRegion(visible[highlightedIndex]);
        highlightedIndex = -1;
        return;
      } else if (event.key === 'Escape') {
        dropdown.classList.add('hidden');
        highlightedIndex = -1;
      } else {
        return;
      }

      options.forEach(function (option) {
        option.classList.remove('bg-brand-light');
      });

      if (visible[highlightedIndex]) {
        visible[highlightedIndex].classList.add('bg-brand-light');
        visible[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    });

    options.forEach(function (option) {
      option.addEventListener('click', function () {
        selectRegion(option);
      });
    });

    document.addEventListener('click', hideDropdownOnOutsideClick);
  }

  transferRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      updateChoiceCards(transferRadios);
      updateTransferVisibility();
      if (hiddenInput.value && getCheckedValue(transferRadios) !== 'international') {
        loadRegionFields(hiddenInput.value);
      } else if (getCheckedValue(transferRadios) === 'international') {
        clearRegionFields();
      }
      updateStepCompletion();
    });
  });

  accountTypeRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      updateChoiceCards(accountTypeRadios);
      updateSummary('type', radio.value);
      updateStepCompletion();
    });
  });

  var nameInput = document.getElementById('name');
  if (nameInput) {
    nameInput.addEventListener('input', function () {
      updateSummary('name', nameInput.value || 'Unassigned');
      updateStepCompletion();
    });
  }

  ['generic_account_holder', 'generic_bank_name', 'generic_account_number', 'generic_iban', 'generic_swift_bic'].forEach(function (id) {
    var field = document.getElementById(id);
    if (field) {
      field.addEventListener('input', updateStepCompletion);
    }
  });

  if (addCustomFieldButton && customFieldsContainer) {
    addCustomFieldButton.addEventListener('click', function () {
      customFieldsContainer.appendChild(createCustomFieldRow());
      bindCustomFieldRemovals();
      ensureCustomFieldsEmptyState();
    });
  }

  bindCustomFieldRemovals();
  ensureCustomFieldsEmptyState();
  updateChoiceCards(accountTypeRadios);
  updateChoiceCards(transferRadios);
  updateTransferVisibility();
  updateStepCompletion();
  showStep(1);
})();
