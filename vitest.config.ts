import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/**/index.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        'src/core/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/store/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/hooks/**': { statements: 85, branches: 85, functions: 85, lines: 85 },
        'src/components/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/sync/**': { statements: 70, branches: 70, functions: 70, lines: 70 },
      },
    },
  },
});
