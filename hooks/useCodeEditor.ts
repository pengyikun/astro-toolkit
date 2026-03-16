'use client';

import { useEffect, useRef, type RefObject } from 'react';

const LARGE_INPUT_THRESHOLD = 50_000;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightJson(escaped: string): string {
  return escaped
    // strings (double-quoted)
    .replace(
      /(&quot;|")((?:\\.|[^"\\])*)(&quot;|")\s*:/g,
      '<span class="syntax-key">"$2"</span>:',
    )
    .replace(
      /(&quot;|")((?:\\.|[^"\\])*)(&quot;|")/g,
      '<span class="syntax-string">"$2"</span>',
    )
    // numbers
    .replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="syntax-number">$1</span>')
    // booleans
    .replace(/\b(true|false)\b/g, '<span class="syntax-boolean">$1</span>')
    // null
    .replace(/\bnull\b/g, '<span class="syntax-null">null</span>');
}

function highlightXml(escaped: string): string {
  return escaped
    // comments
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="syntax-comment">$1</span>')
    // tags with attributes
    .replace(
      /(&lt;\/?)([\w:.-]+)((?:\s+[\s\S]*?)?)(\/?&gt;)/g,
      (_match, open, tag, attrs, close) => {
        const highlightedAttrs = attrs.replace(
          /([\w:.-]+)(\s*=\s*)(&quot;|")((?:[^"\\]|\\.)*)(&quot;|")/g,
          '<span class="syntax-attr">$1</span>$2<span class="syntax-value">"$4"</span>',
        );
        return `<span class="syntax-tag">${open}${tag}</span>${highlightedAttrs}<span class="syntax-tag">${close}</span>`;
      },
    );
}

interface UseCodeEditorOptions {
  value: string;
  language: 'json' | 'xml';
  gutterRef: RefObject<HTMLDivElement | null>;
  highlightRef: RefObject<HTMLPreElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function useCodeEditor({
  value,
  language,
  gutterRef,
  highlightRef,
  textareaRef,
}: UseCodeEditorOptions): void {
  const rafId = useRef<number>(0);

  // Update gutter + highlight when value changes
  useEffect(() => {
    cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      const gutter = gutterRef.current;
      const highlight = highlightRef.current;

      if (gutter) {
        const lineCount = Math.max(1, (value.match(/\n/g) ?? []).length + 1);
        const lines: string[] = [];
        for (let i = 1; i <= lineCount; i++) {
          lines.push(`<span>${i}</span>`);
        }
        gutter.innerHTML = lines.join('');
      }

      if (highlight) {
        if (!value) {
          highlight.innerHTML = '';
          return;
        }

        const escaped = escapeHtml(value);

        if (value.length > LARGE_INPUT_THRESHOLD) {
          // Skip syntax highlighting for very large inputs
          highlight.innerHTML = escaped;
        } else {
          highlight.innerHTML =
            language === 'json' ? highlightJson(escaped) : highlightXml(escaped);
        }
      }
    });

    return () => cancelAnimationFrame(rafId.current);
  }, [value, language, gutterRef, highlightRef]);

  // Scroll sync
  useEffect(() => {
    const textarea = textareaRef.current;
    const gutter = gutterRef.current;
    const highlight = highlightRef.current;

    if (!textarea) return;

    function handleScroll() {
      if (!textarea) return;
      const { scrollTop, scrollLeft } = textarea;
      if (gutter) gutter.scrollTop = scrollTop;
      if (highlight) {
        highlight.scrollTop = scrollTop;
        highlight.scrollLeft = scrollLeft;
      }
    }

    textarea.addEventListener('scroll', handleScroll, { passive: true });
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, [textareaRef, gutterRef, highlightRef]);
}
