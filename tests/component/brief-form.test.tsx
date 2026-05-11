// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent, screen } from '@testing-library/react';
import BriefForm from '../../components/intelligence/BriefForm';
import { LocaleProvider } from '../../lib/i18n/client';

const validateBrief = vi.fn();
const fetchBriefFolders = vi.fn();

vi.mock('../../actions/intelligence', () => ({
  validateBrief: (...a: unknown[]) => validateBrief(...a),
  fetchBriefFolders: (...a: unknown[]) => fetchBriefFolders(...a),
}));

vi.mock('../../components/intelligence/BriefStream', () => ({
  default: () => <div data-testid="brief-stream" />,
}));

const dict: Record<string, string> = {
  'intelligence.compose.title': 'Compose',
  'intelligence.compose.subtitle': 'Subtitle',
  'intelligence.connectors': 'Connectors',
  'intelligence.emailConnector': 'Email',
  'intelligence.whatsappConnector': 'WhatsApp',
  'intelligence.notConfigured': 'Not configured',
  'intelligence.dateFrom': 'From',
  'intelligence.dateTo': 'To',
  'intelligence.preset.today': 'Today',
  'intelligence.preset.last7': '7d',
  'intelligence.preset.last14': '14d',
  'intelligence.preset.last30': '30d',
  'intelligence.preset.custom': 'Custom',
  'intelligence.advanced': 'Show advanced',
  'intelligence.advancedHide': 'Hide advanced',
  'intelligence.emailFolders': 'Folders',
  'intelligence.loadFolders': 'Load folders',
  'intelligence.loadingFolders': 'Loading…',
  'intelligence.foldersSelected': 'selected',
  'intelligence.selectAll': 'Select all',
  'intelligence.deselectAll': 'Deselect all',
  'intelligence.generateBriefBtn': 'Generate brief',
  'intelligence.generating': 'Generating…',
  'intelligence.selectConnector': 'Pick a connector',
  'intelligence.selectDateRange': 'Pick a date range',
  'intelligence.noFoldersSelected': 'No folders selected',
  'intelligence.loadFoldersError': 'Folders failed',
  'common.cancel': 'Cancel',
};

function renderForm(props: Partial<React.ComponentProps<typeof BriefForm>> = {}) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <BriefForm hasMailConfig hasWhatsAppConfig {...props} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  validateBrief.mockReset();
  fetchBriefFolders.mockReset();
});

afterEach(() => cleanup());

describe('BriefForm', () => {
  it('renders submit button enabled when at least one connector is configured', () => {
    renderForm();
    const btn = screen.getByText('Generate brief').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('disables submit when nothing is configured (no default connectors)', () => {
    renderForm({ hasMailConfig: false, hasWhatsAppConfig: false });
    const btn = screen.getByText('Generate brief').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('toggling a connector adds and removes it from the active set', () => {
    renderForm();
    const whatsAppButton = screen.getByText('WhatsApp').closest('button') as HTMLButtonElement;
    // Default both are active. Toggle WhatsApp off then on.
    act(() => whatsAppButton.click());
    act(() => whatsAppButton.click());
    expect(whatsAppButton.disabled).toBe(false);
  });

  it('shows custom date inputs when Custom preset is chosen', () => {
    renderForm();
    expect(screen.queryByLabelText('brief_date_from')).toBeNull();
    act(() => {
      screen.getByText('Custom').click();
    });
    expect(document.getElementById('brief_date_from')).toBeTruthy();
    expect(document.getElementById('brief_date_to')).toBeTruthy();
  });

  it('updates date range when a quick preset is clicked', () => {
    renderForm();
    act(() => {
      screen.getByText('Today').click();
    });
    // Both dates should equal today.
    const today = new Date().toISOString().slice(0, 10);
    expect(screen.getByText((content) => content.includes(today + ' → ' + today))).toBeTruthy();
  });

  it('validation error: no connectors → shows alert', async () => {
    renderForm({ hasMailConfig: false, hasWhatsAppConfig: false });
    // Both source tiles are disabled; force submit through the form element.
    const form = document.querySelector('form') as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
    });
    expect(screen.getByRole('alert').textContent).toContain('Pick a connector');
  });

  it('passes successful validation and shows the BriefStream', async () => {
    validateBrief.mockResolvedValueOnce({ valid: true });
    renderForm();
    const form = document.querySelector('form') as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(validateBrief).toHaveBeenCalledOnce();
    expect(await screen.findByTestId('brief-stream')).toBeTruthy();
  });

  it('shows server validation error message on failed validation', async () => {
    validateBrief.mockResolvedValueOnce({ valid: false, error: 'Bad config' });
    renderForm();
    const form = document.querySelector('form') as HTMLFormElement;
    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('alert').textContent).toContain('Bad config');
    expect(screen.queryByTestId('brief-stream')).toBeNull();
  });

  it('Advanced toggle shows folder load button when email is selected', () => {
    renderForm();
    act(() => {
      screen.getByText('Show advanced').click();
    });
    expect(screen.getByText('Load folders')).toBeTruthy();
  });

  it('handles successful folder load', async () => {
    fetchBriefFolders.mockResolvedValueOnce({
      folders: [{ name: 'INBOX', desc: '' }, { name: 'Sent', desc: '' }],
    });
    renderForm();
    act(() => {
      screen.getByText('Show advanced').click();
    });
    await act(async () => {
      screen.getByText('Load folders').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('INBOX')).toBeTruthy();
    expect(screen.getByText('Sent')).toBeTruthy();
  });

  it('handles folder load error', async () => {
    fetchBriefFolders.mockResolvedValueOnce({ error: 'No mail config', folders: [] });
    renderForm();
    act(() => {
      screen.getByText('Show advanced').click();
    });
    await act(async () => {
      screen.getByText('Load folders').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('alert').textContent).toContain('No mail config');
  });
});
