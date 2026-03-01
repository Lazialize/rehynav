import { type RefObject, useContext, useRef } from 'react';
import { RouteContext } from './context.js';
import { useFocusEffect } from './useFocusEffect.js';

const scrollPositions = new Map<string, number>();

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
}
