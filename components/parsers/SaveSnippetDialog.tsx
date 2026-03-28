'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/lib/i18n/client';
import { showToast } from '@/components/ui/FlashMessage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SaveSnippetDialogProps {
  snippetType: 'json' | 'xml';
  content: string;
  parseResult: string;
  disabled?: boolean;
}

export default function SaveSnippetDialog({ snippetType, content, parseResult, disabled }: SaveSnippetDialogProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          snippet_type: snippetType,
          content,
          parse_result: parseResult,
          notes: notes.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      showToast('success', t('parser.snippetSaved'));
      setTitle('');
      setNotes('');
      setOpen(false);
    } catch {
      showToast('error', t('toast.error'));
    } finally {
      setSaving(false);
    }
  }, [title, notes, content, parseResult, snippetType, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          {t('parser.saveSnippet')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('parser.saveSnippet')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="snippet-title">{t('parser.snippetTitle')}</Label>
            <Input
              id="snippet-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('parser.snippetTitlePlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="snippet-notes">{t('parser.snippetNotes')}</Label>
            <Textarea
              id="snippet-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('parser.snippetNotesPlaceholder')}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? t('parser.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
