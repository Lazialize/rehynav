import { render } from '@testing-library/react';
import type React from 'react';
import { createId } from '../../src/core/id.js';
import { createNavigationGuardRegistry } from '../../src/core/navigation-guard.js';
import { createInitialState } from '../../src/core/state.js';
import {
  GuardRegistryContext,
  NavigationStoreContext,
  ScreenRegistryContext,
} from '../../src/hooks/context.js';
import { createNavigationStore } from '../../src/store/navigation-store.js';
import { createScreenRegistry } from '../../src/store/screen-registry.js';

export function renderWithNav(
  ui: React.ReactElement,
  config = { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
) {
  const store = createNavigationStore(createInitialState(config, createId, Date.now));
  const screenRegistry = createScreenRegistry();
  const guardRegistry = createNavigationGuardRegistry();

  const result = render(
    <NavigationStoreContext.Provider value={store}>
      <ScreenRegistryContext.Provider value={screenRegistry}>
        <GuardRegistryContext.Provider value={guardRegistry}>{ui}</GuardRegistryContext.Provider>
      </ScreenRegistryContext.Provider>
    </NavigationStoreContext.Provider>,
  );

  return { ...result, store, screenRegistry, guardRegistry };
}
