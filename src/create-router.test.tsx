import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { RouterProvider } from './components/RouterProvider.js';
import { createRouter } from './create-router.js';
import { useNavigation } from './hooks/useNavigation.js';
import { useTab } from './hooks/useTab.js';
import { overlay, screen as screenDef, stack, tab } from './route-helpers.js';

describe('createRouter', () => {
  it('should return RouterInstance with _internal only', () => {
    const router = createRouter({
      tabs: [
        tab('home', () => <div>Home</div>, [stack('detail/:id', () => <div>Detail</div>)]),
        tab('search', () => <div>Search</div>),
        tab('profile', () => <div>Profile</div>),
      ],
      overlays: [
        overlay('login', () => <div>Login</div>),
        overlay('action-sheet', () => <div>Action</div>),
      ],
      initialTab: 'home',
    });

    expect(router._internal).toBeDefined();
    expect(router._internal.tabNames).toEqual(['home', 'search', 'profile']);
    expect(router._internal.initialTab).toBe('home');
    expect(router._internal.registrations.length).toBeGreaterThan(0);

    // Should NOT have old API
    expect(router).not.toHaveProperty('NavigationProvider');
    expect(router).not.toHaveProperty('useNavigation');
    expect(router).not.toHaveProperty('useRoute');
    expect(router).not.toHaveProperty('useTab');
    expect(router).not.toHaveProperty('useOverlay');
  });

  it('should pre-populate screen registry from config', () => {
    let canGoBackResult = false;

    const HomeScreen: React.FC = () => {
      const nav = useNavigation();
      canGoBackResult = nav.canGoBack();
      return <div>Home - {canGoBackResult ? 'can-back' : 'no-back'}</div>;
    };

    const DetailScreen: React.FC = () => <div>Detail</div>;
    const SearchScreen: React.FC = () => <div>Search</div>;

    const router = createRouter({
      tabs: [
        tab('home', HomeScreen, [stack('detail/:id', DetailScreen)]),
        tab('search', SearchScreen),
      ],
      overlays: [overlay('login', () => <div>Login Overlay</div>)],
      initialTab: 'home',
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByText('Home - no-back')).toBeInTheDocument();
  });

  it('should use array order as tab order', () => {
    let tabOrder: string[] = [];
    let activeTabResult = '';

    const ProfileScreen: React.FC = () => {
      const { activeTab, tabs } = useTab();
      tabOrder = tabs;
      activeTabResult = activeTab;
      return (
        <div>
          Profile - active:{activeTab} - tabs:{tabs.join(',')}
        </div>
      );
    };
    const HomeScreen: React.FC = () => {
      const { activeTab, tabs } = useTab();
      tabOrder = tabs;
      activeTabResult = activeTab;
      return (
        <div>
          Home - active:{activeTab} - tabs:{tabs.join(',')}
        </div>
      );
    };
    const SearchScreen: React.FC = () => <div>Search</div>;

    const router = createRouter({
      tabs: [tab('profile', ProfileScreen), tab('home', HomeScreen), tab('search', SearchScreen)],
      initialTab: 'home',
    });

    render(<RouterProvider router={router} />);

    expect(activeTabResult).toBe('home');
    expect(tabOrder).toEqual(['profile', 'home', 'search']);
  });

  it('should store config options in _internal', () => {
    const CustomTabBar: React.FC = () => <div>Custom</div>;

    const router = createRouter({
      tabs: [tab('home', () => <div>Home</div>)],
      initialTab: 'home',
      urlSync: true,
      basePath: '/app',
      tabBar: CustomTabBar,
    });

    expect(router._internal.config.urlSync).toBe(true);
    expect(router._internal.config.basePath).toBe('/app');
    expect(router._internal.config.tabBar).toBe(CustomTabBar);
  });
});

describe('createRouter with screens', () => {
  it('creates router with screens config', () => {
    const LoginScreen: React.FC = () => <div>Login</div>;
    const SignupScreen: React.FC = () => <div>Signup</div>;
    const HomeScreen: React.FC = () => <div>Home</div>;

    const router = createRouter({
      screens: [screenDef('login', LoginScreen, [stack('signup', SignupScreen)])],
      tabs: [tab('home', HomeScreen)],
      overlays: [],
      initialTab: 'home',
      initialScreen: 'login',
    });

    expect(router._internal).toBeDefined();
    expect(router._internal.screenNames).toEqual(['login']);
    expect(router._internal.initialScreen).toBe('login');
  });
});
