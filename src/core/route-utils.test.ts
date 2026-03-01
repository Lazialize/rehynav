import { describe, expect, it } from 'vitest';
import {
  findClosestMatch,
  getCurrentRouteInfo,
  resolveScreenForRoute,
  resolveTabForRoute,
} from './route-utils.js';
import type { NavigationState } from './types.js';

describe('resolveTabForRoute', () => {
  const tabOrder = ['home', 'search', 'profile'];

  it('resolves a tab root route', () => {
    expect(resolveTabForRoute('home', tabOrder)).toBe('home');
    expect(resolveTabForRoute('search', tabOrder)).toBe('search');
    expect(resolveTabForRoute('profile', tabOrder)).toBe('profile');
  });

  it('resolves a nested stack route to its tab', () => {
    expect(resolveTabForRoute('home/detail', tabOrder)).toBe('home');
    expect(resolveTabForRoute('home/detail/comments', tabOrder)).toBe('home');
    expect(resolveTabForRoute('profile/settings', tabOrder)).toBe('profile');
  });

  it('returns null for unknown routes', () => {
    expect(resolveTabForRoute('unknown', tabOrder)).toBeNull();
    expect(resolveTabForRoute('settings/detail', tabOrder)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolveTabForRoute('', tabOrder)).toBeNull();
  });
});

describe('findClosestMatch', () => {
  const candidates = ['home', 'search', 'profile', 'home/detail', 'profile/settings'];

  it('finds an exact match', () => {
    expect(findClosestMatch('home', candidates)).toBe('home');
  });

  it('finds a close match with typos', () => {
    expect(findClosestMatch('hme', candidates)).toBe('home');
    expect(findClosestMatch('serch', candidates)).toBe('search');
    expect(findClosestMatch('profle', candidates)).toBe('profile');
  });

  it('returns null for completely unrelated input', () => {
    expect(findClosestMatch('xyzxyzxyzxyz', candidates)).toBeNull();
  });

  it('returns null for empty candidates', () => {
    expect(findClosestMatch('home', [])).toBeNull();
  });

  it('respects maxDistance parameter', () => {
    expect(findClosestMatch('hme', candidates, 1)).toBe('home');
    expect(findClosestMatch('hmee', candidates, 1)).toBeNull();
    expect(findClosestMatch('hmee', candidates, 2)).toBe('home');
  });

  it('finds the closest match among multiple candidates', () => {
    // "hom" is closer to "home" (distance 1) than to "home/detail" (distance 8)
    expect(findClosestMatch('hom', candidates)).toBe('home');
  });
});

describe('getCurrentRouteInfo with screen layer', () => {
  it('returns top screen entry when activeLayer is screens', () => {
    const state: NavigationState = {
      tabs: {
        home: {
          name: 'home',
          stack: [{ id: 'h1', route: 'home', params: {}, timestamp: 1000 }],
          hasBeenActive: true,
        },
      },
      activeTab: 'home',
      tabOrder: ['home'],
      overlays: [],
      badges: {},
      screens: [
        { id: 's1', route: 'login', params: {}, timestamp: 1000 },
        { id: 's2', route: 'login/signup', params: { from: 'login' }, timestamp: 2000 },
      ],
      activeLayer: 'screens',
    };

    const info = getCurrentRouteInfo(state);
    expect(info.route).toBe('login/signup');
    expect(info.params).toEqual({ from: 'login' });
  });

  it('overlay takes priority over screen layer', () => {
    const state: NavigationState = {
      tabs: {
        home: {
          name: 'home',
          stack: [{ id: 'h1', route: 'home', params: {}, timestamp: 1000 }],
          hasBeenActive: true,
        },
      },
      activeTab: 'home',
      tabOrder: ['home'],
      overlays: [{ id: 'o1', route: 'share', params: {}, timestamp: 3000 }],
      badges: {},
      screens: [{ id: 's1', route: 'login', params: {}, timestamp: 1000 }],
      activeLayer: 'screens',
    };

    const info = getCurrentRouteInfo(state);
    expect(info.route).toBe('share');
  });
});

describe('resolveScreenForRoute', () => {
  it('resolves screen name from route', () => {
    expect(resolveScreenForRoute('login', ['login', 'onboarding'])).toBe('login');
    expect(resolveScreenForRoute('login/signup', ['login'])).toBe('login');
  });

  it('returns null for non-screen routes', () => {
    expect(resolveScreenForRoute('home', ['login'])).toBeNull();
    expect(resolveScreenForRoute('home/detail', ['login'])).toBeNull();
  });
});
