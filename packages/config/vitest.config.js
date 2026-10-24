import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Isolation tests share one local Postgres; running them in parallel makes
    // failures non-deterministic and the results untrustworthy.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.{test,spec}.ts', 'src/generated/**'],
    },
  },
});
