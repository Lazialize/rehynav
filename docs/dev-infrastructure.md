# rehynav - Development Infrastructure Design

## 1. Build System

### Comparison

| Tool | Base | Config Complexity | ESM+CJS Dual | DTS Generation | React JSX | Ecosystem |
|------|------|-------------------|---------------|----------------|-----------|-----------|
| **tsup** | esbuild | Minimal (~10 lines) | Built-in `--dts` + `--format esm,cjs` | Via `--dts` (uses rollup-plugin-dts internally) | Supported | Widely used in OSS libs |
| **unbuild** | rollup | Auto-inferred from package.json | Automatic | Built-in (mkdist or rollup) | Supported | Used by UnJS ecosystem |
| **Vite library mode** | rollup + esbuild | Moderate (vite.config.ts) | Needs manual config | Requires vite-plugin-dts | Supported | Primarily for apps |
| **rollup + plugins** | rollup | High (many plugins needed) | Manual setup | @rollup/plugin-typescript or separate tsc | Supported | Full control, high maintenance |

### Recommendation: **tsup**

**Reasons:**

1. **Minimal configuration** - A single `tsup.config.ts` file handles everything. For a small-to-mid OSS library, this is the sweet spot between control and simplicity.
2. **Fast builds** - esbuild-based compilation is significantly faster than rollup for development iteration.
3. **Built-in dual format** - `format: ['esm', 'cjs']` generates both outputs without extra config.
4. **DTS generation** - tsup's `dts: true` handles declaration generation via rollup-plugin-dts internally. The previous `tsconfig.build.json` has been removed to avoid dual configuration. `tsconfig.json` retains `isolatedDeclarations: true` for editor-level type checking.
5. **Tree-shaking** - esbuild performs tree-shaking natively; consumers using modern bundlers (Vite, webpack 5, Rollup) will further tree-shake the ESM output.
6. **React JSX** - esbuild handles `react-jsx` transform natively.

**Why not others:**
- **unbuild**: Auto-inference is convenient but less transparent; debugging build issues is harder.
- **Vite library mode**: Designed for applications, not libraries. Requires extra plugins and config for DTS.
- **rollup + plugins**: Too much boilerplate for a project of this scope. High maintenance cost.

### Configuration

```ts
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false, // Let consumers' bundlers handle minification
  treeshake: true,
  splitting: false, // Single entry point, no code splitting needed
  target: 'es2022',
  outDir: 'dist',
  external: ['react', 'react-dom'],
});
```

### package.json fields

```jsonc
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**Key points:**
- `"type": "module"` makes the package ESM-first.
- `exports` map with `types` condition listed first (TypeScript resolution requirement).
- `sideEffects: false` enables aggressive tree-shaking by bundlers.
- `files` array ensures only dist, README, and LICENSE are published.

### Scripts

```jsonc
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc -p tsconfig.json",
    "prepublishOnly": "pnpm run build"
  }
}
```

---

## 2. Test Strategy

### Framework Comparison

| Tool | Speed | React Support | Config | ESM Native | Watch Mode |
|------|-------|---------------|--------|------------|------------|
| **Vitest** | Very fast (Vite-based) | @testing-library/react | Minimal | Yes | Excellent |
| **Jest** | Moderate | @testing-library/react | Moderate (transforms needed) | Requires workarounds | Good |

### Recommendation: **Vitest + @testing-library/react**

**Reasons:**

1. **Native ESM support** - No transform configuration needed. The project uses `"module": "ESNext"` and `verbatimModuleSyntax`, which Vitest handles natively.
2. **Vite-based** - Fast HMR-style watch mode, parallel test execution, and esbuild-powered transforms.
3. **Jest-compatible API** - Familiar `describe/it/expect` patterns. Migration from Jest is trivial if ever needed.
4. **Built-in coverage** - `@vitest/coverage-v8` provides V8-based coverage without extra setup.
5. **TypeScript-first** - No `ts-jest` or `babel-jest` needed.

### Configuration

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/**/index.ts', // Re-export barrels
      ],
      thresholds: {
        // Global minimums
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        // Module-specific thresholds (stricter for core logic)
        'src/core/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/store/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/hooks/**': { statements: 85, branches: 85, functions: 85, lines: 85 },
        'src/components/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/sync/**': { statements: 70, branches: 70, functions: 70, lines: 70 }, // supplemented by E2E
      },
    },
  },
});
```

```ts
// test/setup.ts
import '@testing-library/jest-dom/vitest';
```

### Test Directory Structure

Tests are colocated with source files for discoverability:

