import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { TabNavigator } from './TabNavigator.js';

let idCounter = 0;
function testCreateId(): string {
  return `test-id-${++idCounter}`;
}

function createTestWrapper() {
  const store = createNavigationStore(
    createInitialState(
      { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
      testCreateId,
      () => 1000,
    ),
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

describe('TabNavigator', () => {
  it('renders active tab content', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();

    const HomeScreen = () => <div>Home Content</div>;
    const SearchScreen = () => <div>Search Content</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });
    screenRegistry.register({ route: 'search', component: SearchScreen });

    render(
      <Wrapper>
        <TabNavigator />
      </Wrapper>,
    );

    expect(screen.getByText('Home Content')).toBeInTheDocument();
  });

  it('renders default tab bar with tab names', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();

    const HomeScreen = () => <div>Home</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });

    render(
      <Wrapper>
        <TabNavigator />
      </Wrapper>,
    );

    expect(screen.getByRole('tab', { name: 'home' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'search' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'profile' })).toBeInTheDocument();
  });

  it('switches tab on tab press', async () => {
    const { Wrapper, screenRegistry } = createTestWrapper();
    const user = userEvent.setup();

    const HomeScreen = () => <div>Home Content</div>;
    const SearchScreen = () => <div>Search Content</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });
    screenRegistry.register({ route: 'search', component: SearchScreen });

    render(
      <Wrapper>
        <TabNavigator />
      </Wrapper>,
    );

    await user.click(screen.getByRole('tab', { name: 'search' }));

    const searchTab = screen.getByText('Search Content').closest('[data-rehynav-tab]');
    expect(searchTab).toHaveStyle({ display: 'block' });
  });

  it('preserves stack state when switching tabs', async () => {
    const { Wrapper, store, screenRegistry } = createTestWrapper();
    const user = userEvent.setup();

    const HomeScreen = () => <div>Home Root</div>;
    const HomeDetail = () => <div>Home Detail</div>;
    const SearchScreen = () => <div>Search Root</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });
    screenRegistry.register({ route: 'home/detail', component: HomeDetail });
    screenRegistry.register({ route: 'search', component: SearchScreen });

    // Push to home/detail
    act(() => {
      store.dispatch({
        type: 'PUSH',
        route: 'home/detail',
        params: {},
        id: 'push-1',
        timestamp: 2000,
      });
    });

    render(
      <Wrapper>
        <TabNavigator />
      </Wrapper>,
    );

    // Switch to search
    await user.click(screen.getByRole('tab', { name: 'search' }));

    // Switch back to home
    await user.click(screen.getByRole('tab', { name: 'home' }));

    // Home detail should still be visible (stack preserved)
    expect(screen.getByText('Home Detail')).toBeInTheDocument();
  });

  it('uses display:none for inactive tabs', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();

    const HomeScreen = () => <div>Home</div>;
    const SearchScreen = () => <div>Search</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });
    screenRegistry.register({ route: 'search', component: SearchScreen });

    // Make search tab visited by switching to it first
    const { container } = render(
      <Wrapper>
        <TabNavigator lazy={false} />
      </Wrapper>,
    );

    const homeTab = container.querySelector('[data-rehynav-tab="home"]');
    const searchTab = container.querySelector('[data-rehynav-tab="search"]');

    expect(homeTab).toHaveStyle({ display: 'block' });
    expect(searchTab).toHaveStyle({ display: 'none' });
  });

  it('renders tab bar at bottom by default', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();

    const HomeScreen = () => <div>Home</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });

    const { container } = render(
      <Wrapper>
        <TabNavigator />
      </Wrapper>,
    );

    const tabBar = container.querySelector('[data-rehynav-tabbar]');
    expect(tabBar).toBeInTheDocument();
  });

  it('renders custom tab bar', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();

    const HomeScreen = () => <div>Home</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });

    const CustomTabBar = () => <div data-testid="custom-tabbar">Custom</div>;

    render(
      <Wrapper>
        <TabNavigator tabBar={CustomTabBar} />
      </Wrapper>,
    );

    expect(screen.getByTestId('custom-tabbar')).toBeInTheDocument();
  });

  it('respects lazy loading - does not render unvisited tabs', () => {
    const { Wrapper, screenRegistry } = createTestWrapper();

    const HomeScreen = () => <div>Home</div>;
    const SearchScreen = () => <div>Search</div>;
    screenRegistry.register({ route: 'home', component: HomeScreen });
    screenRegistry.register({ route: 'search', component: SearchScreen });

    const { container } = render(
      <Wrapper>
        <TabNavigator lazy={true} />
      </Wrapper>,
    );

    // Home is active so it should render
    expect(container.querySelector('[data-rehynav-tab="home"]')).toBeInTheDocument();
    // Search was never active so should not render with lazy=true
    expect(container.querySelector('[data-rehynav-tab="search"]')).not.toBeInTheDocument();
  });
});
