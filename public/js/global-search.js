(function () {
  var searchRoot = document.querySelector('[data-global-search]');
  if (!searchRoot) return;

  var input = document.getElementById('global-search-input');
  var panel = document.getElementById('global-search-results');
  var status = document.getElementById('global-search-status');
  if (!input || !panel || !status) return;

  var debounceId = 0;
  var requestToken = 0;
  var activeIndex = -1;
  var flatResults = [];
  var sectionLabels = {
    accounts: 'Accounts',
    credentials: 'Vault',
    transactions: 'Transactions',
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function openPanel() {
    panel.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    panel.classList.add('hidden');
    panel.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-activedescendant', '');
    panel.removeAttribute('aria-busy');
    activeIndex = -1;
    flatResults = [];
  }

  function announce(message) {
    status.textContent = message;
  }

  function renderStatus(message, className) {
    panel.innerHTML = '<div class="' + className + '">' + escapeHtml(message) + '</div>';
    openPanel();
    announce(message);
  }

  function setActive(index) {
    activeIndex = index;

    Array.prototype.forEach.call(panel.querySelectorAll('[data-search-result]'), function (node, nodeIndex) {
      var isActive = nodeIndex === activeIndex;
      node.classList.toggle('console-search-result-active', isActive);
      node.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) {
        input.setAttribute('aria-activedescendant', node.id);
        node.scrollIntoView({ block: 'nearest' });
      }
    });

    if (activeIndex < 0) {
      input.setAttribute('aria-activedescendant', '');
    }
  }

  function flattenResults(groups) {
    var order = ['accounts', 'credentials', 'transactions'];
    return order.reduce(function (list, key) {
      return list.concat((groups[key] || []).map(function (item) {
        return Object.assign({ section: key }, item);
      }));
    }, []);
  }

  function renderResults(payload) {
    var results = payload && payload.results ? payload.results : {};
    var order = ['accounts', 'credentials', 'transactions'];
    var sections = order.filter(function (key) {
      return Array.isArray(results[key]) && results[key].length > 0;
    });

    flatResults = flattenResults(results);
    activeIndex = -1;

    if (!flatResults.length) {
      panel.removeAttribute('aria-busy');
      renderStatus('No matching records found.', 'console-search-empty');
      return;
    }

    panel.innerHTML = sections.map(function (sectionKey) {
      var items = results[sectionKey] || [];
      return [
        '<section class="console-search-section">',
        '<div class="console-search-section-title">' + sectionLabels[sectionKey] + '</div>',
        items.map(function (item) {
          var index = flatResults.findIndex(function (entry) {
            return entry.section === sectionKey && entry.id === item.id;
          });
          var optionId = 'global-search-option-' + sectionKey + '-' + item.id;

          return [
            '<div',
            ' id="' + optionId + '"',
            ' class="console-search-result"',
            ' data-search-result="true"',
            ' data-index="' + index + '"',
            ' data-url="' + escapeHtml(item.url) + '"',
            ' role="option"',
            ' aria-selected="false">',
            '<div class="console-search-result-title" dir="auto">' + escapeHtml(item.title) + '</div>',
            '<div class="console-search-result-meta" dir="auto">' + escapeHtml(item.meta) + '</div>',
            '</div>',
          ].join('');
        }).join(''),
        '</section>',
      ].join('');
    }).join('');

    panel.removeAttribute('aria-busy');
    openPanel();
    announce(flatResults.length + ' results available. Use the up and down arrow keys to review them.');
  }

  function runSearch(query) {
    var token = ++requestToken;
    panel.setAttribute('aria-busy', 'true');
    renderStatus('Searching records…', 'console-search-status');

    window.fetch('/api/search?q=' + encodeURIComponent(query), {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Search request failed');
        }
        return response.json();
      })
      .then(function (payload) {
        if (token !== requestToken) return;
        renderResults(payload);
      })
      .catch(function () {
        if (token !== requestToken) return;
        panel.removeAttribute('aria-busy');
        renderStatus('Search is temporarily unavailable.', 'console-search-empty');
      });
  }

  function queueSearch() {
    window.clearTimeout(debounceId);

    var query = input.value.trim();
    if (query.length < 2) {
      closePanel();
      return;
    }

    debounceId = window.setTimeout(function () {
      runSearch(query);
    }, 180);
  }

  input.addEventListener('input', queueSearch);

  input.addEventListener('focus', function () {
    if (flatResults.length) {
      openPanel();
    } else if (input.value.trim().length >= 2) {
      queueSearch();
    }
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closePanel();
      return;
    }

    if (!flatResults.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % flatResults.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex <= 0 ? flatResults.length - 1 : activeIndex - 1);
      return;
    }

    if (event.key === 'Enter') {
      if (activeIndex < 0) {
        setActive(0);
      }

      var target = panel.querySelector('[data-index="' + activeIndex + '"]');
      if (target) {
        event.preventDefault();
        window.location.assign(target.getAttribute('data-url'));
      }
    }
  });

  panel.addEventListener('mousemove', function (event) {
    var row = event.target.closest('[data-search-result]');
    if (!row) return;
    setActive(Number(row.getAttribute('data-index')));
  });

  panel.addEventListener('click', function (event) {
    var row = event.target.closest('[data-search-result]');
    if (!row) return;
    window.location.assign(row.getAttribute('data-url'));
  });

  document.addEventListener('click', function (event) {
    if (!searchRoot.contains(event.target)) {
      closePanel();
    }
  });
})();
