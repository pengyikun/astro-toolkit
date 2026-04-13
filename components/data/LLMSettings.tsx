'use client';

import { useState, useTransition } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { saveLlmSettings, deleteLlmSettings } from '@/actions/intelligence';

interface LLMSettingsProps {
  initialSetting: {
    id?: number;
    base_url: string;
    model_name: string;
    max_tokens: number;
    context_window: number;
  } | null;
}

export default function LLMSettings({ initialSetting }: LLMSettingsProps) {
  const { t } = useLocale();
  const [isSaving, startSaveTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startSaveTransition(async () => {
      const result = await saveLlmSettings(formData);
      if (result.success) {
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
                  max={128000}
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
                  max={2000000}
                  required
                  className="console-input w-full"
                  placeholder="128000"
                />
              </div>
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
