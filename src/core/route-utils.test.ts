import { describe, expect, it } from 'vitest';
import { findClosestMatch, resolveTabForRoute } from './route-utils.js';

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
