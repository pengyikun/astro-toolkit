import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import LLMSettings from '@/components/data/LLMSettings';
import IdentityManager from '@/components/intelligence/IdentityManager';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';
import { getLlmSettings, getIdentityEntries } from '@/actions/intelligence';

export const metadata: Metadata = { title: 'AI — Settings' };

export default async function SettingsAiPage() {
  await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const llmSetting = await getLlmSettings();
  const { entries } = await getIdentityEntries();

  return (
    <>
      <PageHeader
        title={t(dict, 'settings.aiPage')}
      />

      <div className="section-stack">
        <LLMSettings
          initialSetting={llmSetting ? {
            id: llmSetting.id,
            base_url: llmSetting.base_url,
            model_name: llmSetting.model_name,
            max_tokens: llmSetting.max_tokens,
            context_window: llmSetting.context_window,
            enable_thinking: llmSetting.enable_thinking,
          } : null}
          hasApiKey={llmSetting?.hasApiKey ?? false}
        />

        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">{t(dict, 'intelligence.identity')}</h2>
            <p className="text-sm text-ink-secondary mt-1">{t(dict, 'intelligence.identityPageDescription')}</p>
          </div>
          <IdentityManager initialEntries={entries} />
        </section>
      </div>
    </>
  );
}
