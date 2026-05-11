// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, screen } from '@testing-library/react';
import BriefHistory from '../../components/intelligence/BriefHistory';
import { LocaleProvider } from '../../lib/i18n/client';
import type { Brief } from '../../types';

const getBriefHistoryMock = vi.fn();
const getBriefDetailMock = vi.fn();
const deleteBriefMock = vi.fn();

vi.mock('../../actions/intelligence', () => ({
  getBriefHistory: (...a: unknown[]) => getBriefHistoryMock(...a),
  getBriefDetail: (...a: unknown[]) => getBriefDetailMock(...a),
  deleteBrief: (...a: unknown[]) => deleteBriefMock(...a),
}));

const dict = {
  'intelligence.history': 'History',
  'intelligence.stat.events': 'Events',
  'intelligence.stat.pending': 'Pending',
};

function makeBrief(overrides: Partial<Brief> = {}): Brief {
  return {
    id: 1,
    owner_user_id: 1,
    connectors: JSON.stringify(['email']),
    date_from: '2025-04-01',
    date_to: '2025-04-07',
    status: 'completed',
    summary: 's',
    pending_items: 'p',
    thinking: '',
    error: null,
    result_data: JSON.stringify({ summary: [{}, {}], pendingItems: [{}, {}, {}] }),
    created_at: '2025-04-08T10:00:00Z',
    updated_at: '2025-04-08T10:00:00Z',
    ...overrides,
  } as Brief;
}

function renderHistory(onView?: (b: Brief) => void) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <BriefHistory onViewBrief={onView} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  getBriefHistoryMock.mockReset();
  getBriefDetailMock.mockReset();
  deleteBriefMock.mockReset();
});

afterEach(() => cleanup());

describe('BriefHistory', () => {
  it('renders nothing when there are no briefs', async () => {
    getBriefHistoryMock.mockResolvedValueOnce([]);
    const { container } = renderHistory();
    await act(async () => { await Promise.resolve(); });
    expect(container.textContent).not.toContain('History');
  });

  it('lists briefs with status indicators', async () => {
    getBriefHistoryMock.mockResolvedValueOnce([
      makeBrief({ id: 1, status: 'completed' }),
      makeBrief({ id: 2, status: 'failed', error: 'boom' }),
    ]);
    renderHistory();
    await act(async () => { await Promise.resolve(); });
    expect(document.body.textContent).toContain('History');
    expect(document.body.textContent).toContain('boom');
  });

  it('parses event/pending counts from result_data', async () => {
    getBriefHistoryMock.mockResolvedValueOnce([makeBrief({ id: 1, status: 'completed' })]);
    renderHistory();
    await act(async () => { await Promise.resolve(); });
    expect(document.body.textContent).toContain('2 events');
    expect(document.body.textContent).toContain('3 pending');
  });

  it('handles malformed result_data JSON without crashing', async () => {
    getBriefHistoryMock.mockResolvedValueOnce([makeBrief({ id: 1, result_data: 'not-json' })]);
    renderHistory();
    await act(async () => { await Promise.resolve(); });
    expect(document.body.textContent).toContain('History');
  });

  it('clicking a row calls onViewBrief with the detail', async () => {
    getBriefHistoryMock.mockResolvedValueOnce([makeBrief({ id: 7 })]);
    const detail = makeBrief({ id: 7, summary: 'detailed' });
    getBriefDetailMock.mockResolvedValueOnce(detail);
    const onView = vi.fn();
    renderHistory(onView);
    await act(async () => { await Promise.resolve(); });

    const row = document.querySelector('[role="button"]') as HTMLElement;
    await act(async () => {
      row.click();
      await Promise.resolve();
    });
    expect(getBriefDetailMock).toHaveBeenCalledWith(7);
    expect(onView).toHaveBeenCalledWith(detail);
  });

  it('clicking the trash icon removes the brief from the list', async () => {
    getBriefHistoryMock.mockResolvedValueOnce([
      makeBrief({ id: 1 }),
      makeBrief({ id: 2 }),
    ]);
    deleteBriefMock.mockResolvedValueOnce(undefined);
    renderHistory();
    await act(async () => { await Promise.resolve(); });

    const deleteBtn = screen.getAllByLabelText('Delete')[0];
    await act(async () => {
      deleteBtn.click();
      await Promise.resolve();
    });
    expect(deleteBriefMock).toHaveBeenCalledTimes(1);
    const rows = document.querySelectorAll('[role="button"]');
    expect(rows.length).toBe(1);
  });

  it('reloads list when refreshKey prop changes', async () => {
    getBriefHistoryMock.mockResolvedValue([]);
    const { rerender } = render(
      <LocaleProvider locale={'en' as never} dict={dict as never}>
        <BriefHistory refreshKey={1} />
      </LocaleProvider>,
    );
    await act(async () => { await Promise.resolve(); });
    expect(getBriefHistoryMock).toHaveBeenCalledTimes(1);

    rerender(
      <LocaleProvider locale={'en' as never} dict={dict as never}>
        <BriefHistory refreshKey={2} />
      </LocaleProvider>,
    );
    await act(async () => { await Promise.resolve(); });
    expect(getBriefHistoryMock).toHaveBeenCalledTimes(2);
  });
});