```
src/
  components/
    TabNavigator.tsx
    TabNavigator.test.tsx
    StackNavigator.tsx
    StackNavigator.test.tsx
  hooks/
    useNavigation.ts
    useNavigation.test.ts
  core/
    NavigationState.ts
    NavigationState.test.ts
  index.ts
test/
  setup.ts           # Global test setup (jest-dom matchers)
  helpers/            # Shared test utilities
    renderWithNav.tsx # Custom render with navigation context
```

### Testing Categories

#### 1. Navigation State (Unit Tests)
Pure logic tests for the core navigation state machine:
```ts
// src/core/NavigationState.test.ts
describe('NavigationState', () => {
  it('pushes a route onto the active tab stack', () => { /* ... */ });
  it('pops respecting modal > stack > tab priority', () => { /* ... */ });
  it('preserves inactive tab stacks on tab switch', () => { /* ... */ });
});
```

#### 2. React Components (Integration Tests)
Test components with `@testing-library/react`:
```tsx
// src/components/TabNavigator.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('TabNavigator', () => {
  it('renders the active tab content', () => { /* ... */ });
  it('switches tabs and preserves stack state', async () => { /* ... */ });
});
```

#### 3. Hooks (Unit/Integration Tests)
Test hooks with `renderHook`:
```ts
import { renderHook, act } from '@testing-library/react';

describe('useNavigation', () => {
  it('provides push/pop/goBack methods', () => { /* ... */ });
});
```

### Coverage Targets

Global minimum is 80%, with module-specific thresholds:

| Module | Target | Rationale |
|--------|--------|-----------|
| `core/` | 95% | Pure logic, fully testable, most critical |
| `store/` | 90% | Thin wrapper around core, few branches |
| `hooks/` | 85% | React integration, some mocking needed |
| `components/` | 80% | UI integration tests |
| `sync/` | 70% + E2E | History API behavior supplemented by Playwright E2E tests |

### E2E Testing (History API Integration)

History API integration (popstate, pushState, back/forward navigation) cannot be reliably tested with jsdom. A minimal set of E2E tests using **Playwright** covers these critical scenarios.

**Scope:** E2E tests are limited to History API synchronization. All other behavior is covered by unit and integration tests.

#### Playwright Configuration

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'pnpm --filter e2e-fixture dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

#### Test Fixture

The E2E test fixture app (`e2e/fixtures/`) mirrors the Full App Example from Section 7.5 of `api-design.md` to ensure documentation and tests stay aligned.

#### E2E Test Examples

```typescript
// e2e/history-sync.spec.ts
import { test, expect } from '@playwright/test';

test('browser back button pops the stack', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="push-detail"]');
  await expect(page).toHaveURL('/home/detail?itemId=1');

  await page.goBack();
  await expect(page).toHaveURL('/home');
});

test('browser forward button restores the entry', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="push-detail"]');
  await page.goBack();
  await page.goForward();
  await expect(page).toHaveURL('/home/detail?itemId=1');
});

test('tab switch updates URL', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="tab-profile"]');
  await expect(page).toHaveURL('/profile');
});

test('overlay does not change URL', async ({ page }) => {
  await page.goto('/');
  const currentUrl = page.url();
  await page.click('[data-testid="open-modal"]');
  await expect(page).toHaveURL(currentUrl); // URL unchanged
});
```

### Scripts

```jsonc
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 3. Code Quality Tools

### Comparison

| Tool | Linting | Formatting | Speed | Config | Ecosystem |
|------|---------|------------|-------|--------|-----------|
| **Biome** | Yes | Yes | Very fast (Rust) | Single `biome.json` | Growing, good React/TS support |
| **ESLint + Prettier** | Yes | Yes (separate) | Moderate | `.eslintrc` + `.prettierrc` + plugins | Mature, huge ecosystem |

### Recommendation: **Biome**

**Reasons:**

1. **All-in-one** - Single tool for linting and formatting. No plugin compatibility issues between ESLint and Prettier.
2. **Performance** - Written in Rust, orders of magnitude faster than ESLint on large codebases. Even on a small project, the instant feedback matters for DX.
3. **Minimal configuration** - A single `biome.json` replaces `.eslintrc`, `.prettierrc`, and multiple plugin packages.
4. **Good TypeScript + React support** - Built-in rules for TypeScript and React without additional plugins.
5. **Lower maintenance** - No dependency on ESLint plugin ecosystem (which frequently breaks on major ESLint updates).

**Trade-off acknowledged:** Biome's rule set is smaller than ESLint's. For this project (a focused navigation library), the built-in rules are sufficient. If highly specialized ESLint rules are needed later, they can be added alongside Biome.

### Configuration

```jsonc
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "useExhaustiveDependencies": "error",
        "useHookAtTopLevel": "error"
      },
      "style": {
        "noNonNullAssertion": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "files": {
    "ignore": ["dist", "node_modules", "coverage", "*.d.ts"]
  }
}
```

### Pre-commit Hooks

#### Comparison

| Tool | Language | Config | Integration |
|------|----------|--------|-------------|
| **lefthook** | Go (single binary) | `lefthook.yml` | Fast, no node_modules dependency |
| **husky + lint-staged** | Node | `.husky/` + `lint-staged.config.js` | Industry standard, more setup |

#### Recommendation: **lefthook**

**Reasons:**
- Single binary, no Node.js runtime overhead for hooks.
- Simple YAML configuration.
- Parallel command execution built-in.
- No `postinstall` script needed (unlike husky).

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,tsx,js,jsx}"
      run: pnpm biome check --write --staged {staged_files}
      stage_fixed: true
    # typecheck removed from pre-commit — runs in CI only
    # Reason: tsc is slow and discourages frequent commits.
    # Biome catches most issues; full type checking happens in CI.
```

