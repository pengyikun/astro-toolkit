'use client';

import { useState, useTransition, useRef } from 'react';
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
  const { t } = useLocale();
  const [entries, setEntries] = useState(initialEntries);

  const refreshEntries = async () => {
    const data = await getIdentityEntries();
    setEntries(data.entries);
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-5 divide-y divide-border">
        {FIELD_CONFIGS.map((config) => (
          <IdentityFieldRow
            key={config.field}
            config={config}
            entries={entries.filter((e) => e.field === config.field)}
            onUpdate={refreshEntries}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function IdentityFieldRow({
  config,
  entries,
  onUpdate,
}: {
  config: FieldConfig;
  entries: IdentityAlias[];
  onUpdate: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [isAdding, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const formData = new FormData();
    formData.set('field', config.field);
    formData.set('alias_value', inputValue.trim());

    startTransition(async () => {
      const result = await addIdentityEntry(formData);
      if (result.success) {
        setInputValue('');
        await onUpdate();
        inputRef.current?.focus();
      }
    });
  };

  const handleRemove = (id: number) => {
    setRemovingId(id);
    const formData = new FormData();
    formData.set('id', String(id));

    startTransition(async () => {
      await removeIdentityEntry(formData);
      setRemovingId(null);
      await onUpdate();
    });
  };

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        <div className="sm:w-36 shrink-0">
          <div className="text-sm font-medium text-ink">{t(config.titleKey)}</div>
          <div className="text-xs text-ink-muted mt-0.5 hidden sm:block">{t(config.descriptionKey)}</div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {entries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entries.map((entry) => (
                <span
                  key={entry.id}
                  className="inline-flex items-center gap-1 rounded-md bg-surface-secondary/50 border border-border px-2 py-1 text-sm text-ink"
                >
                  {entry.alias_value}
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.id)}
                    disabled={removingId === entry.id}
                    className="ml-0.5 text-ink-muted hover:text-red-500 transition-colors text-xs leading-none"
                    aria-label={`Remove ${entry.alias_value}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              ref={inputRef}
              type={config.inputType}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="console-input flex-1 min-w-0"
              placeholder={t(config.placeholderKey)}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isAdding || !inputValue.trim()}
              className={`shrink-0 ${isAdding ? 'opacity-75' : ''}`}
            >
              {t('intelligence.addEntry')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
