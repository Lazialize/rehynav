import type { NavigationDirection, RouteInfo } from './types.js';

export type GuardFn = (from: RouteInfo, to: RouteInfo, direction: NavigationDirection) => boolean;

export interface NavigationGuardRegistry {
  guards: Array<{ id: string; guard: GuardFn }>;
  register(id: string, guard: GuardFn): void;
  unregister(id: string): void;
  check(from: RouteInfo, to: RouteInfo, direction: NavigationDirection): boolean;
}

export function createNavigationGuardRegistry(): NavigationGuardRegistry {
  const guards: Array<{ id: string; guard: GuardFn }> = [];

  return {
    guards,

    register(id: string, guard: GuardFn): void {
      guards.push({ id, guard });
    },

    unregister(id: string): void {
      const index = guards.findIndex((g) => g.id === id);
      if (index !== -1) {
        guards.splice(index, 1);
      }
    },

    check(from: RouteInfo, to: RouteInfo, direction: NavigationDirection): boolean {
      for (const { guard } of guards) {
        if (!guard(from, to, direction)) {
          return false;
        }
      }
      return true;
    },
  };
}
