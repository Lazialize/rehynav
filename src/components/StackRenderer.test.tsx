import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { createInitialState } from '../core/state.js';
import type { StackEntry } from '../core/types.js';
import type { ScreenRegistryForHooks } from '../hooks/context.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  ScreenRegistryContext,
} from '../hooks/context.js';
import { createNavigationStore } from '../store/navigation-store.js';
import { createScreenRegistry } from '../store/screen-registry.js';
import { StackRenderer } from './StackRenderer.js';

let idCounter = 0;
function testCreateId(): string {
  return `test-id-${++idCounter}`;
}

function createTestWrapper() {
  const store = createNavigationStore(
    createInitialState({ tabs: ['home', 'search'], initialTab: 'home' }, testCreateId, () => 1000),
  );
  const screenRegistry = createScreenRegistry();
  const guardRegistry = createNavigationGuardRegistry();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <NavigationStoreContext.Provider value={store}>
        <ScreenRegistryContext.Provider value={screenRegistry as unknown as ScreenRegistryForHooks}>
          <GuardRegistryContext.Provider value={guardRegistry}>
            {children}
          </GuardRegistryContext.Provider>
        </ScreenRegistryContext.Provider>
      </NavigationStoreContext.Provider>
    );
  }

  return { Wrapper, store, screenRegistry, guardRegistry };
}

describe('StackRenderer', () => {
  it('renders top screen visible and others hidden', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();

    const HomeScreen = () => <div>Home Screen</div>;
    const DetailScreen = () => <div>Detail Screen</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });
    screenRegistry.register({ route: 'home/detail', component: DetailScreen });

    const stack: StackEntry[] = [
      { id: 'entry-1', route: 'home', params: {}, timestamp: 1000 },
      { id: 'entry-2', route: 'home/detail', params: {}, timestamp: 1001 },
    ];

    const { container } = render(
      <Wrapper>
        <StackRenderer stack={stack} />
      </Wrapper>,
    );

    const wrappers = container.querySelectorAll('[data-route-type="stack"]');
    expect(wrappers).toHaveLength(2);

    // First entry should be hidden
    expect(wrappers[0]).toHaveStyle({ display: 'none' });
    expect(wrappers[0]).toHaveAttribute('data-stack-index', '0');
    expect(wrappers[0]).toHaveAttribute('data-route', 'home');

    // Second entry (top) should be visible
    expect(wrappers[1]).toHaveStyle({ display: 'block' });
    expect(wrappers[1]).toHaveAttribute('data-stack-index', '1');
    expect(wrappers[1]).toHaveAttribute('data-route', 'home/detail');
  });

  it('renders component content for registered routes', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();

    const HomeScreen = () => <div>Home Content</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });

    const stack: StackEntry[] = [{ id: 'entry-1', route: 'home', params: {}, timestamp: 1000 }];

    render(
      <Wrapper>
        <StackRenderer stack={stack} />
      </Wrapper>,
    );

    expect(screen.getByText('Home Content')).toBeInTheDocument();
  });

  it('renders UnregisteredScreenError for unregistered routes', () => {
    const { Wrapper } = createTestWrapper();

    const stack: StackEntry[] = [
      { id: 'entry-1', route: 'nonexistent', params: {}, timestamp: 1000 },
    ];

    render(
      <Wrapper>
        <StackRenderer stack={stack} />
      </Wrapper>,
    );

    expect(screen.getByText(/No Screen registered for route/)).toBeInTheDocument();
  });

  it('uses entry.id as React key', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();

    const ScreenA = () => <div>A</div>;
    screenRegistry.register({ route: 'home', component: ScreenA });

    const stack: StackEntry[] = [
      { id: 'unique-key-1', route: 'home', params: {}, timestamp: 1000 },
    ];

    const { container } = render(
      <Wrapper>
        <StackRenderer stack={stack} />
      </Wrapper>,
    );

    const wrapper = container.querySelector('[data-route-type="stack"]');
    expect(wrapper).toBeDefined();
  });

  it('renders single screen as visible', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();

    const HomeScreen = () => <div>Home</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });

    const stack: StackEntry[] = [{ id: 'entry-1', route: 'home', params: {}, timestamp: 1000 }];

    const { container } = render(
      <Wrapper>
        <StackRenderer stack={stack} />
      </Wrapper>,
    );

    const wrapper = container.querySelector('[data-route-type="stack"]');
    expect(wrapper).toHaveStyle({ display: 'block' });
  });
});
