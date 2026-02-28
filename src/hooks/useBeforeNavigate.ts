import { useEffect, useId } from 'react';
import type { NavigationDirection, RouteInfo } from '../core/types.js';
import { useGuardRegistry } from './context.js';

export function useBeforeNavigate(
  guard: (from: RouteInfo, to: RouteInfo, direction: NavigationDirection) => boolean,
): void {
  const registry = useGuardRegistry();
  const id = useId();

  useEffect(() => {
    registry.register(id, guard);
    return () => registry.unregister(id);
  }, [registry, id, guard]);
}
