import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import type { RouteContextMap } from '../core/route-tree.js';
import { usePathname } from '../hooks/usePathname.js';
import { useRouter } from '../hooks/useRouter.js';
import { useLocalSearchParams } from '../hooks/useSearchParams.js';
import { useSegments } from '../hooks/useSegments.js';
import { Link } from './Link.js';
import { RouterProvider } from './RouterProvider.js';
import { Slot } from './Slot.js';
import { Stack } from './Stack.js';
import { Tabs } from './Tabs.js';

function Probe(): ReactElement {
  const pathname = usePathname();
  const segments = useSegments();
  return (
    <div>
      <span data-testid="pathname">{pathname}</span>
      <span data-testid="segments">{segments.join('|')}</span>
    </div>
  );
}

function RootLayout(): ReactElement {
  return (
    <>
      <Probe />
      <Stack />
    </>
  );
}

function TabsLayout(): ReactElement {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

function HomeScreen(): ReactElement {
  const router = useRouter();
  return (
    <div>
      <h1>Home</h1>
      <Link href="/feed/7">to-feed-7</Link>
      <button type="button" onClick={() => router.push('/profile')}>
        push-profile
      </button>
    </div>
  );
}

function FeedIndex(): ReactElement {
  const router = useRouter();
  return (
    <div>
      <h1>Feed</h1>
      <button type="button" onClick={() => router.push('/feed/3')}>
        open-3
      </button>
    </div>
  );
}

function FeedDetail(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <div>
      <h1>Detail {id}</h1>
      <button type="button" onClick={() => router.back()}>
        back
      </button>
    </div>
  );
}

const context: RouteContextMap = {
  './app/_layout.tsx': { default: RootLayout },
  './app/(tabs)/_layout.tsx': { default: TabsLayout },
  './app/(tabs)/index.tsx': { default: HomeScreen },
  './app/(tabs)/feed/_layout.tsx': { default: Slot as never },
  './app/(tabs)/feed/index.tsx': { default: FeedIndex },
  './app/(tabs)/feed/[id].tsx': { default: FeedDetail },
  './app/(tabs)/profile.tsx': { default: () => <h1>Profile</h1> },
  './app/+not-found.tsx': { default: () => <h1>Not Found</h1> },
};

function renderApp(initialUrl: string) {
  return render(<RouterProvider context={context} initialUrl={initialUrl} enableUrlSync={false} />);
}

describe('file-based routing integration', () => {
  it('renders the index route of the tab navigator', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/');
  });

  it('navigates via Link and reads dynamic params', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByText('to-feed-7'));
    expect(screen.getByRole('heading', { name: 'Detail 7' })).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/feed/7');
    expect(screen.getByTestId('segments')).toHaveTextContent('feed|[id]');
  });

  it('preserves independent tab stacks across tab switches', async () => {
    const user = userEvent.setup();
    renderApp('/');
    // Go to the feed tab and push a detail screen.
    await user.click(screen.getByRole('button', { name: 'Feed' }));
    expect(screen.getByRole('heading', { name: 'Feed' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'open-3' }));
    expect(screen.getByRole('heading', { name: 'Detail 3' })).toBeInTheDocument();
    // Switch to the profile tab.
    await user.click(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    // Switch back to feed: the /feed/3 stack is preserved.
    await user.click(screen.getByRole('button', { name: 'Feed' }));
    expect(screen.getByRole('heading', { name: 'Detail 3' })).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/feed/3');
  });

  it('goes back through the active stack', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Feed' }));
    await user.click(screen.getByRole('button', { name: 'open-3' }));
    expect(screen.getByRole('heading', { name: 'Detail 3' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByRole('heading', { name: 'Feed' })).toBeInTheDocument();
  });

  it('renders the +not-found route for unmatched paths', () => {
    renderApp('/does/not/exist');
    expect(screen.getByRole('heading', { name: 'Not Found' })).toBeInTheDocument();
  });
});
