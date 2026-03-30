import { Fragment, type ReactNode } from 'react';
import { marked, type Token, type Tokens } from 'marked';
import { cn } from '@/lib/utils';

interface SafeMarkdownProps {
  className?: string;
  content: string;
}

function childTokens(token: { tokens?: Token[] }): Token[] {
  return token.tokens ?? [];
}

function getSafeHref(href: string): string | null {
  if (!href) return null;

  if (href.startsWith('#')) return href;
  if (href.startsWith('/') && !href.startsWith('//')) return href;

  try {
    const url = new URL(href);
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
      return href;
    }
  } catch {
    return null;
  }

  return null;
}

function renderInlineTokens(tokens: Token[], keyPrefix: string): ReactNode[] {
  return tokens.map((token, index) => renderInlineToken(token, `${keyPrefix}-${index}`));
}

function renderInlineToken(token: Token, key: string): ReactNode {
  switch (token.type) {
    case 'text':
    case 'escape':
      return <Fragment key={key}>{token.text}</Fragment>;
    case 'strong': {
      const strongToken = token as Tokens.Strong;
      return <strong key={key}>{renderInlineTokens(childTokens(strongToken), `${key}-strong`)}</strong>;
    }
    case 'em': {
      const emToken = token as Tokens.Em;
      return <em key={key}>{renderInlineTokens(childTokens(emToken), `${key}-em`)}</em>;
    }
    case 'del': {
      const delToken = token as Tokens.Del;
      return <del key={key}>{renderInlineTokens(childTokens(delToken), `${key}-del`)}</del>;
    }
    case 'codespan':
      return <code key={key}>{token.text}</code>;
    case 'br':
      return <br key={key} />;
    case 'checkbox':
      return <Fragment key={key}>{token.checked ? '☑ ' : '☐ '}</Fragment>;
    case 'link': {
      const linkToken = token as Tokens.Link;
      const href = getSafeHref(linkToken.href);
      const content = renderInlineTokens(childTokens(linkToken), `${key}-link`);
      if (!href) {
        return <Fragment key={key}>{content}</Fragment>;
      }
      const isExternal = !href.startsWith('/') && !href.startsWith('#');
      return (
        <a
          key={key}
          href={href}
          rel={isExternal ? 'noreferrer noopener' : undefined}
          target={isExternal ? '_blank' : undefined}
        >
          {content}
        </a>
      );
    }
    case 'image': {
      const imageToken = token as Tokens.Image;
      const href = getSafeHref(imageToken.href);
      const label = imageToken.text || imageToken.href;
      if (!href) {
        return <Fragment key={key}>{label}</Fragment>;
      }
      return (
        <a key={key} href={href} rel="noreferrer noopener" target="_blank">
          {label}
        </a>
      );
    }
    case 'html':
      return <Fragment key={key}>{token.raw}</Fragment>;
    default:
      if ('tokens' in token && Array.isArray(token.tokens)) {
        return <Fragment key={key}>{renderInlineTokens(token.tokens, `${key}-nested`)}</Fragment>;
      }
      if ('text' in token && typeof token.text === 'string') {
        return <Fragment key={key}>{token.text}</Fragment>;
      }
      return <Fragment key={key}>{token.raw}</Fragment>;
  }
}

function renderListItemContent(token: Tokens.ListItem, keyPrefix: string): ReactNode[] {
  return token.tokens.map((child, index) => renderBlockToken(child, `${keyPrefix}-${index}`));
}

function renderTable(token: Tokens.Table, key: string): ReactNode {
  return (
    <div key={key} className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            {token.header.map((cell, index) => (
              <th key={`${key}-head-${index}`}>{renderInlineTokens(cell.tokens, `${key}-head-${index}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {token.rows.map((row, rowIndex) => (
            <tr key={`${key}-row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${key}-row-${rowIndex}-cell-${cellIndex}`}>
                  {renderInlineTokens(cell.tokens, `${key}-row-${rowIndex}-cell-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBlockToken(token: Token, key: string): ReactNode {
  switch (token.type) {
    case 'space':
      return null;
    case 'paragraph': {
      const paragraphToken = token as Tokens.Paragraph;
      return <p key={key}>{renderInlineTokens(childTokens(paragraphToken), `${key}-p`)}</p>;
    }
    case 'heading': {
      const headingToken = token as Tokens.Heading;
      if (headingToken.depth === 1) {
        return <h1 key={key}>{renderInlineTokens(childTokens(headingToken), `${key}-h1`)}</h1>;
      }
      if (headingToken.depth === 2) {
        return <h2 key={key}>{renderInlineTokens(childTokens(headingToken), `${key}-h2`)}</h2>;
      }
      return <h3 key={key}>{renderInlineTokens(childTokens(headingToken), `${key}-h3`)}</h3>;
    }
    case 'blockquote': {
      const blockquoteToken = token as Tokens.Blockquote;
      return (
        <blockquote key={key}>
          {childTokens(blockquoteToken).map((child, index) => renderBlockToken(child, `${key}-${index}`))}
        </blockquote>
      );
    }
    case 'code': {
      const codeToken = token as Tokens.Code;
      return (
        <pre key={key}>
          <code>{codeToken.text}</code>
        </pre>
      );
    }
    case 'hr':
      return <hr key={key} />;
    case 'list': {
      const listToken = token as Tokens.List;
      if (listToken.ordered) {
        return (
          <ol key={key} start={typeof listToken.start === 'number' ? listToken.start : undefined}>
            {listToken.items.map((item: Tokens.ListItem, index: number) => (
              <li key={`${key}-item-${index}`}>{renderListItemContent(item, `${key}-item-${index}`)}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul key={key}>
          {listToken.items.map((item: Tokens.ListItem, index: number) => (
            <li key={`${key}-item-${index}`}>{renderListItemContent(item, `${key}-item-${index}`)}</li>
          ))}
        </ul>
      );
    }
    case 'table':
      return renderTable(token as Tokens.Table, key);
    case 'html':
      return <p key={key}>{token.raw}</p>;
    default:
      return <p key={key}>{renderInlineToken(token, `${key}-inline`)}</p>;
  }
}

export function SafeMarkdown({ className, content }: SafeMarkdownProps) {
  const tokens = marked.lexer(content, { breaks: true, gfm: true });

  return (
    <div className={cn('viz-note-md', className)}>
      {tokens.map((token, index) => renderBlockToken(token, `markdown-${index}`))}
    </div>
  );
}
