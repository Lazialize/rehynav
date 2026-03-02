import { type RefObject, useContext, useEffect, useRef } from 'react';
import { RouteContext } from './context.js';
import { useFocusEffect } from './useFocusEffect.js';

const scrollPositions = new Map<string, number>();

export function removeScrollPosition(entryId: string): void {
  scrollPositions.delete(entryId);
}

export function clearAllScrollPositions(): void {
  scrollPositions.clear();
}

export function useScrollRestoration(ref: RefObject<HTMLElement | null>): void {
  const routeCtx = useContext(RouteContext);
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

  // Clean up scroll position when component unmounts (entry removed from state)
  useEffect(() => {
    const id = entryId;
    return () => {
      if (id) {
        scrollPositions.delete(id);
      }
    };
  }, [entryId]);
}
