import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import { createInitialState } from '../core/state.js';
import type { ScreenRegistryForHooks } from '../hooks/context.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  ScreenRegistryContext,
} from '../hooks/context.js';
import { createNavigationStore } from '../store/navigation-store.js';
import { createScreenRegistry } from '../store/screen-registry.js';
import { Screen } from './Screen.js';

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

describe('Screen', () => {
  it('registers component on mount', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();
    const TestComponent = () => <div>Test</div>;

    render(
      <Wrapper>
        <Screen name="home/detail" component={TestComponent} />
      </Wrapper>,
    );

    const registration = screenRegistry.get('home/detail');
    expect(registration).toBeDefined();
    expect(registration?.route).toBe('home/detail');
    expect(registration?.component).toBe(TestComponent);
  });

  it('unregisters component on unmount', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();
    const TestComponent = () => <div>Test</div>;

    const { unmount } = render(
      <Wrapper>
        <Screen name="home/detail" component={TestComponent} />
      </Wrapper>,
    );

    expect(screenRegistry.get('home/detail')).toBeDefined();

    unmount();

    expect(screenRegistry.get('home/detail')).toBeUndefined();
  });

  it('registers with options', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();
    const TestComponent = () => <div>Test</div>;

    render(
      <Wrapper>
        <Screen name="home" component={TestComponent} options={{ title: 'Home' }} />
      </Wrapper>,
    );

    const registration = screenRegistry.get('home');
    expect(registration?.options).toEqual({ title: 'Home' });
  });

  it('renders nothing (returns null)', () => {
    const { Wrapper } = createTestWrapper();
    const TestComponent = () => <div>Test</div>;

    const { container } = render(
      <Wrapper>
        <Screen name="home" component={TestComponent} />
      </Wrapper>,
    );

    expect(container.innerHTML).toBe('');
  });

  it('throws when used outside provider', () => {
    const TestComponent = () => <div>Test</div>;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<Screen name="home" component={TestComponent} />);
    }).toThrow('Screen must be used within NavigationProvider');

    consoleSpy.mockRestore();
  });
});
