import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import type { RouteContextMap } from '../core/route-tree.js';
import { useRouter } from '../hooks/useRouter.js';
import { Redirect } from './Redirect.js';
import { RouterProvider } from './RouterProvider.js';
import { Slot } from './Slot.js';
import { Stack } from './Stack.js';
import { Tabs } from './Tabs.js';

function renderApp(context: RouteContextMap, initialUrl = '/') {
  return render(<RouterProvider context={context} initialUrl={initialUrl} enableUrlSync={false} />);
}

describe('Redirect', () => {
  it('replaces the current route on mount', () => {
    const context: RouteContextMap = {
      './app/_layout.tsx': { default: () => <Stack /> },
      './app/index.tsx': { default: () => <Redirect href="/welcome" /> },
      './app/welcome.tsx': { default: () => <h1>Welcome</h1> },
    };
    renderApp(context);
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
  });
});

describe('Stack header', () => {
  const context: RouteContextMap = {
    './app/_layout.tsx': {
      default: () => (
        <Stack screenOptions={{ headerShown: true }}>
          <Stack.Screen name="detail/[id]" options={{ title: 'The Detail' }} />
        </Stack>
      ),
    },
    './app/index.tsx': {
      default: () => {
        const router = useRouter();
        return (
          <div>
            <button type="button" onClick={() => router.push('/detail/1')}>
              open
            </button>
            <button type="button" onClick={() => router.push('/widget/9')}>
              open-widget
            </button>
          </div>
        );
      },
    },
    './app/detail/[id].tsx': { default: () => <h1>Detail</h1> },
    './app/widget/[wid].tsx': { default: () => <h1>Widget</h1> },
  };

  it('renders a default header with a working back button', async () => {
    const user = userEvent.setup();
    renderApp(context);
    await user.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByText('The Detail')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(screen.getByRole('button', { name: 'open' })).toBeInTheDocument();
  });

  it('derives a default title from the route name when none is given', async () => {
    const user = userEvent.setup();
    renderApp(context);
    await user.click(screen.getByRole('button', { name: 'open-widget' }));
    // Title prettified from the dynamic route name `widget/[wid]`.
    expect(screen.getByText('Wid')).toBeInTheDocument();
  });

  it('shows a header without a back button at the stack root', () => {
    const rootHeader: RouteContextMap = {
      './app/_layout.tsx': { default: () => <Stack screenOptions={{ headerShown: true }} /> },
      './app/index.tsx': { default: () => <h1>Root</h1> },
    };
    renderApp(rootHeader);
    expect(screen.getByRole('heading', { name: 'Root' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go back' })).not.toBeInTheDocument();
  });
});

describe('Tabs customization', () => {
  it('uses a custom tab bar and hides routes with href:null', async () => {
    const user = userEvent.setup();
    const tabsContext: RouteContextMap = {
      './app/_layout.tsx': {
        default: () => (
          <Tabs
            tabBar={({ tabs, onSelect }) => (
              <div data-testid="custom-bar">
                {tabs.map((t) => (
                  <button key={t.name} type="button" onClick={() => onSelect(t.href)}>
                    {t.title}
                  </button>
                ))}
              </div>
            )}
          >
            <Tabs.Screen name="settings" options={{ href: null }} />
          </Tabs>
        ),
      },
      './app/index.tsx': { default: () => <h1>Home</h1> },
      './app/profile.tsx': { default: () => <h1>Profile</h1> },
      './app/settings.tsx': { default: () => <h1>Settings</h1> },
    };
    renderApp(tabsContext);
    expect(screen.getByTestId('custom-bar')).toBeInTheDocument();
    // The settings tab is hidden from the bar.
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  });
});

describe('fallbacks', () => {
  it('renders a Slot when no root layout is provided', () => {
    const context: RouteContextMap = {
      './app/index.tsx': { default: () => <h1>Home</h1> },
    };
    renderApp(context);
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });

  it('shows an error for routes without a component', () => {
    const context: RouteContextMap = {
      './app/_layout.tsx': { default: () => <Stack /> },
      './app/index.tsx': {},
    };
    renderApp(context);
    expect(screen.getByText(/has no default-exported component/)).toBeInTheDocument();
  });
});
