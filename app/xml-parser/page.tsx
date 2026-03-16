import type { Metadata } from 'next';
import Script from 'next/script';
import XmlParser from '@/components/parsers/XmlParser';

export const metadata: Metadata = { title: 'XML Parser' };

export default function XmlParserPage() {
  return (
    <>
      <Script src="/js/json-visualizer.js" strategy="lazyOnload" />
      <Script src="/js/xml-visualizer.js" strategy="lazyOnload" />

      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>Validation</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>XML parser</span>
        </div>
        <div>
          <h1 className="console-title">XML parser</h1>
        </div>
      </section>

      <XmlParser />
    </>
  );
}