### Scripts

```jsonc
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write ."
  }
}
```

---

## 4. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    name: Lint, Type Check & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Biome check
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Test
        run: pnpm test:coverage

      - name: Build
        run: pnpm build

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: E2E tests
        run: pnpm test:e2e

      - name: Upload coverage
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: codecov/codecov-action@v4
        with:
          files: coverage/lcov.info
```

### Publish Pipeline

#### Versioning: **Changesets**

**Why Changesets over semantic-release:**
- More explicit and intentional: developers write changelogs as part of PR workflow.
- Supports manual review of version bumps before release.
- Works well with pnpm.
- Better suited for a library where version bumps should be deliberate.

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          version: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Changeset Configuration

```jsonc
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/changelog-github",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### Versioning Strategy

- **Pre-1.0**: Use `0.x.y` versions. Breaking changes bump minor (`0.2.0`), features/fixes bump patch (`0.1.1`).
- **Post-1.0**: Follow strict semver.
- Changesets enforce explicit version decisions per PR.

---

## 5. Development Workflow

### Branch Strategy: **Trunk-based Development**

**Reasons:**
- Simple: `main` is always the source of truth.
- Small team / solo project: git-flow overhead is unnecessary.
- Short-lived feature branches merged via PR.
- Suits a library where releases are cut from `main` via Changesets.

**Convention:**
```
main                    ← always releasable
  ├─ feat/tab-navigator ← feature branch (short-lived)
  ├─ fix/back-behavior  ← bug fix branch
  └─ chore/ci-setup     ← infrastructure changes
```

Branch naming: `{type}/{short-description}` where type is `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.

### PR Template

```markdown
<!-- .github/pull_request_template.md -->
## Summary

<!-- Brief description of what this PR does -->

## Changes

<!-- Bulleted list of specific changes -->

## Testing

<!-- How were these changes tested? -->

## Checklist

- [ ] Tests added/updated
- [ ] Types pass (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Changeset added (if user-facing change): `pnpm changeset`
```

### Documentation

- **README.md**: User-facing documentation (API, examples, getting started).
- **docs/**: Design documents and architecture decisions (like this file).
- **TSDoc comments**: Inline API documentation on public exports. Can be extracted later with tools like TypeDoc or API Extractor if needed.
- No separate doc site initially. Add when the API stabilizes post-1.0.

---

## Summary: Complete Tool Stack

| Concern | Tool | Key Benefit |
|---------|------|-------------|
| Build | tsup | Minimal config, fast esbuild builds, unified DTS |
| Unit/Integration Test | Vitest + Testing Library | Native ESM, fast, great React support |
| E2E Test | Playwright | Real browser testing for History API |
| Lint + Format | Biome | All-in-one, fast, low maintenance |
| Pre-commit | lefthook (lint only) | Fast Go binary, no typecheck (CI only) |
| CI | GitHub Actions | Native GitHub integration |
| Release | Changesets | Explicit, intentional versioning |
| Branch | Trunk-based | Simple, suited for small OSS projects |

### Dependencies to Install

```bash
# Build
pnpm add -D tsup

# Unit/Integration Test
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8

# E2E Test
pnpm add -D @playwright/test

# Lint & Format
pnpm add -D @biomejs/biome

# Pre-commit hooks
pnpm add -D lefthook

# Release
pnpm add -D @changesets/cli @changesets/changelog-github
```
