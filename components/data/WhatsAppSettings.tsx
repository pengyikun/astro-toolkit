'use client';

import { useState, useRef, useTransition } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { saveWhatsAppSettings, deleteWhatsAppSettings, testWhatsAppDb, pickDatabaseFile } from '@/actions/whatsapp';

interface WhatsAppSettingsProps {
  initialSetting: {
    id?: number;
    db_path: string;
  } | null;
}

export default function WhatsAppSettings({ initialSetting }: WhatsAppSettingsProps) {
  const { t } = useLocale();
  const [isSaving, startSaveTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isBrowsing, startBrowseTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const dbPathInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startSaveTransition(async () => {
      const result = await saveWhatsAppSettings(formData);
      if (result.success) {
        setMessage({ type: 'success', text: t('settings.whatsappSettingsSaved') });
      } else {
        setMessage({ type: 'error', text: result.errors?.[0]?.message || 'Save failed' });
      }
    });
  };

  const handleTest = () => {
    setMessage(null);
    startTestTransition(async () => {
      const result = await testWhatsAppDb();
      if (result.success) {
        setMessage({ type: 'success', text: t('whatsapp.connectionSuccess') });
      } else {
        setMessage({ type: 'error', text: `${t('whatsapp.connectionFailed')}: ${result.error}` });
      }
    });
  };

  const handleDelete = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startDeleteTransition(async () => {
      await deleteWhatsAppSettings(formData);
      setMessage({ type: 'success', text: t('settings.whatsappSettingsDeleted') });
    });
  };

  const handleBrowse = () => {
    startBrowseTransition(async () => {
      const result = await pickDatabaseFile();
      if (result.success && result.path && dbPathInputRef.current) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(dbPathInputRef.current, result.path);
          dbPathInputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          dbPathInputRef.current.value = result.path;
        }
      }
    });
  };

  return (
    <section className="section-block">
      <div className="section-head">
        <h2 className="console-section-title">{t('settings.whatsapp')}</h2>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-sm leading-6 text-ink-secondary">{t('settings.whatsappDescription')}</p>
          </div>

          {message && (
            <div className={`console-notice ${message.type === 'success' ? 'success' : 'danger'} mb-4`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="wa_db_path" className="mb-1.5 block text-sm font-medium text-ink">{t('settings.whatsappDbPath')}</label>
              <div className="flex gap-2">
                <input
                  ref={dbPathInputRef}
                  id="wa_db_path"
                  name="db_path"
                  type="text"
                  defaultValue={initialSetting?.db_path ?? ''}
                  required
                  className="console-input flex-1"
                  placeholder={t('settings.whatsappDbPathPlaceholder')}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBrowse}
                  disabled={isBrowsing}
                >
                  {isBrowsing ? t('common.loading') : t('fileBrowser.browse')}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className={isSaving ? 'opacity-75 cursor-not-allowed' : ''}
              >
                {isSaving ? t('settings.savingWhatsappSettings') : t('settings.saveWhatsappSettings')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !initialSetting}
                className={isTesting ? 'opacity-75 cursor-not-allowed' : ''}
              >
                {isTesting ? t('whatsapp.testingConnection') : t('whatsapp.testConnection')}
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
                {t('settings.deleteWhatsappSettings')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
