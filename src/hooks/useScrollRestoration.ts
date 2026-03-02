import { type RefObject, useContext, useEffect, useRef } from 'react';
import type { NavigationState } from '../core/types.js';
import { NavigationStoreContext, RouteContext } from './context.js';
import { useFocusEffect } from './useFocusEffect.js';

const scrollPositions = new Map<string, number>();

export function removeScrollPosition(entryId: string): void {
  scrollPositions.delete(entryId);
}

export function clearAllScrollPositions(): void {
  scrollPositions.clear();
}

function entryExistsInState(state: NavigationState, entryId: string): boolean {
  for (const tabState of Object.values(state.tabs)) {
    for (const entry of tabState.stack) {
      if (entry.id === entryId) return true;
    }
  }
  for (const entry of state.screens) {
    if (entry.id === entryId) return true;
  }
  for (const entry of state.overlays) {
    if (entry.id === entryId) return true;
  }
  return false;
}

export function useScrollRestoration(ref: RefObject<HTMLElement | null>): void {
  const routeCtx = useContext(RouteContext);
  const store = useContext(NavigationStoreContext);
  const entryId = routeCtx?.entryId ?? null;
  const entryIdRef = useRef(entryId);
  entryIdRef.current = entryId;

  useFocusEffect(() => {
    // On focus: restore scroll position
    const id = entryIdRef.current;
    if (id && ref.current) {
      const saved = scrollPositions.get(id);
      if (saved !== undefined) {
        ref.current.scrollTo({ top: saved, behavior: 'instant' });
      }
    }

    // On blur: save scroll position
    return () => {
      const id = entryIdRef.current;
      if (id && ref.current) {
        scrollPositions.set(id, ref.current.scrollTop);
      }
    };
  });

  // Clean up scroll position when component unmounts, but only if the
  // entry was actually removed from navigation state. This prevents
  // false cleanup when tab switching with preserveState=false unmounts
  // components whose entries still exist in state.
  useEffect(() => {
    const id = entryId;
    return () => {
      if (id && store && !entryExistsInState(store.getState(), id)) {
        scrollPositions.delete(id);
      }
    };
  }, [entryId, store]);
}
