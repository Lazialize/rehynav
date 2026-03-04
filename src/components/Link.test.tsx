import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createNavigationGuardRegistry } from '../core/navigation-guard.js';
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

const defaultPatterns = parseRoutePatterns([
  'home',
  'home/detail',
  'home/detail/:id',
  'home/post-detail/:postId',
  'home/replaced',
  'search',
]);

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
            <RoutePatternsContext.Provider value={defaultPatterns}>
              {children}
            </RoutePatternsContext.Provider>
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
        <Link to="/home/detail">Go to detail</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Go to detail' });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
  });

  it('sets href based on resolved path', () => {
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="/home/detail">Detail</Link>
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
        <Link to="/home/detail/42">Detail</Link>
      </Wrapper>,
    );

    await user.click(screen.getByRole('link', { name: 'Detail' }));

    const state = store.getState();
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/detail/:id');
    expect(state.tabs.home.stack[1].params).toEqual({ id: '42' });
  });

  it('navigates via replace when replace prop is true', async () => {
    const { Wrapper, store } = createTestWrapper();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <Link to="/home/replaced" replace>
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
        <Link to="/home" className="nav-link" style={{ color: 'red' }}>
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
        <Link to="/home/detail">Detail</Link>
      </Wrapper>,
    );

    await user.click(screen.getByRole('link', { name: 'Detail' }));
  });
});

describe('Link with resolved paths', () => {
  it('sets href directly from to prop', () => {
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="/home/post-detail/42">Post</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Post' });
    expect(link).toHaveAttribute('href', '/home/post-detail/42');
  });

  it('sets href for routes without path params', () => {
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="/home">Home</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveAttribute('href', '/home');
  });

  it('navigates correctly with resolved path on click', async () => {
    const { Wrapper, store } = createTestWrapper();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <Link to="/home/post-detail/42">Post</Link>
      </Wrapper>,
    );

    await user.click(screen.getByRole('link', { name: 'Post' }));

    const state = store.getState();
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/post-detail/:postId');
    expect(state.tabs.home.stack[1].params).toEqual({ postId: '42' });
  });
});

describe('Link forwards native anchor props', () => {
  it('forwards native HTML attributes to the underlying <a> element', () => {
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <Link
          to="/home/detail"
          aria-label="Go to detail"
          target="_blank"
          rel="noopener"
          data-testid="my-link"
        >
          Detail
        </Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Go to detail' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
    expect(link).toHaveAttribute('data-testid', 'my-link');
  });

  it('forwards event handlers like onTouchStart', () => {
    const { Wrapper } = createTestWrapper();
    const handleTouchStart = vi.fn();

    render(
      <Wrapper>
        <Link to="/home/detail" onTouchStart={handleTouchStart}>
          Detail
        </Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Detail' });
    fireEvent.touchStart(link);
    expect(handleTouchStart).toHaveBeenCalledTimes(1);
  });

  it('calls user-provided onClick alongside internal navigation', async () => {
    const { Wrapper, store } = createTestWrapper();
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <Link to="/home/detail" onClick={handleClick}>
          Detail
        </Link>
      </Wrapper>,
    );

    await user.click(screen.getByRole('link', { name: 'Detail' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(store.getState().tabs.home.stack).toHaveLength(2);
  });
});

describe('Link does not intercept modified clicks', () => {
  it('does not preventDefault for Ctrl+Click', () => {
    const { Wrapper, store } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="/home/detail">Detail</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Detail' });
    const notPrevented = fireEvent.click(link, { ctrlKey: true });

    expect(notPrevented).toBe(true);
    expect(store.getState().tabs.home.stack).toHaveLength(1);
  });

  it('does not preventDefault for Meta+Click (Cmd)', () => {
    const { Wrapper, store } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="/home/detail">Detail</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Detail' });
    const notPrevented = fireEvent.click(link, { metaKey: true });

    expect(notPrevented).toBe(true);
    expect(store.getState().tabs.home.stack).toHaveLength(1);
  });

  it('does not preventDefault for Shift+Click', () => {
    const { Wrapper, store } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="/home/detail">Detail</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Detail' });
    const notPrevented = fireEvent.click(link, { shiftKey: true });

    expect(notPrevented).toBe(true);
    expect(store.getState().tabs.home.stack).toHaveLength(1);
  });

  it('does not preventDefault for middle-click (button=1)', () => {
    const { Wrapper, store } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="/home/detail">Detail</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Detail' });
    const notPrevented = fireEvent.click(link, { button: 1 });

    expect(notPrevented).toBe(true);
    expect(store.getState().tabs.home.stack).toHaveLength(1);
  });

  it('does not preventDefault for Alt+Click', () => {
    const { Wrapper, store } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="/home/detail">Detail</Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Detail' });
    const notPrevented = fireEvent.click(link, { altKey: true });

    expect(notPrevented).toBe(true);
    expect(store.getState().tabs.home.stack).toHaveLength(1);
  });

  it('does not navigate when user onClick calls preventDefault', () => {
    const { Wrapper, store } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="/home/detail" onClick={(e) => e.preventDefault()}>
          Detail
        </Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Detail' });
    fireEvent.click(link);

    expect(store.getState().tabs.home.stack).toHaveLength(1);
  });

  it('does not intercept click when target is set', () => {
    const { Wrapper, store } = createTestWrapper();

    render(
      <Wrapper>
        <Link to="/home/detail" target="_blank">
          Detail
        </Link>
      </Wrapper>,
    );

    const link = screen.getByRole('link', { name: 'Detail' });
    const notPrevented = fireEvent.click(link);

    expect(notPrevented).toBe(true);
    expect(store.getState().tabs.home.stack).toHaveLength(1);
  });
});
