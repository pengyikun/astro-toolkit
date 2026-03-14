(function () {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlightMatches(text, regex, getClassName) {
    var html = '';
    var lastIndex = 0;
    var match;

    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      html += escapeHtml(text.slice(lastIndex, match.index));
      html += '<span class="' + getClassName(match[0]) + '">' + escapeHtml(match[0]) + '</span>';
      lastIndex = match.index + match[0].length;
    }

    html += escapeHtml(text.slice(lastIndex));
    return html;
  }

  function highlightJson(text) {
    var tokenRegex = /"(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

    return highlightMatches(text, tokenRegex, function (token) {
      if (token.charAt(0) === '"') {
        return /:\s*$/.test(token) ? 'syntax-key' : 'syntax-string';
      }
      if (token === 'true' || token === 'false') {
        return 'syntax-boolean';
      }
      if (token === 'null') {
        return 'syntax-null';
      }
      return 'syntax-number';
    });
  }

  function highlightXml(text) {
    var tokenRegex = /<!--[\s\S]*?-->|<[^>]+>/g;

    return highlightMatches(text, tokenRegex, function (token) {
      if (token.indexOf('<!--') === 0) {
        return 'syntax-comment';
      }
      return 'syntax-xml-token';
    }).replace(/<span class="syntax-xml-token">([\s\S]*?)<\/span>/g, function (_full, escapedTag) {
      return escapedTag
        .replace(/(&lt;\/?)([\w:-]+)/, function (_match, opener, name) {
          return opener + '<span class="syntax-tag">' + name + '</span>';
        })
        .replace(/([\w:-]+)=(&quot;.*?&quot;|&#39;.*?&#39;)/g, function (_match, attr, value) {
          return '<span class="syntax-attr">' + attr + '</span>=<span class="syntax-value">' + value + '</span>';
        });
    });
  }

  function syncEditor(editor) {
    var textarea = editor.querySelector('textarea');
    var highlight = editor.querySelector('[data-code-highlight]');
    var gutter = editor.querySelector('[data-code-gutter]');
    if (!textarea || !highlight || !gutter) return;

    var language = textarea.getAttribute('data-language') || 'plain';
    var text = textarea.value || '';
    var lineCount = Math.max(1, text.split('\n').length);
    var gutterLines = [];
    var highlighted = escapeHtml(text);

    if (language === 'json') {
      highlighted = highlightJson(text);
    } else if (language === 'xml') {
      highlighted = highlightXml(text);
    }

    if (!text) {
      highlighted = '';
    }

    for (var i = 1; i <= lineCount; i += 1) {
      gutterLines.push('<span>' + i + '</span>');
    }

    gutter.innerHTML = gutterLines.join('');
    highlight.innerHTML = (highlighted || '&nbsp;') + '\n';
    highlight.style.transform = 'translate(' + (-textarea.scrollLeft) + 'px, ' + (-textarea.scrollTop) + 'px)';
    gutter.style.transform = 'translateY(' + (-textarea.scrollTop) + 'px)';
  }

  function insertTab(textarea) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var value = textarea.value;

    textarea.value = value.slice(0, start) + '  ' + value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + 2;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function wireEditor(editor) {
    var textarea = editor.querySelector('textarea');
    if (!textarea) return;

    textarea.addEventListener('input', function () {
      syncEditor(editor);
    });

    textarea.addEventListener('scroll', function () {
      syncEditor(editor);
    });

    textarea.addEventListener('keydown', function (event) {
      if (event.key === 'Tab') {
        event.preventDefault();
        insertTab(textarea);
      }
    });

    syncEditor(editor);
  }

  function initEditors() {
    var editors = document.querySelectorAll('[data-code-editor]');
    Array.prototype.forEach.call(editors, wireEditor);
  }

  window.refreshParserEditor = function (textareaId) {
    var textarea = document.getElementById(textareaId);
    if (!textarea) return;
    var editor = textarea.closest('[data-code-editor]');
    if (!editor) return;
    syncEditor(editor);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditors);
  } else {
    initEditors();
  }
})();
