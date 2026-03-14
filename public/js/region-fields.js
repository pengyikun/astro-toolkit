(function () {
  // ── Searchable Region Dropdown ──────────────────────────────────────────
  var searchInput = document.getElementById('region-search');
  var hiddenInput = document.getElementById('region_code');
  var dropdown = document.getElementById('region-dropdown');
  var noMatch = document.getElementById('region-no-match');
  var currencyInput = document.getElementById('currency');
  var options = document.querySelectorAll('.region-option');

  if (!searchInput || !dropdown) return;

  searchInput.addEventListener('focus', function () {
    dropdown.classList.remove('hidden');
    filterOptions(searchInput.value);
  });

  searchInput.addEventListener('input', function () {
    dropdown.classList.remove('hidden');
    filterOptions(searchInput.value);
    // If user clears search, clear the selection
    if (!searchInput.value.trim()) {
      hiddenInput.value = '';
      currencyInput.value = '';
      updateSummary('summary-region', '---');
      updateSummary('summary-currency', '---');
    }
  });

  // Keyboard navigation for dropdown
  var highlightedIndex = -1;
  searchInput.addEventListener('keydown', function (e) {
    var visible = [];
    options.forEach(function (opt) {
      if (opt.style.display !== 'none') visible.push(opt);
    });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, visible.length - 1);
      updateHighlight(visible);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      updateHighlight(visible);
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && visible[highlightedIndex]) {
      e.preventDefault();
      visible[highlightedIndex].click();
      highlightedIndex = -1;
    } else if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
      highlightedIndex = -1;
    }
  });

  function updateHighlight(visibleOptions) {
    options.forEach(function (opt) { opt.classList.remove('bg-brand/10'); });
    if (highlightedIndex >= 0 && visibleOptions[highlightedIndex]) {
      visibleOptions[highlightedIndex].classList.add('bg-brand/10');
      visibleOptions[highlightedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  document.addEventListener('click', function (e) {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  options.forEach(function (opt) {
    opt.addEventListener('click', function () {
      var code = opt.getAttribute('data-code');
      var name = opt.getAttribute('data-name');
      var currency = opt.getAttribute('data-currency');

      hiddenInput.value = code;
      searchInput.value = name + ' (' + code + ')';
      currencyInput.value = currency;
      dropdown.classList.add('hidden');

      updateSummary('summary-region', code);
      updateSummary('summary-currency', currency);

      // Load region-specific fields
      loadRegionFields(code);
    });
  });

  function filterOptions(query) {
    var q = query.toLowerCase().trim();
    var anyVisible = false;
    options.forEach(function (opt) {
      var name = opt.getAttribute('data-name').toLowerCase();
      var code = opt.getAttribute('data-code').toLowerCase();
      var currency = opt.getAttribute('data-currency').toLowerCase();
      var match = !q || name.indexOf(q) !== -1 || code.indexOf(q) !== -1 || currency.indexOf(q) !== -1;
      opt.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });
    if (noMatch) {
      noMatch.style.display = anyVisible ? 'none' : '';
      noMatch.classList.toggle('hidden', anyVisible);
    }
  }

  // ── Transfer Type Toggle ────────────────────────────────────────────────
  var transferRadios = document.querySelectorAll('input[name="transfer_type"]');
  var internationalFields = document.getElementById('international-fields');
  var domesticFields = document.getElementById('domestic-fields');

  transferRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (radio.value === 'international') {
        if (internationalFields) internationalFields.classList.remove('hidden');
      } else {
        if (internationalFields) internationalFields.classList.add('hidden');
      }
      updateSummary('summary-transfer', radio.value);
    });
  });

  // ── Region Field Loading ────────────────────────────────────────────────
  function loadRegionFields(code) {
    var container = document.getElementById('region-fields-container');
    var fieldsDiv = document.getElementById('region-fields');
    var titleSpan = document.getElementById('region-fields-title');

    if (!container || !fieldsDiv) return;

    // Show loading state
    container.classList.remove('hidden');
    titleSpan.textContent = code;
    fieldsDiv.innerHTML = '<p class="text-sm text-ink-muted py-4">Loading fields...</p>';

    fetch('/api/regions/' + code + '/fields')
      .then(function (res) { return res.json(); })
      .then(function (fields) {
        if (!fields || !fields.length) {
          container.classList.add('hidden');
          return;
        }

        container.classList.remove('hidden');
        titleSpan.textContent = code;
        fieldsDiv.innerHTML = '';

        fields.forEach(function (f) {
          var wrapper = document.createElement('div');
          var label = document.createElement('label');
          label.className = 'block text-sm font-medium text-ink mb-1.5';
          label.textContent = f.label;
          if (f.required) {
            var star = document.createElement('span');
            star.className = 'text-danger';
            star.textContent = ' *';
            label.appendChild(star);
          }
          wrapper.appendChild(label);

          // Hidden inputs for key/label/type/custom
          addHidden(wrapper, 'field_key[]', f.key);
          addHidden(wrapper, 'field_label[]', f.label);
          addHidden(wrapper, 'field_type[]', f.type || 'text');
          addHidden(wrapper, 'field_is_custom[]', '0');

          var inputClasses = 'block w-full rounded-lg border border-input-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand';

          if (f.type === 'textarea') {
            var ta = document.createElement('textarea');
            ta.name = 'field_value[]';
            ta.rows = 3;
            ta.className = inputClasses;
            if (f.placeholder) ta.placeholder = f.placeholder;
            wrapper.appendChild(ta);
          } else if (f.type === 'select' && f.options) {
            var sel = document.createElement('select');
            sel.name = 'field_value[]';
            sel.className = inputClasses;
            var defOpt = document.createElement('option');
            defOpt.value = '';
            defOpt.textContent = 'Select...';
            sel.appendChild(defOpt);
            f.options.forEach(function (o) {
              var opt = document.createElement('option');
              opt.value = o;
              opt.textContent = o;
              sel.appendChild(opt);
            });
            wrapper.appendChild(sel);
          } else {
            var inp = document.createElement('input');
            inp.type = 'text';
            inp.name = 'field_value[]';
            inp.className = inputClasses;
            if (f.placeholder) inp.placeholder = f.placeholder;
            wrapper.appendChild(inp);
          }

          fieldsDiv.appendChild(wrapper);
        });
      })
      .catch(function () {
        fieldsDiv.innerHTML = '<p class="text-sm text-danger py-2">Failed to load region fields. Please try again.</p>';
      });
  }

  function addHidden(parent, name, value) {
    var inp = document.createElement('input');
    inp.type = 'hidden';
    inp.name = name;
    inp.value = value;
    parent.appendChild(inp);
  }

  // ── Live Summary Updates ────────────────────────────────────────────────
  var nameInput = document.getElementById('name');
  var typeRadios = document.querySelectorAll('input[name="account_type"]');

  if (nameInput) {
    nameInput.addEventListener('input', function () {
      updateSummary('summary-name', nameInput.value || '---');
    });
  }

  typeRadios.forEach(function (r) {
    r.addEventListener('change', function () {
      updateSummary('summary-type', r.value);
    });
  });

  function updateSummary(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ── Custom Field Add ────────────────────────────────────────────────────
  var addBtn = document.getElementById('add-custom-field');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      var container = document.getElementById('custom-fields');
      var row = document.createElement('div');
      row.className = 'flex gap-2 items-start custom-field-row';
      row.innerHTML =
        '<input type="text" name="field_key[]" placeholder="Key" class="block w-1/4 rounded-lg border border-input-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand">' +
        '<input type="text" name="field_label[]" placeholder="Label" class="block w-1/4 rounded-lg border border-input-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand">' +
        '<input type="text" name="field_value[]" placeholder="Value" class="block flex-1 rounded-lg border border-input-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand">' +
        '<input type="hidden" name="field_type[]" value="text">' +
        '<input type="hidden" name="field_is_custom[]" value="1">' +
        '<button type="button" onclick="this.closest(\'.custom-field-row\').remove()" class="p-2.5 text-ink-muted hover:text-[#cd3d64] transition-colors">' +
        '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>' +
        '</button>';
      container.appendChild(row);
    });
  }
})();
