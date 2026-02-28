import { createContext, useContext } from 'react';
import type { NavigationGuardRegistry } from '../core/navigation-guard.js';
import type { NavigationAction, NavigationState, Serializable } from '../core/types.js';

// Minimal store interface that hooks consume
export interface NavigationStoreForHooks {
  getState(): NavigationState;
  dispatch(action: NavigationAction): void;
  subscribe(listener: () => void): () => void;
  getServerSnapshot(): NavigationState;
}

// Minimal screen registry interface
export interface ScreenRegistryForHooks {
  screens: Map<
    string,
    { route: string; component: React.ComponentType<Record<string, unknown>>; options?: unknown }
  >;
  get(
    route: string,
  ):
    | { route: string; component: React.ComponentType<Record<string, unknown>>; options?: unknown }
    | undefined;
}

export const NavigationStoreContext: React.Context<NavigationStoreForHooks | null> =
  createContext<NavigationStoreForHooks | null>(null);
export const ScreenRegistryContext: React.Context<ScreenRegistryForHooks | null> =
  createContext<ScreenRegistryForHooks | null>(null);
export const GuardRegistryContext: React.Context<NavigationGuardRegistry | null> =
  createContext<NavigationGuardRegistry | null>(null);

// Route context for auto-inferring route info inside Screen components
export const RouteContext: React.Context<{
  route: string;
  params: Record<string, Serializable>;
} | null> = createContext<{ route: string; params: Record<string, Serializable> } | null>(null);

export function useNavigationStore(): NavigationStoreForHooks {
  const store = useContext(NavigationStoreContext);
  if (!store) {
    throw new Error('useNavigationStore must be used within NavigationProvider');
  }
  return store;
}

export function useScreenRegistry(): ScreenRegistryForHooks {
  const registry = useContext(ScreenRegistryContext);
  if (!registry) {
    throw new Error('useScreenRegistry must be used within NavigationProvider');
  }
  return registry;
}

export function useGuardRegistry(): NavigationGuardRegistry {
  const registry = useContext(GuardRegistryContext);
  if (!registry) {
    throw new Error('useGuardRegistry must be used within NavigationProvider');
  }
  return registry;
}
