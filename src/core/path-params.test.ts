import { describe, expect, it } from 'vitest';
import { matchUrl, parseRoutePatterns } from './path-params.js';

describe('parseRoutePatterns', () => {
  it('parses a route with one path param', () => {
    const patterns = parseRoutePatterns(['home/post-detail/:postId']);
    const pattern = patterns.get('home/post-detail/:postId');

    expect(pattern).toBeDefined();
    expect(pattern!.paramNames).toEqual(['postId']);
    expect(pattern!.regex.test('home/post-detail/42')).toBe(true);
    expect(pattern!.regex.test('home/post-detail/')).toBe(false);
    expect(pattern!.regex.test('home/post-detail')).toBe(false);
    expect(pattern!.toPath({ postId: '42' })).toBe('home/post-detail/42');
  });

  it('parses a route with multiple path params', () => {
    const patterns = parseRoutePatterns(['home/:userId/post/:postId']);
    const pattern = patterns.get('home/:userId/post/:postId');

    expect(pattern).toBeDefined();
    expect(pattern!.paramNames).toEqual(['userId', 'postId']);
    expect(pattern!.regex.test('home/abc/post/123')).toBe(true);
    expect(pattern!.toPath({ userId: 'abc', postId: '123' })).toBe('home/abc/post/123');
  });

  it('handles routes without path params', () => {
    const patterns = parseRoutePatterns(['home/detail']);
    const pattern = patterns.get('home/detail');

    expect(pattern).toBeDefined();
    expect(pattern!.paramNames).toEqual([]);
    expect(pattern!.regex.test('home/detail')).toBe(true);
    expect(pattern!.regex.test('home/detail/extra')).toBe(false);
    expect(pattern!.toPath({})).toBe('home/detail');
  });

  it('handles tab root routes', () => {
    const patterns = parseRoutePatterns(['home']);
    const pattern = patterns.get('home');

    expect(pattern).toBeDefined();
    expect(pattern!.paramNames).toEqual([]);
    expect(pattern!.regex.test('home')).toBe(true);
    expect(pattern!.toPath({})).toBe('home');
  });

  it('parses multiple routes', () => {
    const patterns = parseRoutePatterns([
      'home',
      'home/post-detail/:postId',
      'profile',
      'profile/settings',
    ]);

    expect(patterns.size).toBe(4);
    expect(patterns.get('home')).toBeDefined();
    expect(patterns.get('home/post-detail/:postId')).toBeDefined();
    expect(patterns.get('profile')).toBeDefined();
    expect(patterns.get('profile/settings')).toBeDefined();
  });

  it('escapes special regex characters in literal segments', () => {
    const patterns = parseRoutePatterns(['home/my.page/:id']);
    const pattern = patterns.get('home/my.page/:id');

    expect(pattern!.regex.test('home/my.page/42')).toBe(true);
    expect(pattern!.regex.test('home/myXpage/42')).toBe(false);
  });

  it('handles path param at the beginning of a route', () => {
    const patterns = parseRoutePatterns([':tab/detail']);
    const pattern = patterns.get(':tab/detail');

    expect(pattern!.paramNames).toEqual(['tab']);
    expect(pattern!.regex.test('home/detail')).toBe(true);
    expect(pattern!.toPath({ tab: 'home' })).toBe('home/detail');
  });
});

describe('matchUrl', () => {
  it('matches a URL with path params', () => {
    const patterns = parseRoutePatterns(['home/post-detail/:postId']);
    const result = matchUrl('home/post-detail/42', patterns);

    expect(result).toEqual({
      route: 'home/post-detail/:postId',
      params: { postId: '42' },
    });
  });

  it('matches a URL without path params', () => {
    const patterns = parseRoutePatterns(['home/detail']);
    const result = matchUrl('home/detail', patterns);

    expect(result).toEqual({
      route: 'home/detail',
      params: {},
    });
  });

  it('returns null for unmatched URLs', () => {
    const patterns = parseRoutePatterns(['home/post-detail/:postId']);
    const result = matchUrl('profile/settings', patterns);

    expect(result).toBeNull();
  });

  it('matches the correct pattern when multiple exist', () => {
    const patterns = parseRoutePatterns(['home', 'home/post-detail/:postId', 'home/settings']);

    expect(matchUrl('home', patterns)).toEqual({
      route: 'home',
      params: {},
    });

    expect(matchUrl('home/post-detail/42', patterns)).toEqual({
      route: 'home/post-detail/:postId',
      params: { postId: '42' },
    });

    expect(matchUrl('home/settings', patterns)).toEqual({
      route: 'home/settings',
      params: {},
    });
  });

  it('extracts multiple path params', () => {
    const patterns = parseRoutePatterns(['home/:userId/post/:postId']);
    const result = matchUrl('home/abc/post/123', patterns);

    expect(result).toEqual({
      route: 'home/:userId/post/:postId',
      params: { userId: 'abc', postId: '123' },
    });
  });

  it('handles URL-encoded param values', () => {
    const patterns = parseRoutePatterns(['search/:query']);
    const result = matchUrl('search/hello%20world', patterns);

    expect(result).toEqual({
      route: 'search/:query',
      params: { query: 'hello%20world' },
    });
  });

  it('prefers exact match over parameterized match', () => {
    const patterns = parseRoutePatterns(['home/settings', 'home/:postId']);

    expect(matchUrl('home/settings', patterns)).toEqual({
      route: 'home/settings',
      params: {},
    });

    expect(matchUrl('home/42', patterns)).toEqual({
      route: 'home/:postId',
      params: { postId: '42' },
    });
  });
});
