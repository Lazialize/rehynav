import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { RouterProvider } from './components/RouterProvider.js';
import { createRouter } from './create-router.js';
import { useNavigation } from './hooks/useNavigation.js';
import { useTab } from './hooks/useTab.js';
import { overlay, screen as screenDef, screens, stack, tab, tabs } from './route-helpers.js';

describe('createRouter', () => {
  it('should return RouterInstance with _internal only', () => {
    const router = createRouter([
      tabs(
        [
          tab('home', () => <div>Home</div>, [stack('detail/:id', () => <div>Detail</div>)]),
          tab('search', () => <div>Search</div>),
          tab('profile', () => <div>Profile</div>),
        ],
        { initialTab: 'home' },
      ),
      overlay('login', () => <div>Login</div>),
      overlay('action-sheet', () => <div>Action</div>),
    ]);

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

    const router = createRouter([
      tabs(
        [tab('home', HomeScreen, [stack('detail/:id', DetailScreen)]), tab('search', SearchScreen)],
        { initialTab: 'home' },
      ),
      overlay('login', () => <div>Login Overlay</div>),
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByText('Home - no-back')).toBeInTheDocument();
  });

  it('should use array order as tab order', () => {
    let tabOrder: string[] = [];
    let activeTabResult = '';

    const ProfileScreen: React.FC = () => {
      const { activeTab, tabs: tabList } = useTab();
      tabOrder = tabList;
      activeTabResult = activeTab;
      return (
        <div>
          Profile - active:{activeTab} - tabs:{tabList.join(',')}
        </div>
      );
    };
    const HomeScreen: React.FC = () => {
      const { activeTab, tabs: tabList } = useTab();
      tabOrder = tabList;
      activeTabResult = activeTab;
      return (
        <div>
          Home - active:{activeTab} - tabs:{tabList.join(',')}
        </div>
      );
    };
    const SearchScreen: React.FC = () => <div>Search</div>;

    const router = createRouter([
      tabs([tab('profile', ProfileScreen), tab('home', HomeScreen), tab('search', SearchScreen)], {
        initialTab: 'home',
      }),
    ]);

    render(<RouterProvider router={router} />);

    expect(activeTabResult).toBe('home');
    expect(tabOrder).toEqual(['profile', 'home', 'search']);
  });

  it('should store config options in _internal', () => {
    const CustomTabBar: React.FC = () => <div>Custom</div>;

    const router = createRouter(
      [tabs([tab('home', () => <div>Home</div>)], { initialTab: 'home', tabBar: CustomTabBar })],
      { urlSync: true, basePath: '/app' },
    );

    expect(router._internal.config.global.urlSync).toBe(true);
    expect(router._internal.config.global.basePath).toBe('/app');
    expect(router._internal.config.tabsLayer.options.tabBar).toBe(CustomTabBar);
  });
});

describe('createRouter with screens', () => {
  it('creates router with screens config', () => {
    const LoginScreen: React.FC = () => <div>Login</div>;
    const SignupScreen: React.FC = () => <div>Signup</div>;
    const HomeScreen: React.FC = () => <div>Home</div>;

    const router = createRouter([
      screens([screenDef('login', LoginScreen, [stack('signup', SignupScreen)])], {
        initialScreen: 'login',
      }),
      tabs([tab('home', HomeScreen)], { initialTab: 'home' }),
    ]);

    expect(router._internal).toBeDefined();
    expect(router._internal.screenNames).toEqual(['login']);
    expect(router._internal.initialScreen).toBe('login');
  });
});

describe('createRouter validation', () => {
  it('throws when no tabs() layer is provided', () => {
    expect(() => createRouter([overlay('login', () => <div>Login</div>)])).toThrow(
      'createRouter: a tabs() layer is required',
    );
  });

  it('throws when multiple tabs() layers are provided', () => {
    expect(() =>
      createRouter([
        tabs([tab('home', () => <div>Home</div>)], { initialTab: 'home' }),
        tabs([tab('search', () => <div>Search</div>)], { initialTab: 'search' }),
      ]),
    ).toThrow('createRouter: only one tabs() layer is allowed');
  });

  it('throws when multiple screens() layers are provided', () => {
    expect(() =>
      createRouter([
        tabs([tab('home', () => <div>Home</div>)], { initialTab: 'home' }),
        screens([screenDef('login', () => <div>Login</div>)]),
        screens([screenDef('onboarding', () => <div>Onboarding</div>)]),
      ]),
    ).toThrow('createRouter: only one screens() layer is allowed');
  });
});
