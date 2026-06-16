import { type EffectCallback, useEffect } from 'react';
import { useIsFocused } from './useIsFocused.js';

/**
 * Runs an effect whenever the screen gains focus and cleans it up when the
 * screen loses focus or unmounts. Wrap `effect` in `useCallback` so it is not
 * re-run on every render, mirroring Expo Router / React Navigation.
 */
export function useFocusEffect(effect: EffectCallback): void {
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) return undefined;
    return effect();
  }, [isFocused, effect]);
}
