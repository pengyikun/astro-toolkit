'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';

interface SearchResult {
  id: number;
  type: string;
  title: string;
  meta: string;
  url: string;
}

interface SearchResponse {
  query: string;
  results: {
    accounts: SearchResult[];
    credentials: SearchResult[];
    transactions: SearchResult[];
  };
  total: number;
}

export default function GlobalSearch() {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const allResults = results
    ? [
        ...results.results.accounts,
        ...results.results.credentials,
        ...results.results.transactions,
      ]
    : [];

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data: SearchResponse = await res.json();
      setResults(data);
      setIsOpen(data.total > 0);
    } catch {
      // silently fail
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchResults(value), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      window.location.href = allResults[activeIndex].url;
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const renderSection = (label: string, items: SearchResult[]) => {
    if (items.length === 0) return null;
    return (
      <div className="console-search-section">
        <div className="console-search-section-title">{label}</div>
        {items.map((item) => {
          const globalIdx = allResults.indexOf(item);
          return (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.url}
              className={`console-search-result ${globalIdx === activeIndex ? 'console-search-result-active' : ''}`}
              role="option"
              aria-selected={globalIdx === activeIndex}
              onClick={() => setIsOpen(false)}
            >
              <div className="console-search-result-title">{item.title}</div>
              <div className="console-search-result-meta">{item.meta}</div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="console-search-shell" ref={containerRef} role="search" aria-label={t('search.label')}>
      <label className="console-search">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.6-5.15a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          placeholder={t('search.placeholder')}
          aria-label={t('search.label')}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="global-search-results"
          autoComplete="off"
          spellCheck={false}
          maxLength={120}
          enterKeyHint="search"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results && results.total > 0) setIsOpen(true);
          }}
        />
      </label>
      {isOpen && results && (
        <div id="global-search-results" className="console-search-results" role="listbox" aria-label="Search results">
          {renderSection(t('search.accounts'), results.results.accounts)}
          {renderSection(t('search.credentials'), results.results.credentials)}
          {renderSection(t('search.transactions'), results.results.transactions)}
        </div>
      )}
    </div>
  );
}
