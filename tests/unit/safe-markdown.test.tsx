import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SafeMarkdown } from '../../components/ui/safe-markdown';

describe('SafeMarkdown', () => {
  it('renders markdown formatting while escaping raw HTML', () => {
    const html = renderToStaticMarkup(
      <SafeMarkdown content={'Hello <script>alert(1)</script> **world**'} />,
    );

    expect(html).toContain('<strong>world</strong>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('drops unsafe link protocols', () => {
    const html = renderToStaticMarkup(
      <SafeMarkdown content={'[click me](javascript:alert(1))'} />,
    );

    expect(html).toContain('click me');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('javascript:alert(1)');
  });

  it('preserves safe external links', () => {
    const html = renderToStaticMarkup(
      <SafeMarkdown content={'[docs](https://example.com/docs)'} />,
    );

    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
  });
});
