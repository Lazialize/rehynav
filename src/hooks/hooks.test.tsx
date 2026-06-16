import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { RouterProvider } from '../components/RouterProvider.js';
import { Stack } from '../components/Stack.js';
import type { RouteContextMap } from '../core/route-tree.js';
import { useFocusEffect } from './useFocusEffect.js';
import { useIsFocused } from './useIsFocused.js';
import { useNavigation } from './useNavigation.js';
import { useRootNavigationState } from './useRootNavigationState.js';
import { useGlobalSearchParams, useLocalSearchParams } from './useSearchParams.js';

function Probe(): ReactElement {
  const global = useGlobalSearchParams<{ id?: string }>();
  const local = useLocalSearchParams<{ id?: string }>();
  const state = useRootNavigationState();
  return (
    <div>
      <span data-testid="global-id">{global.id ?? '-'}</span>
      <span data-testid="local-fallback-id">{local.id ?? '-'}</span>
      <span data-testid="root-count">{state.routes.length}</span>
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

function Home(): ReactElement {
  const nav = useNavigation();
  return (
    <div>
      <h1>Home</h1>
      <span data-testid="home-focused">{useIsFocused() ? 'yes' : 'no'}</span>
      <span data-testid="can-go-back">{String(nav.canGoBack())}</span>
      <button type="button" onClick={() => nav.push('/detail/1')}>
        push
      </button>
      <button type="button" onClick={() => nav.navigate('/detail/2')}>
        navigate
      </button>
    </div>
  );
}

function Detail(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useNavigation();
  const [focusCount, setFocusCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusCount((c) => c + 1);
      return () => {};
    }, []),
  );
  return (
    <div>
      <h1>Detail {id}</h1>
      <span data-testid="detail-focused">{useIsFocused() ? 'yes' : 'no'}</span>
      <span data-testid="focus-count">{focusCount}</span>
      <button type="button" onClick={() => nav.goBack()}>
        goback
      </button>
      <button type="button" onClick={() => nav.replace('/detail/9')}>
        replace
      </button>
      <button type="button" onClick={() => nav.setParams({ id: 'X' })}>
        setparams
      </button>
    </div>
  );
}

const context: RouteContextMap = {
  './app/_layout.tsx': { default: RootLayout },
  './app/index.tsx': { default: Home },
  './app/detail/[id].tsx': { default: Detail },
};

function renderApp() {
  return render(<RouterProvider context={context} initialUrl="/" enableUrlSync={false} />);
}

describe('navigation hooks', () => {
  it('useNavigation pushes and goes back', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByTestId('can-go-back')).toHaveTextContent('false');
    await user.click(screen.getByRole('button', { name: 'push' }));
    expect(screen.getByRole('heading', { name: 'Detail 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'goback' }));
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });

  it('tracks focus with useIsFocused and useFocusEffect', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'push' }));
    expect(screen.getByTestId('detail-focused')).toHaveTextContent('yes');
    expect(screen.getByTestId('home-focused')).toHaveTextContent('no');
    expect(Number(screen.getByTestId('focus-count').textContent)).toBeGreaterThanOrEqual(1);
  });

  it('exposes global search params and root state to the root layout', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByTestId('global-id')).toHaveTextContent('-');
    await user.click(screen.getByRole('button', { name: 'push' }));
    expect(screen.getByTestId('global-id')).toHaveTextContent('1');
    // useLocalSearchParams falls back to the focused route when outside a screen.
    expect(screen.getByTestId('local-fallback-id')).toHaveTextContent('1');
    expect(Number(screen.getByTestId('root-count').textContent)).toBeGreaterThanOrEqual(1);
  });

  it('replace and setParams update the active route', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'push' }));
    await user.click(screen.getByRole('button', { name: 'replace' }));
    expect(screen.getByRole('heading', { name: 'Detail 9' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'setparams' }));
    expect(screen.getByRole('heading', { name: 'Detail X' })).toBeInTheDocument();
  });

  it('navigate dedupes to the same screen', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'navigate' }));
    expect(screen.getByRole('heading', { name: 'Detail 2' })).toBeInTheDocument();
  });

  it('throws a helpful error when hooks are used without a provider', () => {
    function Bare(): ReactElement {
      useNavigation();
      return <div />;
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow(/inside <RouterProvider>/);
    spy.mockRestore();
  });
});
