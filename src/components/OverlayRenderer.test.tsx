import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
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
import { OverlayRenderer } from './OverlayRenderer.js';

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

describe('OverlayRenderer', () => {
  it('renders nothing when no overlays', () => {
    const { Wrapper } = createTestWrapper();

    const { container } = render(
      <Wrapper>
        <OverlayRenderer />
      </Wrapper>,
    );

    expect(container.querySelectorAll('[data-route-type="overlay"]')).toHaveLength(0);
  });

  it('renders overlay with correct attributes', () => {
    const { Wrapper, store, screenRegistry } = createTestWrapper();

    const OverlayComponent = () => <div>Overlay Content</div>;
    screenRegistry.register({ route: 'settings', component: OverlayComponent });

    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'settings',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
    });

    const { container } = render(
      <Wrapper>
        <OverlayRenderer />
      </Wrapper>,
    );

    const overlay = container.querySelector('[data-route-type="overlay"]');
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass('rehynav-overlay');
    expect(screen.getByText('Overlay Content')).toBeInTheDocument();
  });

  it('renders multiple overlays', () => {
    const { Wrapper, store, screenRegistry } = createTestWrapper();

    const OverlayA = () => <div>Overlay A</div>;
    const OverlayB = () => <div>Overlay B</div>;
    screenRegistry.register({ route: 'overlay-a', component: OverlayA });
    screenRegistry.register({ route: 'overlay-b', component: OverlayB });

    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'overlay-a',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'overlay-b',
        params: {},
        id: 'overlay-2',
        timestamp: 2001,
      });
    });

    const { container } = render(
      <Wrapper>
        <OverlayRenderer />
      </Wrapper>,
    );

    const overlays = container.querySelectorAll('[data-route-type="overlay"]');
    expect(overlays).toHaveLength(2);
    expect(screen.getByText('Overlay A')).toBeInTheDocument();
    expect(screen.getByText('Overlay B')).toBeInTheDocument();
  });

  it('renders UnregisteredScreenError for unregistered overlay routes', () => {
    const { Wrapper, store } = createTestWrapper();

    act(() => {
      store.dispatch({
        type: 'OPEN_OVERLAY',
        route: 'unknown-overlay',
        params: {},
        id: 'overlay-1',
        timestamp: 2000,
      });
    });

    render(
      <Wrapper>
        <OverlayRenderer />
      </Wrapper>,
    );

    expect(screen.getByText(/No Screen registered for route/)).toBeInTheDocument();
  });
});
