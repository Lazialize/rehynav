import { describe, expect, it } from 'vitest';
import { navigationReducer } from './reducer.js';
import { createInitialState } from './state.js';
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
