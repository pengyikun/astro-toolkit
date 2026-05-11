// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import ConfirmModal, { confirmDelete } from '../../components/ui/ConfirmModal';
import { LocaleProvider } from '../../lib/i18n/client';

afterEach(() => cleanup());

const dict = {
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'ui.confirmDelete': 'Are you sure?',
  'ui.confirmDeleteTitle': 'Confirm delete',
};

function renderModal() {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <ConfirmModal />
    </LocaleProvider>,
  );
}

describe('ConfirmModal', () => {
  it('is closed by default and opens via confirmDelete()', () => {
    renderModal();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();

    act(() => confirmDelete('/api/foo/delete'));
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  });

  it('renders the custom message when provided', () => {
    renderModal();
    act(() => confirmDelete('/api/foo/delete', 'Delete account 7?'));
    expect(document.body.textContent).toContain('Delete account 7?');
  });

  it('renders the default message when none is provided', () => {
    renderModal();
    act(() => confirmDelete('/api/foo/delete'));
    expect(document.body.textContent).toContain('Are you sure?');
  });

  it('renders a form whose action equals the supplied URL', () => {
    renderModal();
    act(() => confirmDelete('/api/credentials/42/delete'));
    const form = document.querySelector('form[method="POST"]') as HTMLFormElement | null;
    expect(form).not.toBeNull();
    expect(form?.getAttribute('action')).toBe('/api/credentials/42/delete');
  });

  it('clears stale message between successive confirmDelete calls', () => {
    renderModal();
    act(() => confirmDelete('/a', 'First message'));
    expect(document.body.textContent).toContain('First message');
    // Close dialog
    act(() => {
      (document.querySelector('[role="alertdialog"] [data-slot="alert-dialog-cancel"], [role="alertdialog"] button') as HTMLButtonElement)?.click();
    });
    act(() => confirmDelete('/b'));
    // Without msg arg, must render default — never the stale "First message"
    expect(document.body.textContent).toContain('Are you sure?');
    expect(document.body.textContent).not.toContain('First message');
  });

  it('confirmDelete is a no-op when no modal is mounted', () => {
    expect(() => confirmDelete('/foo')).not.toThrow();
  });
});
