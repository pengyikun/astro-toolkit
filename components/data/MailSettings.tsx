'use client';

import { useState, useTransition } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { saveMailSettings, deleteMailSettings, testMailConnection } from '@/actions/mail';

interface MailSettingsProps {
  initialSetting: {
    id?: number;
    imap_host: string;
    imap_port: number;
    imap_encryption: string;
    imap_login: string;
    email: string;
  } | null;
}

export default function MailSettings({ initialSetting }: MailSettingsProps) {
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
      const result = await saveMailSettings(formData);
      if (result.success) {
        setMessage({ type: 'success', text: t('settings.mailSettingsSaved') });
      } else {
        setMessage({ type: 'error', text: result.errors?.[0]?.message || 'Save failed' });
      }
    });
  };

  const handleTest = () => {
    setMessage(null);
    startTestTransition(async () => {
      const result = await testMailConnection();
      if (result.success) {
        setMessage({ type: 'success', text: t('mail.connectionSuccess') });
      } else {
        setMessage({ type: 'error', text: `${t('mail.connectionFailed')}: ${result.error}` });
      }
    });
  };

  const handleDelete = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startDeleteTransition(async () => {
      await deleteMailSettings(formData);
      setMessage({ type: 'success', text: t('settings.mailSettingsDeleted') });
    });
  };

  return (
    <section className="section-block">
      <div className="section-head">
        <h2 className="console-section-title">{t('settings.mail')}</h2>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-sm leading-6 text-ink-secondary">{t('settings.mailDescription')}</p>
          </div>

          {message && (
            <div className={`console-notice ${message.type === 'success' ? 'success' : 'danger'} mb-4`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">{t('settings.emailAddress')}</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={initialSetting?.email ?? ''}
                  required
                  className="console-input w-full"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label htmlFor="imap_login" className="mb-1.5 block text-sm font-medium text-ink">{t('settings.imapLogin')}</label>
                <input
                  id="imap_login"
                  name="imap_login"
                  type="text"
                  defaultValue={initialSetting?.imap_login ?? ''}
                  required
                  className="console-input w-full"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="imap_host" className="mb-1.5 block text-sm font-medium text-ink">{t('settings.imapHost')}</label>
                <input
                  id="imap_host"
                  name="imap_host"
                  type="text"
                  defaultValue={initialSetting?.imap_host ?? ''}
                  required
                  className="console-input w-full"
                  placeholder="imap.example.com"
                />
              </div>
              <div>
                <label htmlFor="imap_port" className="mb-1.5 block text-sm font-medium text-ink">{t('settings.imapPort')}</label>
                <input
                  id="imap_port"
                  name="imap_port"
                  type="number"
                  defaultValue={initialSetting?.imap_port ?? 993}
                  required
                  min={1}
                  max={65535}
                  className="console-input w-full"
                />
              </div>
              <div>
                <label htmlFor="imap_encryption" className="mb-1.5 block text-sm font-medium text-ink">{t('settings.imapEncryption')}</label>
                <select
                  id="imap_encryption"
                  name="imap_encryption"
                  defaultValue={initialSetting?.imap_encryption ?? 'tls'}
                  className="console-input w-full"
                >
                  <option value="tls">{t('settings.encryptionTls')}</option>
                  <option value="start-tls">{t('settings.encryptionStartTls')}</option>
                  <option value="none">{t('settings.encryptionNone')}</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="imap_password" className="mb-1.5 block text-sm font-medium text-ink">{t('settings.imapPassword')}</label>
              <input
                id="imap_password"
                name="imap_password"
                type="password"
                required={!initialSetting}
                className="console-input w-full"
                placeholder={initialSetting ? '••••••••' : ''}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className={isSaving ? 'opacity-75 cursor-not-allowed' : ''}
              >
                {isSaving ? t('settings.savingMailSettings') : t('settings.saveMailSettings')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !initialSetting}
                className={isTesting ? 'opacity-75 cursor-not-allowed' : ''}
              >
                {isTesting ? t('mail.testingConnection') : t('mail.testConnection')}
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
                {t('settings.deleteMailSettings')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
