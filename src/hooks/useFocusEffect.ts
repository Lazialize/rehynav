import { useEffect, useRef } from 'react';
import { useIsFocused } from './useIsFocused.js';

type EffectCallback = () => undefined | (() => void);

/**
 * Runs a side-effect when the screen gains focus and cleans it up when
 * the screen loses focus or unmounts.
 *
 * The effect also re-runs whenever the `callback` reference changes while
 * focused — wrap the callback in `useCallback` to avoid unnecessary
 * re-executions on every render.
 */
export function useFocusEffect(callback: EffectCallback): void {
  const isFocused = useIsFocused();
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (isFocused) {
      cleanupRef.current = callback();
    } else {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
    };
  }, [isFocused, callback]);
}
