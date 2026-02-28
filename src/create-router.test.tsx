import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { createRouter } from './create-router.js';
import { overlay, stack, tab } from './route-helpers.js';

const HomeScreen: React.FC = () => null;
const SearchScreen: React.FC = () => null;
const ProfileScreen: React.FC = () => null;
const DetailScreen: React.FC = () => null;
const LoginOverlay: React.FC = () => null;
const ActionOverlay: React.FC = () => null;

describe('createRouter', () => {
  it('should accept function-based config and return RouterInstance', () => {
    const router = createRouter({
      tabs: [
        tab('home', HomeScreen, [stack('detail/:id', DetailScreen)]),
        tab('search', SearchScreen),
        tab('profile', ProfileScreen),
      ],
      overlays: [overlay('login', LoginOverlay), overlay('action-sheet', ActionOverlay)],
      initialTab: 'home',
    });

    expect(router.NavigationProvider).toBeDefined();
    expect(router.useNavigation).toBeDefined();
    expect(router.useRoute).toBeDefined();
    expect(router.useTab).toBeDefined();
    expect(router.useOverlay).toBeDefined();
  });

  it('should pre-populate screen registry from config', () => {
    const router = createRouter({
      tabs: [
        tab('home', HomeScreen, [stack('detail/:id', DetailScreen)]),
        tab('search', SearchScreen),
      ],
      overlays: [overlay('login', LoginOverlay)],
      initialTab: 'home',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <router.NavigationProvider>{children}</router.NavigationProvider>
    );

    const { result } = renderHook(() => router.useNavigation(), { wrapper });

    act(() => {
      result.current.push('home/detail/:id', { id: '42' });
    });

    expect(result.current.canGoBack()).toBe(true);
  });

  it('should use array order as tab order', () => {
    const router = createRouter({
      tabs: [tab('profile', ProfileScreen), tab('home', HomeScreen), tab('search', SearchScreen)],
      initialTab: 'home',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <router.NavigationProvider>{children}</router.NavigationProvider>
    );

    const { result } = renderHook(() => router.useTab(), { wrapper });

    expect(result.current.activeTab).toBe('home');
    expect(result.current.tabs).toEqual(['profile', 'home', 'search']);
  });

  it('should auto-generate route patterns for path params', () => {
    const router = createRouter({
      tabs: [tab('home', HomeScreen, [stack('post/:postId', DetailScreen)])],
      initialTab: 'home',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <router.NavigationProvider urlSync>{children}</router.NavigationProvider>
    );

    const { result } = renderHook(() => router.useNavigation(), { wrapper });

    act(() => {
      result.current.push('home/post/:postId', { postId: '123' });
    });

    expect(result.current.canGoBack()).toBe(true);
  });
});
