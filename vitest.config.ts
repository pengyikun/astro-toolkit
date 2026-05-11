import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      VAULT_ENCRYPTION_KEY: 'a'.repeat(64),
      AUTH_SECRET: 'test-auth-secret-0123456789abcdef',
      // Tests use 127.0.0.1 / localhost LLM endpoints; the SSRF guard rejects
      // those by default. Opt back in for the test environment only.
      ALLOW_PRIVATE_LLM_URLS: 'true',
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**/*.ts', 'models/**/*.ts', 'schemas/**/*.ts', 'actions/**/*.ts'],
      exclude: ['types/**'],
    },
    testTimeout: 10000,
  },
});
