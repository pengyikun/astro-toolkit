'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { saveLlmSettings, deleteLlmSettings } from '@/actions/intelligence';

const MASKED_API_KEY = '******';

interface LLMSettingsProps {
  initialSetting: {
    id?: number;
    base_url: string;
    model_name: string;
    max_tokens: number;
    context_window: number;
    enable_thinking: boolean;
  } | null;
  hasApiKey: boolean;
}

export default function LLMSettings({ initialSetting, hasApiKey }: LLMSettingsProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [apiKeySaved, setApiKeySaved] = useState(hasApiKey);
  const [apiKeyValue, setApiKeyValue] = useState(hasApiKey ? MASKED_API_KEY : '');
  const [isSaving, startSaveTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setApiKeySaved(hasApiKey);
    setApiKeyValue(hasApiKey ? MASKED_API_KEY : '');
  }, [hasApiKey]);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const submittedApiKey = String(formData.get('api_key') ?? '');
    if (submittedApiKey === MASKED_API_KEY) {
      formData.set('api_key', '');
    }

    startSaveTransition(async () => {
      const result = await saveLlmSettings(formData);
      if (result.success) {
        setApiKeySaved((current) => Boolean(submittedApiKey) || current);
        setApiKeyValue(submittedApiKey || apiKeySaved ? MASKED_API_KEY : '');
        router.refresh();
        setMessage({ type: 'success', text: t('settings.llmSettingsSaved') });
      } else {
        setMessage({ type: 'error', text: result.errors?.[0]?.message || 'Save failed' });
      }
    });
  };

  const handleTest = () => {
    setMessage(null);
    startTestTransition(async () => {
      try {
        const res = await fetch('/api/intelligence/llm-verify', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          setMessage({ type: 'success', text: t('settings.llmConnectionSuccess') });
        } else {
          setMessage({ type: 'error', text: `${t('settings.llmConnectionFailed')}: ${result.error}` });
        }
      } catch {
        setMessage({ type: 'error', text: t('settings.llmConnectionFailed') });
      }
    });
  };

  const handleDelete = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startDeleteTransition(async () => {
      await deleteLlmSettings(formData);
      setApiKeySaved(false);
      setApiKeyValue('');
      router.refresh();
      setMessage({ type: 'success', text: t('settings.llmSettingsDeleted') });
    });
  };

  return (
    <section className="section-block">
      <div className="section-head">
        <h2 className="console-section-title">{t('settings.llm')}</h2>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-sm leading-6 text-ink-secondary">{t('settings.llmDescription')}</p>
          </div>

          {message && (
            <div className={`console-notice ${message.type === 'success' ? 'success' : 'danger'} mb-4`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="llm_base_url" className="mb-1.5 block text-sm font-medium text-ink">
                {t('settings.llmBaseUrl')}
              </label>
              <input
                id="llm_base_url"
                name="base_url"
                type="url"
                defaultValue={initialSetting?.base_url ?? ''}
                required
                className="console-input w-full"
                placeholder={t('settings.llmBaseUrlPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="llm_api_key" className="mb-1.5 block text-sm font-medium text-ink">
                {t('settings.llmApiKey')}
              </label>
              <input
                id="llm_api_key"
                name="api_key"
                type="password"
                value={apiKeyValue}
                onChange={(event) => setApiKeyValue(event.target.value)}
                onFocus={() => {
                  if (apiKeyValue === MASKED_API_KEY) setApiKeyValue('');
                }}
                onBlur={() => {
                  if (!apiKeyValue && apiKeySaved) setApiKeyValue(MASKED_API_KEY);
                }}
                className="console-input w-full"
                placeholder={apiKeySaved ? '••••••••' : t('settings.llmApiKeyPlaceholder')}
                autoComplete="new-password"
              />
              {apiKeySaved && (
                <p className="mt-1 text-xs text-ink-secondary">{t('settings.llmApiKeySet')}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="llm_model_name" className="mb-1.5 block text-sm font-medium text-ink">
                  {t('settings.llmModelName')}
                </label>
                <input
                  id="llm_model_name"
                  name="model_name"
                  type="text"
                  defaultValue={initialSetting?.model_name ?? ''}
                  required
                  className="console-input w-full"
                  placeholder={t('settings.llmModelNamePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="llm_max_tokens" className="mb-1.5 block text-sm font-medium text-ink">
                  {t('settings.llmMaxTokens')}
                </label>
                <input
                  id="llm_max_tokens"
                  name="max_tokens"
                  type="number"
                  defaultValue={initialSetting?.max_tokens ?? 4096}
                  min={1}
                  required
                  className="console-input w-full"
                  placeholder="4096"
                />
              </div>
              <div>
                <label htmlFor="llm_context_window" className="mb-1.5 block text-sm font-medium text-ink">
                  {t('settings.llmContextWindow')}
                </label>
                <input
                  id="llm_context_window"
                  name="context_window"
                  type="number"
                  defaultValue={initialSetting?.context_window ?? 128000}
                  min={1000}
                  required
                  className="console-input w-full"
                  placeholder="128000"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="llm_enable_thinking"
                name="enable_thinking"
                type="checkbox"
                defaultChecked={initialSetting?.enable_thinking ?? false}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                value="on"
              />
              <label htmlFor="llm_enable_thinking" className="text-sm font-medium text-ink">
                {t('settings.llmEnableThinking')}
              </label>
              <span className="text-xs text-ink-secondary">{t('settings.llmEnableThinkingDescription')}</span>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={isSaving} className={isSaving ? 'opacity-75 cursor-not-allowed' : ''}>
                {isSaving ? t('common.loading') : t('common.save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !initialSetting}
                className={isTesting ? 'opacity-75 cursor-not-allowed' : ''}
              >
                {isTesting ? t('settings.llmVerifying') : t('settings.llmVerify')}
              </Button>
            </div>
          </form>

          {initialSetting?.id && (
            <form onSubmit={handleDelete} className="mt-4 pt-4 border-t border-border">
              <input type="hidden" name="id" value={initialSetting.id} />
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                className={isDeleting ? 'opacity-75 cursor-not-allowed' : ''}
              >
                {t('settings.llmDeleteSettings')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
