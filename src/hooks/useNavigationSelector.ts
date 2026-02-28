import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { NavigationState } from '../core/types.js';
import { useNavigationStore } from './context.js';

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

export function useNavigationSelector<T>(
  selector: (state: NavigationState) => T,
  isEqual?: (a: T, b: T) => boolean,
): T {
  const store = useNavigationStore();
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);
  const resultRef = useRef<T | undefined>(undefined);

  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  const getSnapshot = useCallback(() => {
    const nextResult = selectorRef.current(store.getState());
    if (resultRef.current !== undefined && isEqualRef.current?.(resultRef.current, nextResult)) {
      return resultRef.current;
    }
    resultRef.current = nextResult;
    return nextResult;
  }, [store]);

  const getServerSnapshot = useCallback(() => {
    return selectorRef.current(store.getServerSnapshot());
  }, [store]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getServerSnapshot);
}
