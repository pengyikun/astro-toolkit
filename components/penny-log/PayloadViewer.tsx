'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CodeOutput } from '@/components/ui/code-output';

interface PayloadViewerProps {
  title: string;
  payload: string;
}

function formatJson(str: string): string {
  if (!str) return '';
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export default function PayloadViewer({ title, payload }: PayloadViewerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const formatted = formatJson(payload);
  const sectionId = useId();
  const triggerId = `${sectionId}-trigger`;
  const panelId = `${sectionId}-panel`;

  return (
    <Card>
      <CardContent className="p-5">
        <Button
          id={triggerId}
          type="button"
          variant="ghost"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="h-auto w-full justify-start gap-2 px-0 py-0 text-left hover:bg-transparent"
        >
          <svg
            className={`w-3.5 h-3.5 text-ink-secondary transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span className="console-inline-label">{title}</span>
        </Button>
        {isOpen && (
          <div id={panelId} role="region" aria-labelledby={triggerId} className="mt-4">
            <CodeOutput>{formatted}</CodeOutput>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
