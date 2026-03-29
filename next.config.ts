import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'knex'],
  transpilePackages: ['react-markdown'],
};

export default nextConfig;
