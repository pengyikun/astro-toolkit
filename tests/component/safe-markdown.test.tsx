// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SafeMarkdown } from '../../components/ui/safe-markdown';

afterEach(() => cleanup());

describe('SafeMarkdown', () => {
  it('renders headings, paragraphs and emphasis', () => {
    const { container } = render(
      <SafeMarkdown content={'# Title\n\nHello **world**\n'} />,
    );
    expect(container.querySelector('h1')?.textContent).toBe('Title');
    expect(container.querySelector('p')?.textContent).toContain('Hello');
    expect(container.querySelector('strong')?.textContent).toBe('world');
  });

  it('renders ordered and unordered lists', () => {
    const { container } = render(
      <SafeMarkdown content={'- one\n- two\n\n1. a\n2. b\n'} />,
    );
    expect(container.querySelectorAll('ul li').length).toBe(2);
    expect(container.querySelectorAll('ol li').length).toBe(2);
  });

  it('renders code blocks and inline code', () => {
    const { container } = render(
      <SafeMarkdown content={'`inline` text\n\n```\nblock\n```\n'} />,
    );
    expect(container.querySelector('code')?.textContent).toBe('inline');
    expect(container.querySelector('pre code')?.textContent?.trim()).toBe('block');
  });

  it('renders safe http and mailto links with target=_blank for external', () => {
    const { container } = render(
      <SafeMarkdown content={'[a](https://example.com) [b](mailto:x@y.z)'} />,
    );
    const anchors = container.querySelectorAll('a');
    expect(anchors.length).toBe(2);
    const a = anchors[0] as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('https://example.com');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
  });

  it('strips unsafe link protocols (javascript:) and renders text only', () => {
    const { container } = render(
      <SafeMarkdown content={'[click](javascript:alert(1))'} />,
    );
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('click');
  });

  it('renders relative link without target=_blank', () => {
    const { container } = render(
      <SafeMarkdown content={'[home](/x)'} />,
    );
    const anchor = container.querySelector('a') as HTMLAnchorElement;
    expect(anchor?.getAttribute('href')).toBe('/x');
    expect(anchor?.getAttribute('target')).toBeNull();
  });

  it('renders blockquote', () => {
    const { container } = render(<SafeMarkdown content={'> quote'} />);
    expect(container.querySelector('blockquote')?.textContent).toContain('quote');
  });

  it('renders tables', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |\n';
    const { container } = render(<SafeMarkdown content={md} />);
    expect(container.querySelector('table thead th')?.textContent).toBe('a');
    expect(container.querySelectorAll('table tbody td').length).toBe(2);
  });

  it('renders horizontal rule', () => {
    const { container } = render(<SafeMarkdown content={'---'} />);
    expect(container.querySelector('hr')).toBeTruthy();
  });

  it('renders images as anchor with safe href', () => {
    const { container } = render(
      <SafeMarkdown content={'![alt](https://example.com/img.png)'} />,
    );
    const a = container.querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://example.com/img.png');
    expect(a?.textContent).toBe('alt');
  });

  it('passes className through to the wrapper', () => {
    const { container } = render(
      <SafeMarkdown className="extra" content={'hi'} />,
    );
    const wrapper = container.firstElementChild as HTMLDivElement;
    expect(wrapper.className).toContain('viz-note-md');
    expect(wrapper.className).toContain('extra');
  });
});
