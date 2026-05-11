// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { useRef } from 'react';
import { useCodeEditor } from '../../hooks/useCodeEditor';

afterEach(() => cleanup());

function flushRaf() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function Harness({ value, language }: { value: string; language: 'json' | 'xml' }) {
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useCodeEditor({ value, language, gutterRef, highlightRef, textareaRef });
  return (
    <div>
      <div ref={gutterRef} data-testid="g" />
      <pre ref={highlightRef} data-testid="h" />
      <textarea ref={textareaRef} data-testid="t" defaultValue={value} />
    </div>
  );
}

describe('useCodeEditor', () => {
  it('renders one gutter line for empty input', async () => {
    const { getByTestId } = render(<Harness value="" language="json" />);
    await act(async () => { await flushRaf(); });
    const lines = getByTestId('g').querySelectorAll('span');
    expect(lines.length).toBe(1);
  });

  it('renders gutter line numbers matching newline count + 1', async () => {
    const { getByTestId } = render(<Harness value={'a\nb\nc'} language="json" />);
    await act(async () => { await flushRaf(); });
    const lines = getByTestId('g').querySelectorAll('span');
    expect(lines.length).toBe(3);
    expect(lines[0].textContent).toBe('1');
    expect(lines[2].textContent).toBe('3');
  });

  it('escapes raw HTML to prevent XSS in the highlight layer', async () => {
    const { getByTestId } = render(
      <Harness value={'<script>alert(1)</script>'} language="json" />,
    );
    await act(async () => { await flushRaf(); });
    const html = getByTestId('h').innerHTML;
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('applies JSON syntax classes for keys and values', async () => {
    const { getByTestId } = render(
      <Harness value={'{"name": "alice", "n": 42, "ok": true}'} language="json" />,
    );
    await act(async () => { await flushRaf(); });
    const html = getByTestId('h').innerHTML;
    expect(html).toContain('syntax-key');
    expect(html).toContain('syntax-string');
    expect(html).toContain('syntax-number');
    expect(html).toContain('syntax-boolean');
  });

  it('applies XML tag highlighting', async () => {
    const { getByTestId } = render(
      <Harness value={'<root attr="x">hello</root>'} language="xml" />,
    );
    await act(async () => { await flushRaf(); });
    const html = getByTestId('h').innerHTML;
    expect(html).toContain('syntax-tag');
    expect(html).toContain('syntax-attr');
  });

  it('skips syntax highlighting when input exceeds 50k chars', async () => {
    const big = '{"k":"v"}'.repeat(7000); // > 50k
    const { getByTestId } = render(<Harness value={big} language="json" />);
    await act(async () => { await flushRaf(); });
    const html = getByTestId('h').innerHTML;
    // Plain escaped output, no syntax-key spans
    expect(html).not.toContain('syntax-key');
  });

  it('clears highlight when value becomes empty', async () => {
    const { getByTestId, rerender } = render(<Harness value={'1'} language="json" />);
    await act(async () => { await flushRaf(); });
    expect(getByTestId('h').innerHTML.length).toBeGreaterThan(0);

    rerender(<Harness value={''} language="json" />);
    await act(async () => { await flushRaf(); });
    expect(getByTestId('h').innerHTML).toBe('');
  });

  it('syncs textarea scrollTop into the gutter', async () => {
    const { getByTestId } = render(<Harness value={'1\n2\n3\n4\n5'} language="json" />);
    await act(async () => { await flushRaf(); });
    const textarea = getByTestId('t') as HTMLTextAreaElement;
    Object.defineProperty(textarea, 'scrollTop', { value: 17, configurable: true, writable: true });
    Object.defineProperty(textarea, 'scrollLeft', { value: 9, configurable: true, writable: true });
    act(() => {
      textarea.dispatchEvent(new Event('scroll'));
    });
    const gutter = getByTestId('g') as HTMLDivElement;
    expect(gutter.scrollTop).toBe(17);
  });
});
