import type { Metadata } from 'next';
import Script from 'next/script';
import JsonParser from '@/components/parsers/JsonParser';

export const metadata: Metadata = { title: 'JSON Parser' };

export default function JsonParserPage() {
  return (
    <>
      <Script src="/js/json-visualizer.js" strategy="lazyOnload" />

      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>Validation</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>JSON parser</span>
        </div>
        <div>
          <h1 className="console-title">JSON parser</h1>
        </div>
      </section>

      <JsonParser />
    </>
  );
}
