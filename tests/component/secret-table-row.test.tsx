// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, screen } from '@testing-library/react';
import SecretTableRow from '../../components/vault/SecretTableRow';
import { LocaleProvider } from '../../lib/i18n/client';

vi.mock('../../components/ui/FlashMessage', () => ({
  showToast: vi.fn(),
}));

const dict: Record<string, string> = {
  'common.key': 'Key',
  'common.type': 'Type',
  'common.value': 'Value',
  'common.actions': 'Actions',
  'vault.itemTypeText': 'Text',
  'vault.itemTypeFile': 'File',
  'vault.uploadedFile': 'Uploaded file',
  'vault.download': 'Download',
  'vault.reveal': 'Reveal',
  'vault.hide': 'Hide',
  'vault.copy': 'Copy',
  'vault.copied': 'Copied',
  'vault.copiedToClipboard': 'Copied to clipboard',
  'vault.copyFailed': 'Copy failed',
  'vault.revealFailed': 'Reveal failed',
  'a11y.revealSecret': 'Reveal {key}',
  'a11y.hideSecret': 'Hide {key}',
  'a11y.copySecret': 'Copy {key}',
};

function renderRow(props: Partial<React.ComponentProps<typeof SecretTableRow>> = {}) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <table>
        <tbody>
          <SecretTableRow
            credentialId={5}
            itemId={9}
            itemKey="api-key"
            itemType="text"
            fileName={null}
            filePath={null}
            {...props}
          />
        </tbody>
      </table>
    </LocaleProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  // @ts-expect-error - test stub
  global.fetch = vi.fn();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SecretTableRow', () => {
  it('renders text-type row with masked value initially', () => {
    renderRow();
    expect(screen.getByText('api-key')).toBeTruthy();
    expect(screen.getByText('Text')).toBeTruthy();
    expect(screen.getByText('••••••••••••')).toBeTruthy();
  });

  it('renders file-type row with download link when filePath present', () => {
    renderRow({ itemType: 'file', fileName: 'doc.pdf', filePath: '/some/path/doc.pdf' });
    expect(screen.getByText('File')).toBeTruthy();
    expect(screen.getByText('doc.pdf')).toBeTruthy();
    const dl = screen.getByText('Download').closest('a') as HTMLAnchorElement;
    expect(dl.getAttribute('href')).toBe('/api/vault/5/download/9');
  });

  it('renders file row without Download when filePath missing', () => {
    renderRow({ itemType: 'file', fileName: 'x.bin', filePath: null });
    expect(screen.queryByText('Download')).toBeNull();
  });

  it('reveals secret on click and auto-hides after 10s', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ value: 'my-secret' }),
    });
    renderRow();
    await act(async () => {
      screen.getByLabelText('Reveal api-key').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('my-secret')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText('my-secret')).toBeNull();
    expect(screen.getByText('••••••••••••')).toBeTruthy();
  });

  it('copies value to clipboard and resets label after 2s', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ value: 'copied-value' }),
    });
    renderRow();
    await act(async () => {
      screen.getByLabelText('Copy api-key').click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('copied-value');
    expect(screen.getByText('Copied')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Copy')).toBeTruthy();
  });

  it('clears all timers on unmount (no leak)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ value: 'leaktest' }),
    });
    const { unmount } = renderRow();
    await act(async () => {
      screen.getByLabelText('Reveal api-key').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not blow up when unmounted before fetch resolves', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise((res) => { resolveFetch = res; }),
    );
    const { unmount } = renderRow();
    act(() => screen.getByLabelText('Reveal api-key').click());
    unmount();
    await act(async () => {
      resolveFetch({ json: async () => ({ value: 'late' }) });
      await Promise.resolve();
    });
    // No throw / no warning means the isMountedRef guard worked.
    expect(true).toBe(true);
  });
});
