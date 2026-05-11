// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent, screen } from '@testing-library/react';
import SnippetFilters from '../../components/parsers/SnippetFilters';
import { LocaleProvider } from '../../lib/i18n/client';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const dict = {
  'common.search': 'Search',
  'common.apply': 'Apply',
  'parser.searchSnippets': 'Search snippets...',
  'accounts.resetFilters': 'Reset',
};

function renderFilters(initialSearch = '') {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <SnippetFilters basePath="/parsers/json/snippets" initialSearch={initialSearch} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
});

afterEach(() => cleanup());

describe('SnippetFilters', () => {
  it('renders with initial search text', () => {
    renderFilters('hello');
    const input = screen.getByPlaceholderText('Search snippets...') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });

  it('navigates with search query when Apply is clicked', () => {
    renderFilters();
    const input = screen.getByPlaceholderText('Search snippets...');
    fireEvent.change(input, { target: { value: 'foo' } });
    act(() => {
      screen.getByText('Apply').click();
    });
    expect(push).toHaveBeenCalledWith('/parsers/json/snippets?search=foo');
  });

  it('navigates without query string when search is empty', () => {
    renderFilters();
    act(() => {
      screen.getByText('Apply').click();
    });
    expect(push).toHaveBeenCalledWith('/parsers/json/snippets');
  });

  it('Enter in the search input applies the filter', () => {
    renderFilters();
    const input = screen.getByPlaceholderText('Search snippets...');
    fireEvent.change(input, { target: { value: 'bar' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/parsers/json/snippets?search=bar');
  });

  it('reset clears the search and navigates to the base path', () => {
    renderFilters('something');
    const resetBtn = screen.getByText('Reset');
    act(() => {
      resetBtn.click();
    });
    const input = screen.getByPlaceholderText('Search snippets...') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(push).toHaveBeenCalledWith('/parsers/json/snippets');
  });
});
