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
    env: { NODE_ENV: 'test', VAULT_ENCRYPTION_KEY: 'a'.repeat(64) },
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**/*.ts', 'models/**/*.ts', 'schemas/**/*.ts', 'actions/**/*.ts'],
      exclude: ['types/**'],
    },
    testTimeout: 10000,
  },
});
