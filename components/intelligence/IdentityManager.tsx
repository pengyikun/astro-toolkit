'use client';

import { useState, useTransition } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { addIdentityEntry, removeIdentityEntry, getIdentityEntries } from '@/actions/intelligence';
import type { IdentityAlias, IdentityAliasField } from '@/types';

interface IdentityManagerProps {
  initialEntries: IdentityAlias[];
}

interface FieldConfig {
  field: IdentityAliasField;
  titleKey: string;
  descriptionKey: string;
  placeholderKey: string;
  inputType: string;
}

const FIELD_CONFIGS: FieldConfig[] = [
  {
    field: 'name',
    titleKey: 'intelligence.sectionName',
    descriptionKey: 'intelligence.sectionNameDesc',
    placeholderKey: 'intelligence.namePlaceholder',
    inputType: 'text',
  },
  {
    field: 'email',
    titleKey: 'intelligence.sectionEmail',
    descriptionKey: 'intelligence.sectionEmailDesc',
    placeholderKey: 'intelligence.emailEntryPlaceholder',
    inputType: 'email',
  },
  {
    field: 'phone',
    titleKey: 'intelligence.sectionPhone',
    descriptionKey: 'intelligence.sectionPhoneDesc',
    placeholderKey: 'intelligence.phoneEntryPlaceholder',
    inputType: 'tel',
  },
  {
    field: 'company',
    titleKey: 'intelligence.sectionCompany',
    descriptionKey: 'intelligence.sectionCompanyDesc',
    placeholderKey: 'intelligence.companyEntryPlaceholder',
    inputType: 'text',
  },
  {
    field: 'colleague',
    titleKey: 'intelligence.sectionColleague',
    descriptionKey: 'intelligence.sectionColleagueDesc',
    placeholderKey: 'intelligence.colleagueEntryPlaceholder',
    inputType: 'text',
  },
];

export default function IdentityManager({ initialEntries }: IdentityManagerProps) {
  const [entries, setEntries] = useState(initialEntries);

  const refreshEntries = async () => {
    const data = await getIdentityEntries();
    setEntries(data.entries);
  };

  return (
    <div className="section-stack">
      {FIELD_CONFIGS.map((config) => (
        <IdentityFieldSection
          key={config.field}
          config={config}
          entries={entries.filter((e) => e.field === config.field)}
          onUpdate={refreshEntries}
        />
      ))}
    </div>
  );
}

function IdentityFieldSection({
  config,
  entries,
  onUpdate,
}: {
  config: FieldConfig;
  entries: IdentityAlias[];
  onUpdate: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [isAdding, startAddTransition] = useTransition();
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inputValue, setInputValue] = useState('');

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    if (!inputValue.trim()) return;

    const formData = new FormData();
    formData.set('field', config.field);
    formData.set('alias_value', inputValue.trim());

    startAddTransition(async () => {
      const result = await addIdentityEntry(formData);
      if (result.success) {
        setInputValue('');
        await onUpdate();
      } else {
        setMessage({ type: 'error', text: result.errors?.[0]?.message || 'Failed to add' });
      }
    });
  };

  const handleRemove = (id: number) => {
    setMessage(null);
    setRemovingId(id);

    const formData = new FormData();
    formData.set('id', String(id));

    startAddTransition(async () => {
      await removeIdentityEntry(formData);
      setRemovingId(null);
      await onUpdate();
    });
  };

  return (
    <section className="section-block">
      <div className="section-head">
        <h2 className="console-section-title">{t(config.titleKey)}</h2>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <p className="mb-3 text-sm leading-6 text-ink-secondary">{t(config.descriptionKey)}</p>

          {message && (
            <div className={`console-notice ${message.type === 'success' ? 'success' : 'danger'} mb-3`}>
              {message.text}
            </div>
          )}

          {/* Existing entries */}
          {entries.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="group flex items-center justify-between rounded-md border border-border bg-surface-secondary/30 px-3 py-2 transition-colors hover:bg-surface-secondary/60"
                >
                  <span className="text-sm text-ink">{entry.alias_value}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(entry.id)}
                    disabled={removingId === entry.id}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-ink-secondary hover:text-red-500 h-7 px-2"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type={config.inputType}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="console-input flex-1"
              placeholder={t(config.placeholderKey)}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isAdding || !inputValue.trim()}
              className={`shrink-0 ${isAdding ? 'opacity-75' : ''}`}
            >
              {isAdding ? t('common.loading') : t('intelligence.addEntry')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
