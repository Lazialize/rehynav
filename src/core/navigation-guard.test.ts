import { describe, expect, it, vi } from 'vitest';
import { createNavigationGuardRegistry } from './navigation-guard.js';
import type { NavigationDirection, RouteInfo } from './types.js';

const fromRoute: RouteInfo = { route: 'home', params: {} };
const toRoute: RouteInfo = { route: 'home/detail', params: { itemId: '1' } };

describe('NavigationGuardRegistry', () => {
  it('allows navigation when no guards are registered', () => {
    const registry = createNavigationGuardRegistry();
    expect(registry.check(fromRoute, toRoute, 'push')).toBe(true);
  });

  it('allows navigation when all guards return true', () => {
    const registry = createNavigationGuardRegistry();
    registry.register('guard-1', () => true);
    registry.register('guard-2', () => true);

    expect(registry.check(fromRoute, toRoute, 'push')).toBe(true);
  });

  it('blocks navigation when any guard returns false', () => {
    const registry = createNavigationGuardRegistry();
    registry.register('guard-1', () => true);
    registry.register('guard-2', () => false);

    expect(registry.check(fromRoute, toRoute, 'push')).toBe(false);
  });

  it('passes correct arguments to guard functions', () => {
    const registry = createNavigationGuardRegistry();
    const guardFn = vi.fn(() => true);
    registry.register('guard-1', guardFn);

    const direction: NavigationDirection = 'back';
    registry.check(fromRoute, toRoute, direction);

    expect(guardFn).toHaveBeenCalledWith(fromRoute, toRoute, direction);
  });

  it('unregisters a guard', () => {
    const registry = createNavigationGuardRegistry();
    const blockingGuard = vi.fn(() => false);
    registry.register('blocker', blockingGuard);

    expect(registry.check(fromRoute, toRoute, 'push')).toBe(false);

    registry.unregister('blocker');
    expect(registry.check(fromRoute, toRoute, 'push')).toBe(true);
    expect(registry.guards).toHaveLength(0);
  });

  it('unregistering a non-existent guard is a no-op', () => {
    const registry = createNavigationGuardRegistry();
    registry.register('guard-1', () => true);
    registry.unregister('nonexistent');
    expect(registry.guards).toHaveLength(1);
  });

  it('short-circuits on first blocking guard', () => {
    const registry = createNavigationGuardRegistry();
    const firstGuard = vi.fn(() => false);
    const secondGuard = vi.fn(() => true);
    registry.register('first', firstGuard);
    registry.register('second', secondGuard);

    registry.check(fromRoute, toRoute, 'push');

    expect(firstGuard).toHaveBeenCalled();
    expect(secondGuard).not.toHaveBeenCalled();
  });
});
