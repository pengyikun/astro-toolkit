'use client';

import { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listboxId = useId();

  const sections = useMemo(
    () => results
      ? [
          { key: 'accounts', label: t('search.accounts'), items: results.results.accounts },
          { key: 'credentials', label: t('search.credentials'), items: results.results.credentials },
          { key: 'transactions', label: t('search.transactions'), items: results.results.transactions },
        ]
      : [],
    [results, t],
  );

  const allResults = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );

  function getResultId(item: SearchResult) {
    return `${listboxId}-${item.type}-${item.id}`;
  }

  const fetchResults = useCallback(async (q: string) => {
    const normalizedQuery = q.trim();

    if (normalizedQuery.length < 2) {
      abortRef.current?.abort();
      setResults(null);
      setIsOpen(false);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setHasError(false);
    setIsOpen(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error('search-request-failed');
      }
      const data: SearchResponse = await res.json();
      if (controller.signal.aborted) return;
      setResults(data);
      setActiveIndex(-1);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setResults(null);
      setHasError(true);
      setActiveIndex(-1);
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
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
      const activeResult = allResults[activeIndex];
      if (!activeResult) return;
      setIsOpen(false);
      router.push(activeResult.url);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
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
      abortRef.current?.abort();
    };
  }, []);

  const renderSection = (sectionKey: string, label: string, items: SearchResult[], startIndex: number) => {
    if (items.length === 0) return null;
    const titleId = `${listboxId}-${sectionKey}-label`;
    return (
      <div className="console-search-section" role="group" aria-labelledby={titleId}>
        <div id={titleId} className="console-search-section-title">{label}</div>
        {items.map((item, itemIndex) => {
          const globalIdx = startIndex + itemIndex;
          return (
            <Link
              key={`${item.type}-${item.id}`}
              id={getResultId(item)}
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

  let sectionOffset = 0;

  return (
    <div className="console-search-shell" ref={containerRef} role="search" aria-label={t('search.label')}>
      <label className="console-search">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.6-5.15a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z" />
        </svg>
        <input
          type="search"
          placeholder={t('search.placeholder')}
          aria-label={t('search.label')}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 && allResults[activeIndex] ? getResultId(allResults[activeIndex]) : undefined}
          aria-describedby={hasError ? `${listboxId}-status` : undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={120}
          enterKeyHint="search"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2 && (results || isLoading || hasError)) {
              setIsOpen(true);
            }
          }}
        />
      </label>
      {isOpen && (
        <div id={listboxId} className="console-search-results" role="listbox" aria-label={t('search.results')}>
          {isLoading ? (
            <div id={`${listboxId}-status`} className="console-search-status" role="status" aria-live="polite">
              {t('search.searching')}
            </div>
          ) : hasError ? (
            <div id={`${listboxId}-status`} className="console-search-status" role="status" aria-live="polite">
              {t('parser.unexpectedError')}
            </div>
          ) : results && allResults.length > 0 ? (
            sections.map((section) => {
              const sectionNode = renderSection(section.key, section.label, section.items, sectionOffset);
              sectionOffset += section.items.length;
              return (
                <div key={section.key}>
                  {sectionNode}
                </div>
              );
            })
          ) : (
            <div id={`${listboxId}-status`} className="console-search-empty" role="status" aria-live="polite">
              {t('common.noResults')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
