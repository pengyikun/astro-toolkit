// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import SettingsSidebar from '../../components/layout/SettingsSidebar';
import { LocaleProvider } from '../../lib/i18n/client';

const usePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const dict: Record<string, string> = {
  'settings.general': 'General',
  'settings.connectorsPage': 'Connectors',
  'settings.aiPage': 'AI',
  'settings.dataPage': 'Data',
  'settings.backToApp': 'Back to app',
  'nav.settings': 'Settings',
};

function renderSidebar(pathname = '/settings') {
  usePathname.mockReturnValue(pathname);
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <SettingsSidebar />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  usePathname.mockReset();
});

afterEach(() => cleanup());

describe('SettingsSidebar', () => {
  it('renders the four settings nav items', () => {
    renderSidebar();
    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('Connectors')).toBeTruthy();
    expect(screen.getByText('AI')).toBeTruthy();
    expect(screen.getByText('Data')).toBeTruthy();
  });

  it('marks the General link active on /settings exact match', () => {
    renderSidebar('/settings');
    const general = screen.getByText('General').closest('a') as HTMLAnchorElement;
    expect(general.className).toContain('ops-sidebar-link-active');
  });

  it('does not mark General active on a deeper settings path', () => {
    renderSidebar('/settings/ai');
    const general = screen.getByText('General').closest('a') as HTMLAnchorElement;
    expect(general.className).not.toContain('ops-sidebar-link-active');
    const ai = screen.getByText('AI').closest('a') as HTMLAnchorElement;
    expect(ai.className).toContain('ops-sidebar-link-active');
  });

  it('renders back-to-app link to /', () => {
    renderSidebar();
    const back = screen.getByText('Back to app').closest('a') as HTMLAnchorElement;
    expect(back.getAttribute('href')).toBe('/');
  });
});
