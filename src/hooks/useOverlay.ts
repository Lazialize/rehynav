import { useMemo } from 'react';
import { createId } from '../core/id.js';
import { getCurrentRouteInfo } from '../core/route-utils.js';
import type { Serializable } from '../core/types.js';
import { useGuardRegistry, useNavigationStore } from './context.js';
import { useNavigationSelector } from './useNavigationSelector.js';

export interface OverlayActions {
  open(name: string, params?: Record<string, Serializable>): void;
  close(name?: string): void;
  isOpen: boolean;
  current: string | null;
}

export function useOverlay(): OverlayActions {
  const store = useNavigationStore();
  const guardRegistry = useGuardRegistry();
  const overlays = useNavigationSelector((s) => s.overlays);
  const currentOverlay = overlays.length > 0 ? overlays[overlays.length - 1] : undefined;

  return useMemo(
    () => ({
      open(name: string, params: Record<string, Serializable> = {}) {
        const state = store.getState();
        const from = getCurrentRouteInfo(state);
        const to = { route: name, params };
        if (!guardRegistry.check(from, to, 'push')) return;
        store.dispatch({
          type: 'OPEN_OVERLAY',
          route: name,
          params,
          id: createId(),
          timestamp: Date.now(),
        });
      },
      close(name?: string) {
        store.dispatch({ type: 'CLOSE_OVERLAY', route: name });
      },
      isOpen: currentOverlay !== undefined,
      current: currentOverlay?.route ?? null,
    }),
    [store, guardRegistry, currentOverlay],
  );
}
