import { describe, expect, it } from 'vitest';
import { parseRoutePatterns } from './path-params.js';
import { navigationReducer } from './reducer.js';
import { createInitialState } from './state.js';
import type { NavigationState } from './types.js';
import { stateToUrl, urlToState } from './url.js';

let idCounter = 0;
const createId = () => `id-${++idCounter}`;
const now = () => 1000;
const config = { tabs: ['home', 'search', 'profile'], initialTab: 'home' };

function makeState() {
  idCounter = 0;
  return createInitialState(config, createId, now);
}

describe('stateToUrl', () => {
  it('converts initial state to tab root URL', () => {
    const state = makeState();
    expect(stateToUrl(state)).toBe('/home');
  });

  it('converts state with a pushed route to URL', () => {
    let state = makeState();
    state = navigationReducer(state, {
      type: 'PUSH',
      route: 'home/detail',
      params: {},
      id: 'push-1',
      timestamp: 2000,
    });

    expect(stateToUrl(state)).toBe('/home/detail');
  });

  it('includes params as query string', () => {
    let state = makeState();
    state = navigationReducer(state, {
      type: 'PUSH',
      route: 'home/detail',
      params: { itemId: '42', sortBy: 'new' },
      id: 'push-1',
      timestamp: 2000,
    });

    const url = stateToUrl(state);
    expect(url).toContain('/home/detail?');
    expect(url).toContain('itemId=42');
    expect(url).toContain('sortBy=new');
  });

  it('excludes undefined and null params', () => {
    let state = makeState();
    state = navigationReducer(state, {
      type: 'PUSH',
      route: 'home/detail',
      params: { itemId: '42', optional: undefined, nullable: null },
      id: 'push-1',
      timestamp: 2000,
    });

    const url = stateToUrl(state);
    expect(url).toBe('/home/detail?itemId=42');
  });

  it('uses custom base path', () => {
    const state = makeState();
    expect(stateToUrl(state, '/app/')).toBe('/app/home');
  });

  it('normalizes basePath without trailing slash', () => {
    const state = makeState();
    expect(stateToUrl(state, '/app')).toBe('/app/home');
  });

  it('normalizes basePath with duplicate slashes', () => {
    const state = makeState();
    expect(stateToUrl(state, '/app//')).toBe('/app/home');
  });

  it('normalizes basePath without leading slash', () => {
    const state = makeState();
    expect(stateToUrl(state, 'app')).toBe('/app/home');
  });

  it('normalizes empty basePath', () => {
    const state = makeState();
    expect(stateToUrl(state, '')).toBe('/home');
  });

  it('reflects the active tab top of stack', () => {
    let state = makeState();
    state = navigationReducer(state, { type: 'SWITCH_TAB', tab: 'profile' });

    expect(stateToUrl(state)).toBe('/profile');
  });
});

describe('urlToState', () => {
  it('restores state from a tab root URL', () => {
    idCounter = 0;
    const state = urlToState('/home', config, '/', createId, now);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(1);
    expect(state.tabs.home.hasBeenActive).toBe(true);
  });

  it('restores state from a stack route URL', () => {
    idCounter = 0;
    const state = urlToState('/home/detail', config, '/', createId, now);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/detail');
  });

  it('parses query params', () => {
    idCounter = 0;
    const state = urlToState('/home/detail?itemId=42&sortBy=new', config, '/', createId, now);

    expect(state.tabs.home.stack[1].params).toEqual({
      itemId: '42',
      sortBy: 'new',
    });
  });

  it('applies params to tab root when URL matches tab', () => {
    idCounter = 0;
    const state = urlToState('/search?query=test', config, '/', createId, now);

    expect(state.activeTab).toBe('search');
    expect(state.tabs.search.stack).toHaveLength(1);
    expect(state.tabs.search.stack[0].params).toEqual({ query: 'test' });
  });

  it('falls back to initial tab for unknown routes', () => {
    idCounter = 0;
    const state = urlToState('/unknown', config, '/', createId, now);

    expect(state.activeTab).toBe('home');
  });

  it('handles custom base path', () => {
    idCounter = 0;
    const state = urlToState('/app/home/detail', config, '/app/', createId, now);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/detail');
  });

  it('normalizes basePath without trailing slash', () => {
    idCounter = 0;
    const state = urlToState('/app/home/detail', config, '/app', createId, now);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/detail');
  });

  it('does not strip basePath from partial matches', () => {
    idCounter = 0;
    // basePath is '/app' but URL path is '/application/home' — should NOT strip '/app'
    const state = urlToState('/application/home', config, '/app', createId, now);

    // '/application/home' does not start with '/app/' boundary, so route is unknown
    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(1);
  });

  it('normalizes basePath without leading slash', () => {
    idCounter = 0;
    const state = urlToState('/app/home/detail', config, 'app', createId, now);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/detail');
  });

  it('normalizes empty basePath', () => {
    idCounter = 0;
    const state = urlToState('/home', config, '', createId, now);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(1);
  });

  it('handles empty URL (root)', () => {
    idCounter = 0;
    const state = urlToState('/', config, '/', createId, now);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(1);
  });

  it('initializes all tabs regardless of deep link target', () => {
    idCounter = 0;
    const state = urlToState('/profile/settings', config, '/', createId, now);

    expect(state.activeTab).toBe('profile');
    expect(Object.keys(state.tabs)).toEqual(['home', 'search', 'profile']);
    expect(state.tabs.home.stack).toHaveLength(1);
    expect(state.tabs.search.stack).toHaveLength(1);
  });
});

