import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'knex'],

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
