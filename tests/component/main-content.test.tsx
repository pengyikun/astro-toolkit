// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import MainContent from '../../components/layout/MainContent';
import { SidebarProvider, useSidebar } from '../../components/layout/SidebarContext';

afterEach(() => cleanup());

function Toggle() {
  const { toggleCollapsed } = useSidebar();
  return <button data-testid="t" onClick={toggleCollapsed}>t</button>;
}

describe('MainContent', () => {
  it('renders children inside <main>', () => {
    const { container } = render(
      <SidebarProvider>
        <MainContent>
          <span data-testid="child">hi</span>
        </MainContent>
      </SidebarProvider>,
    );
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    expect(main?.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  it('uses expanded margin class by default (lg:ml-60)', () => {
    const { container } = render(
      <SidebarProvider>
        <MainContent>x</MainContent>
      </SidebarProvider>,
    );
    const main = container.querySelector('main')!;
    expect(main.className).toContain('lg:ml-60');
    expect(main.className).not.toContain('lg:ml-[4.5rem]');
  });

  it('switches to collapsed margin class when sidebar collapses', () => {
    const { container } = render(
      <SidebarProvider>
        <Toggle />
        <MainContent>x</MainContent>
      </SidebarProvider>,
    );
    const button = container.querySelector('[data-testid="t"]') as HTMLButtonElement;
    act(() => button.click());

    const main = container.querySelector('main')!;
    expect(main.className).toContain('lg:ml-[4.5rem]');
    expect(main.className).not.toContain('lg:ml-60');
  });

  it('throws when rendered outside SidebarProvider', () => {
    const original = console.error;
    console.error = () => {};
    try {
      expect(() => render(<MainContent>x</MainContent>)).toThrow(/SidebarProvider/);
    } finally {
      console.error = original;
    }
  });
});
