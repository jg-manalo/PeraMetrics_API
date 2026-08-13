import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    hookTimeout: 10000,
    coverage: {
      enabled: true,
    },
  },
});
