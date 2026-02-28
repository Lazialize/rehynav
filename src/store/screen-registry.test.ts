import { describe, expect, it } from 'vitest';
import type { ScreenRegistration } from './screen-registry.js';
import { createScreenRegistry } from './screen-registry.js';

const DummyComponent = () => null;

function makeRegistration(route: string): ScreenRegistration {
  return { route, component: DummyComponent };
}

describe('createScreenRegistry', () => {
  it('registers and retrieves a screen', () => {
    const registry = createScreenRegistry();
    const registration = makeRegistration('home');

    registry.register(registration);

    expect(registry.get('home')).toBe(registration);
  });

  it('unregisters a screen', () => {
    const registry = createScreenRegistry();
    registry.register(makeRegistration('home'));

    registry.unregister('home');

    expect(registry.get('home')).toBeUndefined();
  });

  it('returns undefined for unregistered routes', () => {
    const registry = createScreenRegistry();

    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('overwrites an existing registration', () => {
    const registry = createScreenRegistry();
    const first = makeRegistration('home');
    const second = { ...makeRegistration('home'), options: { title: 'Home' } };

    registry.register(first);
    registry.register(second);

    expect(registry.get('home')).toBe(second);
    expect(registry.get('home')?.options?.title).toBe('Home');
  });

  it('manages multiple registrations independently', () => {
    const registry = createScreenRegistry();
    const home = makeRegistration('home');
    const search = makeRegistration('search');
    const profile = makeRegistration('profile');

    registry.register(home);
    registry.register(search);
    registry.register(profile);

    expect(registry.get('home')).toBe(home);
    expect(registry.get('search')).toBe(search);
    expect(registry.get('profile')).toBe(profile);

    registry.unregister('search');

    expect(registry.get('home')).toBe(home);
    expect(registry.get('search')).toBeUndefined();
    expect(registry.get('profile')).toBe(profile);
  });

  it('exposes the screens map', () => {
    const registry = createScreenRegistry();
    registry.register(makeRegistration('home'));
    registry.register(makeRegistration('search'));

    expect(registry.screens.size).toBe(2);
    expect(registry.screens.has('home')).toBe(true);
    expect(registry.screens.has('search')).toBe(true);
  });
});
