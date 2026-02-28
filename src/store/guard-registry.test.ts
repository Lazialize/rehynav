import { describe, expect, it, vi } from 'vitest';
import type { RouteInfo } from '../core/types.js';
import { createNavigationGuardRegistry } from './guard-registry.js';

const fromRoute: RouteInfo = { route: 'home', params: {} };
const toRoute: RouteInfo = { route: 'search', params: {} };

describe('createNavigationGuardRegistry', () => {
  it('starts with an empty guards list', () => {
    const registry = createNavigationGuardRegistry();
    expect(registry.guards).toHaveLength(0);
  });

  it('registers a guard', () => {
    const registry = createNavigationGuardRegistry();
    const guard = vi.fn(() => true);

    registry.register('g1', guard);

    expect(registry.guards).toHaveLength(1);
    expect(registry.guards[0].id).toBe('g1');
  });

  it('unregisters a guard', () => {
    const registry = createNavigationGuardRegistry();
    const guard = vi.fn(() => true);

    registry.register('g1', guard);
    registry.unregister('g1');

    expect(registry.guards).toHaveLength(0);
  });

  it('check returns true when no guards are registered', () => {
    const registry = createNavigationGuardRegistry();
    expect(registry.check(fromRoute, toRoute, 'push')).toBe(true);
  });

  it('check returns true when all guards allow', () => {
    const registry = createNavigationGuardRegistry();

    registry.register('g1', () => true);
    registry.register('g2', () => true);

    expect(registry.check(fromRoute, toRoute, 'push')).toBe(true);
  });

  it('check returns false when any guard blocks', () => {
    const registry = createNavigationGuardRegistry();

    registry.register('g1', () => true);
    registry.register('g2', () => false);

    expect(registry.check(fromRoute, toRoute, 'push')).toBe(false);
  });

  it('check short-circuits on first blocking guard', () => {
    const registry = createNavigationGuardRegistry();
    const guard1 = vi.fn(() => false);
    const guard2 = vi.fn(() => true);

    registry.register('g1', guard1);
    registry.register('g2', guard2);

    registry.check(fromRoute, toRoute, 'push');

    expect(guard1).toHaveBeenCalledTimes(1);
    expect(guard2).not.toHaveBeenCalled();
  });

  it('passes correct arguments to guard functions', () => {
    const registry = createNavigationGuardRegistry();
    const guard = vi.fn(() => true);

    registry.register('g1', guard);
    registry.check(fromRoute, toRoute, 'back');

    expect(guard).toHaveBeenCalledWith(fromRoute, toRoute, 'back');
  });

  it('unregistering a non-existent guard is a no-op', () => {
    const registry = createNavigationGuardRegistry();
    const guard = vi.fn(() => true);

    registry.register('g1', guard);
    registry.unregister('nonexistent');

    expect(registry.guards).toHaveLength(1);
  });

  it('supports multiple guards with different directions', () => {
    const registry = createNavigationGuardRegistry();

    // Guard that only blocks back navigation
    registry.register('back-guard', (_from, _to, direction) => direction !== 'back');

    expect(registry.check(fromRoute, toRoute, 'push')).toBe(true);
    expect(registry.check(fromRoute, toRoute, 'back')).toBe(false);
    expect(registry.check(fromRoute, toRoute, 'tab-switch')).toBe(true);
  });
});
