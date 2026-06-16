import { useMemo } from 'react';
import type { Href } from '../core/href.js';
import type { Params } from '../core/types.js';
import { useController } from './internal.js';

/** Lower-level navigation API, with a `goBack` alias familiar to React Navigation users. */
export interface NavigationApi {
  navigate(href: Href, params?: Params): void;
  push(href: Href, params?: Params): void;
  replace(href: Href, params?: Params): void;
  goBack(): void;
  canGoBack(): boolean;
  setParams(params: Params): void;
}

/**
 * Returns a stable navigation object. Equivalent to {@link useRouter} but with a
 * `goBack` method, for users coming from React Navigation.
 */
export function useNavigation(): NavigationApi {
  const controller = useController();
  return useMemo<NavigationApi>(
    () => ({
      navigate: (href, params) => controller.navigate(href, params),
      push: (href, params) => controller.push(href, params),
      replace: (href, params) => controller.replace(href, params),
      goBack: () => controller.back(),
      canGoBack: () => controller.canGoBack(),
      setParams: (params) => controller.setParams(params),
    }),
    [controller],
  );
}
