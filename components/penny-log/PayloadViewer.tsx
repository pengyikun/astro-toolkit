'use client';

import { useState } from 'react';

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

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 w-full text-left"
      >
        <svg
          className={`w-3.5 h-3.5 text-ink-secondary transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
        </svg>
        <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">{title}</h3>
      </button>
      {isOpen && (
        <pre className="bg-page rounded-md p-4 text-xs text-ink font-mono overflow-x-auto whitespace-pre-wrap border border-border mt-4">
          {formatted}
        </pre>
      )}
    </div>
  );
}
