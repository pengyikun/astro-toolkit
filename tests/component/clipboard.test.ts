// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { copyToClipboard } from '../../lib/clipboard';

const labels = { prompt: 'Copy this:', shown: 'Shown', copied: 'Copied' };

let originalPrompt: typeof window.prompt;

beforeEach(() => {
  vi.useFakeTimers();
  originalPrompt = window.prompt;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.prompt = originalPrompt;
  // @ts-expect-error - reset to undefined for next test
  delete (navigator as { clipboard?: unknown }).clipboard;
});

function makeBtn(label = 'Copy'): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  document.body.appendChild(btn);
  return btn;
}

describe('copyToClipboard', () => {
  it('is a no-op when given a null button', () => {
    copyToClipboard('hi', null, labels);
    // should not throw, nothing more to assert
    expect(true).toBe(true);
  });

  it('uses Clipboard API when available and shows "copied" label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    const btn = makeBtn('Copy');
    copyToClipboard('hello', btn, labels);
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(btn.textContent).toBe('Copied');

    vi.advanceTimersByTime(2000);
    expect(btn.textContent).toBe('Copy');
  });

  it('falls back to prompt when Clipboard API is missing', () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const promptMock = vi.fn();
    window.prompt = promptMock as unknown as typeof window.prompt;

    const btn = makeBtn('Copy');
    copyToClipboard('hello', btn, labels);
    expect(promptMock).toHaveBeenCalledWith('Copy this:', 'hello');
    expect(btn.textContent).toBe('Shown');
  });

  it('falls back to prompt when writeText rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    const promptMock = vi.fn();
    window.prompt = promptMock as unknown as typeof window.prompt;

    const btn = makeBtn('Copy');
    copyToClipboard('hello', btn, labels);
    await Promise.resolve();
    await Promise.resolve();
    expect(promptMock).toHaveBeenCalledWith('Copy this:', 'hello');
    expect(btn.textContent).toBe('Shown');
  });

  it('restores the original label after the 2s timer', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    const btn = makeBtn('Original');
    copyToClipboard('x', btn, labels);
    await Promise.resolve();
    await Promise.resolve();
    expect(btn.textContent).toBe('Copied');
    vi.advanceTimersByTime(1999);
    expect(btn.textContent).toBe('Copied');
    vi.advanceTimersByTime(1);
    expect(btn.textContent).toBe('Original');
  });
});
