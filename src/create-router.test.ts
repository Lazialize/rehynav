import { describe, expect, it } from 'vitest';
import { createRouter } from './create-router.js';
import { screen, screens, tab, tabs } from './route-helpers.js';

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
});
