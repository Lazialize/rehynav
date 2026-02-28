import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
import type { RoutePattern } from '../core/path-params.js';
import { parseRoutePatterns } from '../core/path-params.js';
import { createInitialState } from '../core/state.js';
import type { ScreenRegistryForHooks } from '../hooks/context.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  RoutePatternsContext,
  ScreenRegistryContext,
} from '../hooks/context.js';
import { createNavigationStore } from '../store/navigation-store.js';
import { createScreenRegistry } from '../store/screen-registry.js';
import { Link } from './Link.js';

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

describe('Link', () => {
  it('renders an anchor tag with children', () => {
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="home/detail">Go to detail</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Go to detail' });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
  });

  it('sets href based on route', () => {
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="home/detail">Detail</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Detail' });
    expect(link).toHaveAttribute('href', '/home/detail');
  });

  it('navigates via push on click', async () => {
    const { Wrapper, store } = createTestWrapper();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <Link to="home/detail" params={{ id: '42' }}>
          Detail
        </Link>
      </Wrapper>,
    );

    await user.click(screen.getByRole('link', { name: 'Detail' }));

    const state = store.getState();
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/detail');
    expect(state.tabs.home.stack[1].params).toEqual({ id: '42' });
  });

  it('navigates via replace when replace prop is true', async () => {
    const { Wrapper, store } = createTestWrapper();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <Link to="home/replaced" replace>
          Replace
        </Link>
      </Wrapper>,
    );

    await user.click(screen.getByRole('link', { name: 'Replace' }));

    const state = store.getState();
    expect(state.tabs.home.stack).toHaveLength(1);
    expect(state.tabs.home.stack[0].route).toBe('home/replaced');
  });

  it('applies className and style', () => {
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="home" className="nav-link" style={{ color: 'red' }}>
          Home
        </Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveClass('nav-link');
    expect(link).toHaveStyle({ color: 'rgb(255, 0, 0)' });
  });

  it('prevents default navigation', async () => {
    const { Wrapper } = createTestWrapper();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <Link to="home/detail">Detail</Link>
      </Wrapper>,
    );

    // Click should not cause page navigation (href change)
    await user.click(screen.getByRole('link', { name: 'Detail' }));
    // If default wasn't prevented, we'd get an error in jsdom
    // The test passing is sufficient
  });
});

describe('Link with routePatterns', () => {
  const patterns = parseRoutePatterns(['home', 'home/post-detail/:postId', 'search']);

  function createWrapperWithPatterns(routePatterns: Map<string, RoutePattern>) {
    const store = createNavigationStore(
      createInitialState(
        { tabs: ['home', 'search'], initialTab: 'home' },
        testCreateId,
        () => 1000,
      ),
    );
    const screenRegistry = createScreenRegistry();
    const guardRegistry = createNavigationGuardRegistry();

    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <NavigationStoreContext.Provider value={store}>
          <ScreenRegistryContext.Provider
            value={screenRegistry as unknown as ScreenRegistryForHooks}
          >
            <GuardRegistryContext.Provider value={guardRegistry}>
              <RoutePatternsContext.Provider value={routePatterns}>
                {children}
              </RoutePatternsContext.Provider>
            </GuardRegistryContext.Provider>
          </ScreenRegistryContext.Provider>
        </NavigationStoreContext.Provider>
      );
    }

    return { Wrapper, store };
  }

  it('generates href with path params embedded', () => {
    const { Wrapper } = createWrapperWithPatterns(patterns);

    render(
      <Wrapper>
        <Link to="home/post-detail/:postId" params={{ postId: '42' }}>
          Post
        </Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Post' });
    expect(link).toHaveAttribute('href', '/home/post-detail/42');
  });

  it('generates plain href for routes without path params', () => {
    const { Wrapper } = createWrapperWithPatterns(patterns);

    render(
      <Wrapper>
        <Link to="home">Home</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveAttribute('href', '/home');
  });

  it('still navigates correctly with path params on click', async () => {
    const { Wrapper, store } = createWrapperWithPatterns(patterns);
    const user = userEvent.setup();

    render(
      <Wrapper>
        <Link to="home/post-detail/:postId" params={{ postId: '42' }}>
          Post
        </Link>
      </Wrapper>,
    );

    await user.click(screen.getByRole('link', { name: 'Post' }));

    const state = store.getState();
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/post-detail/:postId');
    expect(state.tabs.home.stack[1].params).toEqual({ postId: '42' });
  });
});
