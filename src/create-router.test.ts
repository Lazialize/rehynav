import { afterEach, describe, expect, it, vi } from 'vitest';
import * as validation from './core/validation.js';
import { createRouter } from './create-router.js';
import { overlay, screen, screens, stack, tab, tabs } from './route-helpers.js';

const Stub = () => null;

function makeTabs() {
  return tabs([tab('home', Stub), tab('search', Stub), tab('profile', Stub)], {
    initialTab: 'home',
  });
}

function makeScreens(options?: { initialScreen?: string }) {
  return screens([screen('login', Stub), screen('onboarding', Stub)], options);
}

describe('createRouter validation', () => {
  describe('initialTab validation', () => {
    it('throws when initialTab does not match any defined tab', () => {
      const tabsLayer = tabs([tab('home', Stub), tab('search', Stub)], {
        initialTab: 'profile',
      });

      expect(() => createRouter([tabsLayer])).toThrow(/initialTab/);
    });

    it('includes the invalid tab name in the error message', () => {
      const tabsLayer = tabs([tab('home', Stub), tab('search', Stub)], {
        initialTab: 'profile',
      });

      expect(() => createRouter([tabsLayer])).toThrow(/profile/);
    });

    it('suggests a close match when initialTab is a typo', () => {
      const tabsLayer = tabs([tab('home', Stub), tab('search', Stub)], {
        initialTab: 'hme',
      });

      expect(() => createRouter([tabsLayer])).toThrow(/home/);
    });

    it('does not suggest when input is completely unrelated', () => {
      const tabsLayer = tabs([tab('home', Stub), tab('search', Stub)], {
        initialTab: 'xyz',
      });

      expect(() => createRouter([tabsLayer])).toThrow(/initialTab/);
      expect(() => createRouter([tabsLayer])).not.toThrow(/Did you mean/);
    });

    it('does not throw when initialTab matches a defined tab', () => {
      expect(() => createRouter([makeTabs()])).not.toThrow();
    });
  });

  describe('initialScreen validation', () => {
    it('throws when initialScreen does not match any defined screen', () => {
      const screensLayer = makeScreens({ initialScreen: 'signup' });

      expect(() => createRouter([makeTabs(), screensLayer])).toThrow(/initialScreen/);
    });

    it('includes the invalid screen name in the error message', () => {
      const screensLayer = makeScreens({ initialScreen: 'signup' });

      expect(() => createRouter([makeTabs(), screensLayer])).toThrow(/signup/);
    });

    it('suggests a close match when initialScreen is a typo', () => {
      const screensLayer = makeScreens({ initialScreen: 'logn' });

      expect(() => createRouter([makeTabs(), screensLayer])).toThrow(/login/);
    });

    it('does not suggest when input is completely unrelated', () => {
      const screensLayer = makeScreens({ initialScreen: 'xyz' });

      expect(() => createRouter([makeTabs(), screensLayer])).toThrow(/initialScreen/);
      expect(() => createRouter([makeTabs(), screensLayer])).not.toThrow(/Did you mean/);
    });

    it('does not throw when initialScreen matches a defined screen', () => {
      const screensLayer = makeScreens({ initialScreen: 'login' });

      expect(() => createRouter([makeTabs(), screensLayer])).not.toThrow();
    });

    it('does not throw when initialScreen is not specified', () => {
      const screensLayer = makeScreens();

      expect(() => createRouter([makeTabs(), screensLayer])).not.toThrow();
    });
  });

  describe('duplicate route name validation', () => {
    it('throws when two tabs share the same name', () => {
      const tabsLayer = tabs([tab('home', Stub), tab('home', Stub)], {
        initialTab: 'home',
      });

      expect(() => createRouter([tabsLayer])).toThrow(/duplicate route/i);
      expect(() => createRouter([tabsLayer])).toThrow(/home/);
    });

    it('throws when a tab name conflicts with an overlay name', () => {
      const tabsLayer = tabs([tab('home', Stub), tab('search', Stub)], {
        initialTab: 'home',
      });
      const overlayDef = overlay('home', Stub);

      expect(() => createRouter([tabsLayer, overlayDef])).toThrow(/duplicate route/i);
      expect(() => createRouter([tabsLayer, overlayDef])).toThrow(/home/);
    });

    it('throws when a tab name conflicts with a screen name', () => {
      const tabsLayer = tabs([tab('home', Stub), tab('search', Stub)], {
        initialTab: 'home',
      });
      const screensLayer = screens([screen('home', Stub)]);

      expect(() => createRouter([tabsLayer, screensLayer])).toThrow(/duplicate route/i);
      expect(() => createRouter([tabsLayer, screensLayer])).toThrow(/home/);
    });

    it('throws when duplicate stack routes exist within the same tab', () => {
      const tabsLayer = tabs(
        [tab('home', Stub, [stack('detail', Stub), stack('detail', Stub)]), tab('search', Stub)],
        { initialTab: 'home' },
      );

      expect(() => createRouter([tabsLayer])).toThrow(/duplicate route/i);
      expect(() => createRouter([tabsLayer])).toThrow(/home\/detail/);
    });

    it('throws when a tab stack route conflicts with an overlay name', () => {
      const tabsLayer = tabs([tab('home', Stub, [stack('modal', Stub)]), tab('search', Stub)], {
        initialTab: 'home',
      });
      const overlayDef = overlay('home/modal', Stub);

      expect(() => createRouter([tabsLayer, overlayDef])).toThrow(/duplicate route/i);
      expect(() => createRouter([tabsLayer, overlayDef])).toThrow(/home\/modal/);
    });

    it('throws when duplicate stack routes exist within the same screen', () => {
      const tabsLayer = makeTabs();
      const screensLayer = screens([
        screen('login', Stub, [stack('step', Stub), stack('step', Stub)]),
      ]);

      expect(() => createRouter([tabsLayer, screensLayer])).toThrow(/duplicate route/i);
      expect(() => createRouter([tabsLayer, screensLayer])).toThrow(/login\/step/);
    });

    it('throws when two overlays share the same name', () => {
      const tabsLayer = makeTabs();
      const modal1 = overlay('modal', Stub);
      const modal2 = overlay('modal', Stub);

      expect(() => createRouter([tabsLayer, modal1, modal2])).toThrow(/duplicate route/i);
      expect(() => createRouter([tabsLayer, modal1, modal2])).toThrow(/modal/);
    });

    it('throws when two screens share the same name', () => {
      const tabsLayer = makeTabs();
      const screensLayer = screens([screen('login', Stub), screen('login', Stub)]);

      expect(() => createRouter([tabsLayer, screensLayer])).toThrow(/duplicate route/i);
      expect(() => createRouter([tabsLayer, screensLayer])).toThrow(/login/);
    });

    it('throws when an overlay conflicts with a screen name', () => {
      const tabsLayer = makeTabs();
      const screensLayer = screens([screen('login', Stub)]);
      const overlayDef = overlay('login', Stub);

      expect(() => createRouter([tabsLayer, screensLayer, overlayDef])).toThrow(/duplicate route/i);
      expect(() => createRouter([tabsLayer, screensLayer, overlayDef])).toThrow(/login/);
    });

    it('includes conflicting categories in the error message', () => {
      const tabsLayer = tabs([tab('home', Stub), tab('search', Stub)], {
        initialTab: 'home',
      });
      const overlayDef = overlay('home', Stub);

      expect(() => createRouter([tabsLayer, overlayDef])).toThrow(/tab/i);
      expect(() => createRouter([tabsLayer, overlayDef])).toThrow(/overlay/i);
    });

    it('does not throw when all route names are unique', () => {
      const tabsLayer = tabs([tab('home', Stub, [stack('detail', Stub)]), tab('search', Stub)], {
        initialTab: 'home',
      });
      const screensLayer = screens([screen('login', Stub)]);
      const overlayDef = overlay('modal', Stub);

      expect(() => createRouter([tabsLayer, screensLayer, overlayDef])).not.toThrow();
    });
  });

  describe('stack route validation', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      vi.restoreAllMocks();
    });

    it('calls validateStackRoutes with parsed stack routes and tab names', () => {
      process.env.NODE_ENV = 'development';
      const spy = vi.spyOn(validation, 'validateStackRoutes');

      const tabsLayer = tabs(
        [tab('home', Stub, [stack('detail', Stub)]), tab('search', Stub, [stack('results', Stub)])],
        { initialTab: 'home' },
      );

      createRouter([tabsLayer]);

      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          'home/detail': expect.anything(),
          'search/results': expect.anything(),
        }),
        ['home', 'search'],
      );
    });
  });
});
