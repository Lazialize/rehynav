# Contributing to ReHynav

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+

### Setup

```bash
git clone https://github.com/Lazialize/rehynav.git
cd rehynav
pnpm install
```

### Development Commands

```bash
pnpm build          # Build library (ESM + CJS)
pnpm dev            # Build in watch mode
pnpm test           # Run tests once
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage report
pnpm typecheck      # Type-check only (no emit)
pnpm lint           # Lint + format check (Biome)
pnpm lint:fix       # Lint + format with auto-fix
```

## How to Contribute

### Reporting Bugs

Use the [Bug Report](https://github.com/Lazialize/rehynav/issues/new?template=bug_report.yml) issue template. Include reproduction steps and your environment details.

### Requesting Features

Use the [Feature Request](https://github.com/Lazialize/rehynav/issues/new?template=feature_request.yml) issue template. Describe the problem you're solving and your proposed solution.

### Submitting Pull Requests

1. Fork the repository and create your branch from `main`.
2. Make your changes.
3. Add or update tests as needed.
4. Ensure all checks pass:
   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   ```
5. Open a pull request.

## Branch Naming

Use the following prefixes:

| Prefix | Purpose |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `test/` | Adding or updating tests |
| `ci/` | CI/CD changes |

Example: `feat/add-swipe-back-navigation`

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>: <description>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore`

Examples:
- `feat: add swipe-back gesture support`
- `fix: prevent duplicate push on rapid taps`
- `docs: update router configuration examples`

## Code Style

- **Biome** handles linting and formatting — no ESLint or Prettier.
- Run `pnpm lint:fix` to auto-fix issues before committing.
- Tests are colocated with source files (`*.test.ts` / `*.test.tsx` in `src/`).

## Project Structure

```
src/
├── core/          # State types, reducer, pure logic
├── store/         # Navigation store, screen registry
├── hooks/         # React hooks (useNavigation, useTab, etc.)
├── components/    # React components (TabNavigator, ScreenRenderer, etc.)
├── sync/          # Browser history synchronization
├── create-router.ts
└── route-helpers.ts
examples/
└── sns-app/       # Example application
```

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
