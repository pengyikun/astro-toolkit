// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import StatusBadge from '../../components/ui/StatusBadge';
import { LocaleProvider } from '../../lib/i18n/client';

afterEach(() => cleanup());

const dict = {
  'status.success': 'Success',
  'status.failed': 'Failed',
  'status.pending': 'Pending',
  'status.active': 'Active',
};

function renderBadge(status: string) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <StatusBadge status={status} />
    </LocaleProvider>,
  );
}

describe('StatusBadge', () => {
  it('renders the localized label when present in the dictionary', () => {
    const { container } = renderBadge('success');
    expect(container.textContent).toBe('Success');
  });

  it('falls back to the raw status string when no translation exists', () => {
    const { container } = renderBadge('weird-status');
    expect(container.textContent).toBe('weird-status');
  });

  it('renders distinct badges for different statuses', () => {
    const a = renderBadge('failed');
    expect(a.container.textContent).toBe('Failed');
  });

  it('passes through custom className', () => {
    const { container } = render(
      <LocaleProvider locale={'en' as never} dict={dict as never}>
        <StatusBadge status="active" className="my-extra" />
      </LocaleProvider>,
    );
    expect(container.querySelector('.my-extra')).not.toBeNull();
  });
});
