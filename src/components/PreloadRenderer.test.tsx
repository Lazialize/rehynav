import { act, render, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { ScreenRegistryContext, type ScreenRegistryForHooks } from '../hooks/context.js';
import { PreloadProvider, usePreloadContext } from './PreloadContext.js';
import { PreloadRenderer } from './PreloadRenderer.js';

function createMockRegistry(
  entries: Record<string, React.ComponentType<any>>,
): ScreenRegistryForHooks {
  const screens = new Map(
    Object.entries(entries).map(([route, component]) => [route, { route, component }]),
  );
  return { screens, get: (route: string) => screens.get(route) } as ScreenRegistryForHooks;
}

describe('PreloadRenderer', () => {
  it('renders preloaded screens in hidden DOM', () => {
    const DetailScreen = () => <div>Detail Content</div>;
    const registry = createMockRegistry({ 'home/detail': DetailScreen });

    const { result } = renderHook(() => usePreloadContext(), {
      wrapper: ({ children }) => (
        <PreloadProvider>
          <ScreenRegistryContext.Provider value={registry}>
            {children}
            <PreloadRenderer />
          </ScreenRegistryContext.Provider>
        </PreloadProvider>
      ),
    });

    act(() => {
      result.current.preload('home/detail', { id: '1' });
    });

    const preloaded = document.querySelector('[data-rehynav-preload]');
    expect(preloaded).not.toBeNull();
    expect(preloaded?.getAttribute('style')).toContain('hidden');
  });

  it('limits concurrent preloads', () => {
    const Screen = () => <div>Screen</div>;
    const registry = createMockRegistry({
      'route-1': Screen,
      'route-2': Screen,
      'route-3': Screen,
      'route-4': Screen,
    });

    const { result } = renderHook(() => usePreloadContext(), {
      wrapper: ({ children }) => (
        <PreloadProvider maxPreloads={3}>
          <ScreenRegistryContext.Provider value={registry}>
            {children}
            <PreloadRenderer />
          </ScreenRegistryContext.Provider>
        </PreloadProvider>
      ),
    });

    act(() => {
      result.current.preload('route-1', {});
      result.current.preload('route-2', {});
      result.current.preload('route-3', {});
      result.current.preload('route-4', {});
    });

    const preloaded = document.querySelectorAll('[data-rehynav-preload]');
    expect(preloaded).toHaveLength(3);
  });
});
