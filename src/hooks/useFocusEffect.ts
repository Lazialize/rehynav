import { useEffect, useRef } from 'react';
import { useIsFocused } from './useIsFocused.js';

type EffectCallback = () => undefined | (() => void);

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
