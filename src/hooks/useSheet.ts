import { useMemo } from 'react';
import { createId } from '../core/id.js';
import type { OverlayEntry, Serializable } from '../core/types.js';
import { useNavigationStore } from './context.js';
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

export interface SheetActions {
  open(name: string, params?: Record<string, Serializable>): void;
  close(name?: string): void;
  isOpen: boolean;
  current: string | null;
}

export function useSheet(): SheetActions {
  const store = useNavigationStore();
  const overlays = useNavigationSelector((s) => s.overlays);
  const currentSheet = findLastOverlay(overlays, 'sheet');

  return useMemo(
    () => ({
      open(name: string, params: Record<string, Serializable> = {}) {
        store.dispatch({
          type: 'OPEN_OVERLAY',
          overlayType: 'sheet',
          route: name,
          params,
          id: createId(),
          timestamp: Date.now(),
        });
      },
      close(name?: string) {
        store.dispatch({ type: 'CLOSE_OVERLAY', route: name });
      },
      isOpen: currentSheet !== undefined,
      current: currentSheet?.route ?? null,
    }),
    [store, currentSheet],
  );
}
