import { useMemo } from 'react';
import { createId } from '../core/id.js';
import type { OverlayEntry, RouteInfo, Serializable } from '../core/types.js';
import { useGuardRegistry, useNavigationStore } from './context.js';
import { useNavigationSelector } from './useNavigationSelector.js';

function findLastOverlay(
  overlays: OverlayEntry[],
  type: 'modal' | 'sheet',
): OverlayEntry | undefined {
  for (let i = overlays.length - 1; i >= 0; i--) {
    if (overlays[i].type === type) return overlays[i];
  }
  return undefined;
}

export interface ModalActions {
  open(name: string, params?: Record<string, Serializable>): void;
  close(name?: string): void;
  isOpen: boolean;
  current: string | null;
}

export function useModal(): ModalActions {
  const store = useNavigationStore();
  const guardRegistry = useGuardRegistry();
  const overlays = useNavigationSelector((s) => s.overlays);
  const currentModal = findLastOverlay(overlays, 'modal');

  return useMemo(
    () => ({
      open(name: string, params: Record<string, Serializable> = {}) {
        const state = store.getState();
        let from: RouteInfo;
        if (state.overlays.length > 0) {
          const topOverlay = state.overlays[state.overlays.length - 1];
          from = { route: topOverlay.route, params: topOverlay.params };
        } else {
          const activeTab = state.tabs[state.activeTab];
          const topEntry = activeTab.stack[activeTab.stack.length - 1];
          from = { route: topEntry.route, params: topEntry.params };
        }
        const to: RouteInfo = { route: name, params };
        if (!guardRegistry.check(from, to, 'push')) return;
        store.dispatch({
          type: 'OPEN_OVERLAY',
          overlayType: 'modal',
          route: name,
          params,
          id: createId(),
          timestamp: Date.now(),
        });
      },
      close(name?: string) {
        store.dispatch({ type: 'CLOSE_OVERLAY', route: name });
      },
      isOpen: currentModal !== undefined,
      current: currentModal?.route ?? null,
    }),
    [store, guardRegistry, currentModal],
  );
}