describe('stateToUrl with routePatterns', () => {
  const patterns = parseRoutePatterns(['home', 'home/post-detail/:postId', 'search', 'profile']);

  it('embeds path params in URL path', () => {
    let state = makeState();
    state = navigationReducer(state, {
      type: 'PUSH',
      route: 'home/post-detail/:postId',
      params: { postId: '42' },
      id: 'push-1',
      timestamp: 2000,
    });

    expect(stateToUrl(state, '/', patterns)).toBe('/home/post-detail/42');
  });

  it('puts non-path params in query string', () => {
    let state = makeState();
    state = navigationReducer(state, {
      type: 'PUSH',
      route: 'home/post-detail/:postId',
      params: { postId: '42', tab: 'comments' },
      id: 'push-1',
      timestamp: 2000,
    });

    const url = stateToUrl(state, '/', patterns);
    expect(url).toBe('/home/post-detail/42?tab=comments');
  });

  it('works normally for routes without path params', () => {
    const state = makeState();
    expect(stateToUrl(state, '/', patterns)).toBe('/home');
  });
});

describe('urlToState with routePatterns', () => {
  const patterns = parseRoutePatterns(['home', 'home/post-detail/:postId', 'search', 'profile']);

  it('extracts path params from URL', () => {
    idCounter = 0;
    const state = urlToState('/home/post-detail/42', config, '/', createId, now, patterns);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/post-detail/:postId');
    expect(state.tabs.home.stack[1].params).toEqual({ postId: '42' });
  });

  it('merges path params with query params', () => {
    idCounter = 0;
    const state = urlToState(
      '/home/post-detail/42?tab=comments',
      config,
      '/',
      createId,
      now,
      patterns,
    );

    expect(state.tabs.home.stack[1].route).toBe('home/post-detail/:postId');
    expect(state.tabs.home.stack[1].params).toEqual({ postId: '42', tab: 'comments' });
  });

  it('falls back to pathname for unknown routes', () => {
    idCounter = 0;
    const state = urlToState('/home/unknown-page', config, '/', createId, now, patterns);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/unknown-page');
  });

  it('handles tab root URLs normally with patterns', () => {
    idCounter = 0;
    const state = urlToState('/home', config, '/', createId, now, patterns);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(1);
  });

  it('handles custom base path with patterns', () => {
    idCounter = 0;
    const state = urlToState('/app/home/post-detail/42', config, '/app/', createId, now, patterns);

    expect(state.activeTab).toBe('home');
    expect(state.tabs.home.stack).toHaveLength(2);
    expect(state.tabs.home.stack[1].route).toBe('home/post-detail/:postId');
    expect(state.tabs.home.stack[1].params).toEqual({ postId: '42' });
  });
});

describe('stateToUrl with screen layer', () => {
  it('returns screen route URL when activeLayer is screens', () => {
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
      screens: [{ id: 's1', route: 'login', params: {}, timestamp: 1000 }],
      activeLayer: 'screens',
    };
    expect(stateToUrl(state, '/')).toBe('/login');
  });

  it('returns tab route URL when activeLayer is tabs', () => {
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
      screens: [],
      activeLayer: 'tabs',
    };
    expect(stateToUrl(state, '/')).toBe('/home');
  });
});

describe('urlToState with screen layer', () => {
  it('creates state with screen layer for screen route URL', () => {
    let counter = 0;
    const createIdLocal = () => `id-${++counter}`;
    const state = urlToState(
      '/login',
      { tabs: ['home'], initialTab: 'home', initialScreen: 'login', screenNames: ['login'] },
      '/',
      createIdLocal,
      () => 1000,
    );
    expect(state.activeLayer).toBe('screens');
    expect(state.screens).toHaveLength(1);
    expect(state.screens[0].route).toBe('login');
  });

  it('creates state with screen stack for deep screen route', () => {
    let counter = 0;
    const createIdLocal = () => `id-${++counter}`;
    const state = urlToState(
      '/login/signup',
      { tabs: ['home'], initialTab: 'home', initialScreen: 'login', screenNames: ['login'] },
      '/',
      createIdLocal,
      () => 1000,
    );
    expect(state.activeLayer).toBe('screens');
    expect(state.screens).toHaveLength(2);
    expect(state.screens[1].route).toBe('login/signup');
  });
});
