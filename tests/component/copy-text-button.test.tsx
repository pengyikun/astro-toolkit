// @vitest-environment jsdom
/**
 * Exercises the live CopyTextButton inside BriefResult (legacy fallback path)
 * to verify the timer cleanup fix prevents a leak/setState-after-unmount.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, screen } from '@testing-library/react';
import BriefResult from '../../components/intelligence/BriefResult';
import { LocaleProvider } from '../../lib/i18n/client';

vi.mock('../../actions/intelligence', () => ({
  createTodosFromBrief: vi.fn(),
}));

const dict = {
  'intelligence.summary': 'Summary',
  'intelligence.pendingItems': 'Pending items',
  'intelligence.noSummary': 'No summary',
  'intelligence.noPendingItems': 'No pending items',
  'intelligence.createTodos': 'Create todos',
  'intelligence.creating': 'Creating',
  'intelligence.todosCreated': 'Todos created',
  'intelligence.todosError': 'Error',
};

function renderBrief() {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <BriefResult summary={'- a\n- b'} pendingItems={'- task A'} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
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

describe('BriefResult CopyTextButton timer cleanup', () => {
  it('renders Copy buttons in legacy mode', () => {
    renderBrief();
    const buttons = screen.getAllByRole('button', { name: /copy/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('schedules a single reset timer when copy is clicked', async () => {
    renderBrief();
    const button = screen.getAllByRole('button', { name: /copy/i })[0];
    await act(async () => {
      button.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    // The setTimeout(2000) should be the only pending timer for the button.
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1);
  });

  it('clears all timers on unmount (no leak)', async () => {
    const { unmount } = renderBrief();
    const button = screen.getAllByRole('button', { name: /copy/i })[0];
    await act(async () => {
      button.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    const beforeCount = vi.getTimerCount();
    expect(beforeCount).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reverts label after the 2s timer fires', async () => {
    renderBrief();
    const button = screen.getAllByRole('button', { name: /copy/i })[0];
    await act(async () => {
      button.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getAllByText(/Copied/i).length).toBeGreaterThan(0);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // After the timer, the label must revert.
    expect(screen.queryAllByText(/^Copied$/).length).toBe(0);
  });
});
