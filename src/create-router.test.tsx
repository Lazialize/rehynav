import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createRouter } from './create-router.js';
import type { RouteMap } from './types/routes.js';

interface TestRoutes extends RouteMap {
  tabs: {
    home: Record<string, never>;
    search: { query?: string };
    profile: Record<string, never>;
  };
  stacks: {
    'home/detail': { id: string };
  };
  modals: {
    login: Record<string, never>;
  };
  sheets: {
    'action-sheet': { title: string };
  };
}

describe('createRouter', () => {
  it('should return all hooks and NavigationProvider', () => {
    const router = createRouter<TestRoutes>({
      tabs: ['home', 'search', 'profile'],
      initialTab: 'home',
    });

    expect(router.NavigationProvider).toBeDefined();
    expect(typeof router.NavigationProvider).toBe('function');
    expect(router.useNavigation).toBeDefined();
    expect(router.useRoute).toBeDefined();
    expect(router.useTab).toBeDefined();
    expect(router.useModal).toBeDefined();
    expect(router.useSheet).toBeDefined();
    expect(router.useBeforeNavigate).toBeDefined();
    expect(router.useBackHandler).toBeDefined();
  });

  describe('NavigationProvider', () => {
    it('should provide context so hooks work', () => {
      const router = createRouter<TestRoutes>({
        tabs: ['home', 'search', 'profile'],
        initialTab: 'home',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <router.NavigationProvider>{children}</router.NavigationProvider>
      );

      const { result } = renderHook(() => router.useNavigation(), { wrapper });

      expect(result.current.push).toBeDefined();
      expect(result.current.pop).toBeDefined();
      expect(result.current.goBack).toBeDefined();
      expect(result.current.canGoBack()).toBe(false);
    });

    it('should use initialTab correctly', () => {
      const router = createRouter<TestRoutes>({
        tabs: ['home', 'search', 'profile'],
        initialTab: 'search',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <router.NavigationProvider>{children}</router.NavigationProvider>
      );

      const { result } = renderHook(() => router.useTab(), { wrapper });

      expect(result.current.activeTab).toBe('search');
      expect(result.current.tabs).toEqual(['home', 'search', 'profile']);
    });

    it('should call onStateChange when state changes', () => {
      const onStateChange = vi.fn();
      const router = createRouter<TestRoutes>({
        tabs: ['home', 'search', 'profile'],
        initialTab: 'home',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <router.NavigationProvider onStateChange={onStateChange}>
          {children}
        </router.NavigationProvider>
      );

      const { result } = renderHook(() => router.useNavigation(), { wrapper });

      act(() => {
        result.current.push('home/detail', { id: '42' });
      });

      expect(onStateChange).toHaveBeenCalledTimes(1);
      const newState = onStateChange.mock.calls[0][0];
      expect(newState.tabs.home.stack).toHaveLength(2);
    });
  });

  describe('useRoute hook via createRouter', () => {
    it('should be exposed by the router', () => {
      const router = createRouter<TestRoutes>({
        tabs: ['home', 'search', 'profile'],
        initialTab: 'home',
      });

      expect(typeof router.useRoute).toBe('function');
    });
  });

  describe('useModal hook via createRouter', () => {
    it('should open and close modals', () => {
      const router = createRouter<TestRoutes>({
        tabs: ['home', 'search', 'profile'],
        initialTab: 'home',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <router.NavigationProvider>{children}</router.NavigationProvider>
      );

      const { result } = renderHook(() => router.useModal(), { wrapper });

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.open('login');
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.current).toBe('login');

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('useSheet hook via createRouter', () => {
    it('should open and close sheets', () => {
      const router = createRouter<TestRoutes>({
        tabs: ['home', 'search', 'profile'],
        initialTab: 'home',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <router.NavigationProvider>{children}</router.NavigationProvider>
      );

      const { result } = renderHook(() => router.useSheet(), { wrapper });

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.open('action-sheet', { title: 'Hello' });
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.current).toBe('action-sheet');
    });
  });

  describe('navigation flow', () => {
    it('should support push and pop navigation', () => {
      const router = createRouter<TestRoutes>({
        tabs: ['home', 'search', 'profile'],
        initialTab: 'home',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <router.NavigationProvider>{children}</router.NavigationProvider>
      );

      const { result } = renderHook(() => router.useNavigation(), { wrapper });

      expect(result.current.canGoBack()).toBe(false);

      act(() => {
        result.current.push('home/detail', { id: '1' });
      });

      expect(result.current.canGoBack()).toBe(true);

      act(() => {
        result.current.pop();
      });

      expect(result.current.canGoBack()).toBe(false);
    });

    it('should support tab switching', () => {
      const router = createRouter<TestRoutes>({
        tabs: ['home', 'search', 'profile'],
        initialTab: 'home',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <router.NavigationProvider>{children}</router.NavigationProvider>
      );

      const { result } = renderHook(() => router.useTab(), { wrapper });

      expect(result.current.activeTab).toBe('home');

      act(() => {
        result.current.switchTab('search');
      });

      expect(result.current.activeTab).toBe('search');
    });
  });
});
