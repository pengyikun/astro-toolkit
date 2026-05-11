// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import Pagination from '../../components/ui/Pagination';

describe('Pagination', () => {
  it('renders nothing when only one page', async () => {
    const node = await Pagination({ page: 1, totalPages: 1, total: 5, basePath: '/x' });
    expect(node).toBeNull();
  });

  it('renders nav with current page marked', async () => {
    const node = await Pagination({ page: 2, totalPages: 5, total: 50, basePath: '/x' });
    const html = renderToStaticMarkup(node as React.ReactElement);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('?page=1');
    expect(html).toContain('?page=3');
    expect(html).toContain('?page=5');
  });

  it('omits Previous button on first page', async () => {
    const node = await Pagination({ page: 1, totalPages: 4, total: 40, basePath: '/x' });
    const html = renderToStaticMarkup(node as React.ReactElement);
    expect(html).not.toMatch(/page=0/);
    expect(html).toContain('?page=2');
  });

  it('omits Next button on last page', async () => {
    const node = await Pagination({ page: 4, totalPages: 4, total: 40, basePath: '/x' });
    const html = renderToStaticMarkup(node as React.ReactElement);
    // Next page would be 5; should not appear.
    expect(html).not.toMatch(/page=5/);
  });

  it('renders ellipsis when there is a gap', async () => {
    const node = await Pagination({ page: 5, totalPages: 20, total: 200, basePath: '/x' });
    const html = renderToStaticMarkup(node as React.ReactElement);
    expect(html).toContain('...');
  });

  it('preserves filter params in URLs', async () => {
    const node = await Pagination({
      page: 1,
      totalPages: 3,
      total: 30,
      basePath: '/x',
      filters: { status: 'active', q: 'foo' },
    });
    const html = renderToStaticMarkup(node as React.ReactElement);
    expect(html).toMatch(/status=active/);
    expect(html).toMatch(/q=foo/);
  });
});
