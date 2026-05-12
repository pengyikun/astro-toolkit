import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `node:sqlite` is built into Node ≥22.5 (stable in 24+); no native addon
  // to externalize. Keep `knex` external so its dialect tree (which uses
  // dynamic `require`) isn't traced/bundled by Next's webpack pipeline.
  serverExternalPackages: ['knex'],

  async redirects() {
    return [
      {
        source: '/data',
        destination: '/settings',
        permanent: true,
      },
      {
        source: '/json-parser',
        destination: '/parser?format=json',
        permanent: true,
      },
      {
        source: '/xml-parser',
        destination: '/parser?format=xml',
        permanent: true,
      },
      {
        source: '/penny-log',
        destination: '/transactions',
        permanent: true,
      },
      {
        source: '/penny-log/:path*',
        destination: '/transactions/:path*',
        permanent: true,
      },
      {
        source: '/iban',
        destination: '/validate?mode=iban',
        permanent: true,
      },
      {
        source: '/bic',
        destination: '/validate?mode=bic',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
