// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, screen } from '@testing-library/react';
import SavedSnippetsTable from '../../components/parsers/SavedSnippetsTable';
import { LocaleProvider } from '../../lib/i18n/client';
import type { SavedSnippet } from '../../types';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const dict: Record<string, string> = {
  'parser.snippetTitle': 'Title',
  'parser.snippetNotes': 'Notes',
  'parser.noSavedSnippets': 'No snippets',
  'parser.noSavedSnippetsFiltered': 'No snippets match',
  'parser.deleteSnippet': 'Delete',
  'common.created': 'Created',
  'common.actions': 'Actions',
  'common.view': 'View',
};

function snippet(over: Partial<SavedSnippet> = {}): SavedSnippet {
  return {
    id: 1,
    title: 'My JSON',
    snippet_type: 'json',
    content: '{}',
    parse_result: '',
    notes: 'a note',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...over,
  } as SavedSnippet;
}

function renderTable(props: Partial<React.ComponentProps<typeof SavedSnippetsTable>> = {}) {
  const onDelete = vi.fn();
  const result = render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <SavedSnippetsTable
        snippets={[snippet()]}
        hasFilters={false}
        onDelete={onDelete}
        {...props}
      />
    </LocaleProvider>,
  );
  return { ...result, onDelete };
}

beforeEach(() => {});
afterEach(() => cleanup());

describe('SavedSnippetsTable', () => {
  it('shows empty state when no snippets and no filters', () => {
    renderTable({ snippets: [] });
    expect(screen.getByText('No snippets')).toBeTruthy();
  });

  it('shows filtered empty state when no snippets but filters active', () => {
    renderTable({ snippets: [], hasFilters: true });
    expect(screen.getByText('No snippets match')).toBeTruthy();
  });

  it('renders snippet rows with view/delete actions', () => {
    renderTable();
    expect(screen.getByText('My JSON')).toBeTruthy();
    expect(screen.getByText('a note')).toBeTruthy();
    expect(screen.getByText('View')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('shows em-dash placeholder when notes are empty', () => {
    renderTable({ snippets: [snippet({ notes: '' })] });
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('uses /json-parser/saved/{id} link for json snippet', () => {
    renderTable();
    const link = screen.getAllByRole('link').find((el) => el.getAttribute('href') === '/json-parser/saved/1');
    expect(link).toBeTruthy();
  });

  it('uses /xml-parser/saved/{id} link for xml snippet', () => {
    renderTable({ snippets: [snippet({ id: 7, snippet_type: 'xml' })] });
    const link = screen.getAllByRole('link').find((el) => el.getAttribute('href') === '/xml-parser/saved/7');
    expect(link).toBeTruthy();
  });

  it('invokes onDelete when Delete is clicked', () => {
    const { onDelete } = renderTable();
    act(() => {
      screen.getByText('Delete').click();
    });
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
