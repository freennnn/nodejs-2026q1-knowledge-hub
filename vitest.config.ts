import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/unit/**/*.unit.spec.ts'],
    setupFiles: ['src/__tests__/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/**/*.service.ts',
        'src/**/*.guard.ts',
        'src/**/*.pipe.ts',
        'src/**/*.interceptor.ts',
        'src/**/*.filter.ts',
        'src/**/*.dto.ts',
      ],
      exclude: ['src/__tests__/unit/**'],
      thresholds: {
        lines: 90,
        branches: 85,
      },
    },
  },
});
