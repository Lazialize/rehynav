import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ScreenRegistryForHooks } from '../hooks/context.js';
import { UnregisteredScreenError } from './UnregisteredScreenError.js';

function createMockRegistry(routes: string[]): ScreenRegistryForHooks {
  const screens = new Map<
    string,
    { route: string; component: React.ComponentType<unknown>; options?: unknown }
  >();
  for (const route of routes) {
    screens.set(route, { route, component: () => null });
  }
  return {
    screens,
    get(route: string) {
      return screens.get(route);
    },
  };
}

describe('UnregisteredScreenError', () => {
  it('renders error with route name in development', () => {
    const registry = createMockRegistry(['home', 'search', 'profile']);
    render(<UnregisteredScreenError route="hme" registry={registry} />);

    expect(screen.getByText(/No Screen registered for route/)).toBeInTheDocument();
    expect(screen.getByText('hme')).toBeInTheDocument();
  });

  it('shows closest match suggestion', () => {
    const registry = createMockRegistry(['home', 'search', 'profile']);
    render(<UnregisteredScreenError route="hme" registry={registry} />);

    const suggestion = screen.getByText(/Did you mean/);
    expect(suggestion).toBeInTheDocument();
    expect(suggestion.querySelector('strong')?.textContent).toBe('home');
  });

  it('lists all registered screens', () => {
    const registry = createMockRegistry(['home', 'search', 'profile']);
    render(<UnregisteredScreenError route="unknown" registry={registry} />);

    expect(screen.getByText(/Registered screens \(3\)/)).toBeInTheDocument();
  });

  it('does not show suggestion when no close match exists', () => {
    const registry = createMockRegistry(['home', 'search']);
    render(<UnregisteredScreenError route="xxxxxxxxxxxxxxxxx" registry={registry} />);

    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
  });

  it('returns null and logs error in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const registry = createMockRegistry(['home']);
    const { container } = render(<UnregisteredScreenError route="missing" registry={registry} />);

    expect(container.innerHTML).toBe('');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No Screen registered for route "missing"'),
    );

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
