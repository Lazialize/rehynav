import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createId } from '../core/id.js';
import { createInitialState } from '../core/state.js';
import type { StackEntry } from '../core/types.js';
import {
  NavigationStoreContext,
  ScreenRegistryContext,
  type ScreenRegistryForHooks,
} from '../hooks/context.js';
import { createNavigationStore } from '../store/navigation-store.js';
import { createScreenRegistry } from '../store/screen-registry.js';
import { ScreenRenderer } from './ScreenRenderer.js';

function DummyLoginScreen(_props: Record<string, unknown>) {
  return <div>Login Screen</div>;
}

function DummySignupScreen(_props: Record<string, unknown>) {
  return <div>Signup Screen</div>;
}

function renderScreenRenderer(screenStack: StackEntry[]) {
  const store = createNavigationStore(
    createInitialState({ tabs: ['home'], initialTab: 'home' }, createId, Date.now),
  );
  const registry = createScreenRegistry();
  registry.register({ route: 'login', component: DummyLoginScreen });
  registry.register({ route: 'login/signup', component: DummySignupScreen });

  return render(
    <NavigationStoreContext.Provider value={store}>
      <ScreenRegistryContext.Provider value={registry as unknown as ScreenRegistryForHooks}>
        <ScreenRenderer screens={screenStack} />
      </ScreenRegistryContext.Provider>
    </NavigationStoreContext.Provider>,
  );
}

describe('ScreenRenderer', () => {
  it('renders the top screen', () => {
    const screenStack: StackEntry[] = [{ id: 's1', route: 'login', params: {}, timestamp: 1000 }];
    renderScreenRenderer(screenStack);
    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });

  it('renders all screens but only shows the top one', () => {
    const screenStack: StackEntry[] = [
      { id: 's1', route: 'login', params: {}, timestamp: 1000 },
      { id: 's2', route: 'login/signup', params: {}, timestamp: 2000 },
    ];
    renderScreenRenderer(screenStack);

    expect(screen.getByText('Signup Screen')).toBeInTheDocument();
    expect(screen.getByText('Login Screen')).toBeInTheDocument();

    // Login screen should be hidden
    const loginDiv = screen
      .getByText('Login Screen')
      .closest('[data-route-type="screen"]') as HTMLElement | null;
    expect(loginDiv?.style.display).toBe('none');

    // Signup screen should be visible
    const signupDiv = screen
      .getByText('Signup Screen')
      .closest('[data-route-type="screen"]') as HTMLElement | null;
    expect(signupDiv?.style.display).toBe('block');
  });
});
