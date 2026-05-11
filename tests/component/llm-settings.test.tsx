// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, screen } from '@testing-library/react';
import LLMSettings from '../../components/data/LLMSettings';
import { LocaleProvider } from '../../lib/i18n/client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const saveLlmSettingsMock = vi.fn();
const deleteLlmSettingsMock = vi.fn();
vi.mock('../../actions/intelligence', () => ({
  saveLlmSettings: (...args: unknown[]) => saveLlmSettingsMock(...args),
  deleteLlmSettings: (...args: unknown[]) => deleteLlmSettingsMock(...args),
}));

const dict = {
  'common.save': 'Save',
  'common.loading': 'Loading',
  'settings.llm': 'LLM',
  'settings.llmDescription': 'desc',
  'settings.llmBaseUrl': 'Base URL',
  'settings.llmBaseUrlPlaceholder': 'https://api...',
  'settings.llmApiKey': 'API key',
  'settings.llmApiKeyPlaceholder': 'sk-...',
  'settings.llmApiKeySet': 'API key is set',
  'settings.llmModelName': 'Model',
  'settings.llmModelNamePlaceholder': 'gpt-4',
  'settings.llmMaxTokens': 'Max tokens',
  'settings.llmContextWindow': 'Context window',
  'settings.llmEnableThinking': 'Enable thinking',
  'settings.llmEnableThinkingDescription': 'thinking models',
  'settings.llmVerify': 'Test',
  'settings.llmVerifying': 'Testing',
  'settings.llmDeleteSettings': 'Delete settings',
  'settings.llmSettingsSaved': 'Saved',
  'settings.llmSettingsDeleted': 'Deleted',
  'settings.llmConnectionSuccess': 'Connection OK',
  'settings.llmConnectionFailed': 'Connection failed',
};

const initial = {
  id: 7,
  base_url: 'https://api.openai.com',
  model_name: 'gpt-4',
  max_tokens: 4096,
  context_window: 128000,
  enable_thinking: false,
};

function renderSettings(props: { initialSetting?: typeof initial | null; hasApiKey?: boolean } = {}) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <LLMSettings
        initialSetting={props.initialSetting === undefined ? initial : props.initialSetting}
        hasApiKey={props.hasApiKey ?? true}
      />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  saveLlmSettingsMock.mockReset();
  deleteLlmSettingsMock.mockReset();
  // @ts-expect-error - test stub
  global.fetch = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LLMSettings', () => {
  it('shows masked API key placeholder when hasApiKey=true', () => {
    renderSettings();
    const apiInput = screen.getByLabelText('API key') as HTMLInputElement;
    expect(apiInput.value).toBe('******');
  });

  it('shows empty API key when hasApiKey=false', () => {
    renderSettings({ initialSetting: null, hasApiKey: false });
    const apiInput = screen.getByLabelText('API key') as HTMLInputElement;
    expect(apiInput.value).toBe('');
  });

  it('clears mask on focus and restores on blur if untouched', () => {
    renderSettings();
    const apiInput = screen.getByLabelText('API key') as HTMLInputElement;
    act(() => apiInput.focus());
    expect(apiInput.value).toBe('');
    act(() => apiInput.blur());
    expect(apiInput.value).toBe('******');
  });

  it('on save, strips the masked sentinel so the action receives empty api_key', async () => {
    saveLlmSettingsMock.mockResolvedValueOnce({ success: true });
    renderSettings();

    const form = document.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.requestSubmit();
      await Promise.resolve();
    });

    expect(saveLlmSettingsMock).toHaveBeenCalledTimes(1);
    const formData: FormData = saveLlmSettingsMock.mock.calls[0][0];
    expect(formData.get('api_key')).toBe('');
    expect(formData.get('base_url')).toBe('https://api.openai.com');
  });

  it('shows success message after a successful save', async () => {
    saveLlmSettingsMock.mockResolvedValueOnce({ success: true });
    renderSettings();
    const form = document.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.requestSubmit();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Saved');
  });

  it('shows error message when save returns errors', async () => {
    saveLlmSettingsMock.mockResolvedValueOnce({
      success: false,
      errors: [{ field: 'base_url', message: 'invalid url' }],
    });
    renderSettings();
    const form = document.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.requestSubmit();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('invalid url');
  });

  it('Test button calls /api/intelligence/llm-verify and surfaces success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });
    renderSettings();
    const testBtn = screen.getByText('Test') as HTMLButtonElement;
    await act(async () => {
      testBtn.click();
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/intelligence/llm-verify', { method: 'POST' });
    expect(document.body.textContent).toContain('Connection OK');
  });

  it('Test button surfaces failure with error message', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'bad creds' }),
    });
    renderSettings();
    const testBtn = screen.getByText('Test') as HTMLButtonElement;
    await act(async () => {
      testBtn.click();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('bad creds');
  });

  it('Delete button submits the delete form and clears the API key state', async () => {
    deleteLlmSettingsMock.mockResolvedValueOnce(undefined);
    renderSettings();
    const deleteForm = document.querySelectorAll('form')[1] as HTMLFormElement;
    expect(deleteForm).toBeTruthy();

    await act(async () => {
      deleteForm.requestSubmit();
      await Promise.resolve();
    });

    expect(deleteLlmSettingsMock).toHaveBeenCalledTimes(1);
    const fd: FormData = deleteLlmSettingsMock.mock.calls[0][0];
    expect(fd.get('id')).toBe('7');
    expect(document.body.textContent).toContain('Deleted');
  });

  it('does not render the Delete form when there is no existing setting id', () => {
    renderSettings({ initialSetting: null, hasApiKey: false });
    const forms = document.querySelectorAll('form');
    expect(forms.length).toBe(1);
  });
});
