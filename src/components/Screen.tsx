import { useContext, useEffect, useLayoutEffect } from 'react';
import { ScreenRegistryContext } from '../hooks/context.js';
import type { ScreenOptions, ScreenRegistry } from '../store/screen-registry.js';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface ScreenProps {
  name: string;
  component: React.ComponentType<unknown>;
  options?: ScreenOptions;
}

export function Screen({ name, component, options }: ScreenProps): null {
  const registry = useContext(ScreenRegistryContext) as ScreenRegistry | null;
  if (!registry) {
    throw new Error('Screen must be used within NavigationProvider');
  }

  useIsomorphicLayoutEffect(() => {
    registry.register({ route: name, component, options });
    return () => {
      registry.unregister(name);
    };
  }, [registry, name, component, options]);

  return null;
}
