import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useScreenRegistry } from '../hooks/context.js';
import { useNavigation } from '../hooks/useNavigation.js';
import { useNavigationSelector } from '../hooks/useNavigationSelector.js';
import { NavigationProvider } from './NavigationProvider.js';

describe('NavigationProvider', () => {
  it('provides navigation context to children', () => {
    function TestChild() {
      const nav = useNavigation();
      return <div>has navigation: {String(!!nav.push)}</div>;
    }

    render(
      <NavigationProvider routerConfig={{ tabs: ['home', 'search'], initialTab: 'home' }}>
        <TestChild />
      </NavigationProvider>,
    );

    expect(screen.getByText('has navigation: true')).toBeInTheDocument();
  });

  it('provides screen registry context', () => {
    function TestChild() {
      const registry = useScreenRegistry();
      return <div>has registry: {String(!!registry.screens)}</div>;
    }

    render(
      <NavigationProvider routerConfig={{ tabs: ['home'], initialTab: 'home' }}>
        <TestChild />
      </NavigationProvider>,
    );

    expect(screen.getByText('has registry: true')).toBeInTheDocument();
  });

  it('initializes with correct tab state', () => {
    function TestChild() {
      const activeTab = useNavigationSelector((s) => s.activeTab);
      const tabOrder = useNavigationSelector((s) => s.tabOrder);
      return (
        <div>
          active: {activeTab}, tabs: {tabOrder.join(',')}
        </div>
      );
    }

    render(
      <NavigationProvider
        routerConfig={{ tabs: ['home', 'search', 'profile'], initialTab: 'search' }}
      >
        <TestChild />
      </NavigationProvider>,
    );

    expect(screen.getByText('active: search, tabs: home,search,profile')).toBeInTheDocument();
  });

  it('accepts custom initial state', () => {
    const customState = {
      tabs: {
        home: {
          name: 'home',
          stack: [{ id: 'custom-1', route: 'home', params: {}, timestamp: 5000 }],
          hasBeenActive: true,
        },
      },
      activeTab: 'home',
      tabOrder: ['home'],
      overlays: [],
      badges: {},
    };

    function TestChild() {
      const activeTab = useNavigationSelector((s) => s.activeTab);
      return <div>tab: {activeTab}</div>;
    }

    render(
      <NavigationProvider
        routerConfig={{ tabs: ['home'], initialTab: 'home' }}
        initialState={customState}
      >
        <TestChild />
      </NavigationProvider>,
    );

    expect(screen.getByText('tab: home')).toBeInTheDocument();
  });

  it('calls onStateChange when state changes', () => {
    const onStateChange = vi.fn();

    function TestChild() {
      const nav = useNavigation();
      return (
        <button type="button" onClick={() => nav.push('home/detail')}>
          push
        </button>
      );
    }

    render(
      <NavigationProvider
        routerConfig={{ tabs: ['home'], initialTab: 'home' }}
        onStateChange={onStateChange}
      >
        <TestChild />
      </NavigationProvider>,
    );

    screen.getByRole('button', { name: 'push' }).click();
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ activeTab: 'home' }));
  });

  it('renders children', () => {
    render(
      <NavigationProvider routerConfig={{ tabs: ['home'], initialTab: 'home' }}>
        <div>child content</div>
      </NavigationProvider>,
    );

    expect(screen.getByText('child content')).toBeInTheDocument();
  });
});
