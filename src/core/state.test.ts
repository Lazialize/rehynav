import { describe, expect, it } from 'vitest';
import { createInitialState } from './state.js';

const mockNow = () => 1000;

describe('createInitialState', () => {
  it('creates state with all tabs initialized', () => {
    let counter = 0;
    const createId = () => `id-${++counter}`;
    const state = createInitialState(
      { tabs: ['home', 'search', 'profile'], initialTab: 'home' },
      createId,
      mockNow,
    );

    expect(state.tabOrder).toEqual(['home', 'search', 'profile']);
    expect(state.activeTab).toBe('home');
    expect(state.overlays).toEqual([]);
    expect(state.badges).toEqual({});
  });

  it('creates each tab with a root stack entry', () => {
    let counter = 0;
    const createId = () => `id-${++counter}`;
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      createId,
      mockNow,
    );

    const homeTab = state.tabs.home;
    expect(homeTab.name).toBe('home');
    expect(homeTab.stack).toHaveLength(1);
    expect(homeTab.stack[0]).toEqual({
      id: 'id-1',
      route: 'home',
      params: {},
      timestamp: 1000,
    });

    const searchTab = state.tabs.search;
    expect(searchTab.name).toBe('search');
    expect(searchTab.stack).toHaveLength(1);
    expect(searchTab.stack[0]).toEqual({
      id: 'id-2',
      route: 'search',
      params: {},
      timestamp: 1000,
    });
  });

  it('sets hasBeenActive only for the initial tab', () => {
    let counter = 0;
    const createId = () => `id-${++counter}`;
    const state = createInitialState(
      { tabs: ['home', 'search', 'profile'], initialTab: 'search' },
      createId,
      mockNow,
    );

    expect(state.tabs.home.hasBeenActive).toBe(false);
    expect(state.tabs.search.hasBeenActive).toBe(true);
    expect(state.tabs.profile.hasBeenActive).toBe(false);
  });

  it('uses injected createId and now functions', () => {
    let ts = 100;
    const customNow = () => {
      const val = ts;
      ts += 50;
      return val;
    };

    let idCounter = 0;
    const customCreateId = () => `custom-${++idCounter}`;

    const state = createInitialState(
      { tabs: ['a', 'b'], initialTab: 'a' },
      customCreateId,
      customNow,
    );

    expect(state.tabs.a.stack[0].id).toBe('custom-1');
    expect(state.tabs.a.stack[0].timestamp).toBe(100);
    expect(state.tabs.b.stack[0].id).toBe('custom-2');
    expect(state.tabs.b.stack[0].timestamp).toBe(150);
  });
});

describe('createInitialState with screens', () => {
  it('creates state with empty screens and activeLayer tabs when no initialScreen', () => {
    let counter = 0;
    const createId = () => `id-${++counter}`;
    const state = createInitialState(
      { tabs: ['home', 'search'], initialTab: 'home' },
      createId,
      mockNow,
    );

    expect(state.screens).toEqual([]);
    expect(state.activeLayer).toBe('tabs');
  });

  it('creates state with screen root entry when initialScreen is provided', () => {
    let counter = 0;
    const createId = () => `id-${++counter}`;
    const state = createInitialState(
      {
        tabs: ['home', 'search'],
        initialTab: 'home',
        initialScreen: 'login',
        screenNames: ['login'],
      },
      createId,
      mockNow,
    );

    expect(state.screens).toHaveLength(1);
    expect(state.screens[0].route).toBe('login');
    expect(state.activeLayer).toBe('screens');
  });

  it('still creates all tabs when initialScreen is provided', () => {
    let counter = 0;
    const createId = () => `id-${++counter}`;
    const state = createInitialState(
      {
        tabs: ['home', 'search'],
        initialTab: 'home',
        initialScreen: 'login',
        screenNames: ['login'],
      },
      createId,
      mockNow,
    );

    expect(state.tabOrder).toEqual(['home', 'search']);
    expect(state.tabs.home).toBeDefined();
    expect(state.tabs.search).toBeDefined();
    expect(state.activeTab).toBe('home');
  });
});
