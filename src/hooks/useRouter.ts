import { useMemo } from 'react';
import type { Href } from '../core/href.js';
import type { Params } from '../core/types.js';
import { useController } from './internal.js';

/** Imperative navigation API returned by {@link useRouter}. */
export interface RouterApi {
  /** Navigates to `href`, reusing an existing entry of the same screen if present. */
  navigate(href: Href, params?: Params): void;
  /** Pushes a new entry onto the active stack. */
  push(href: Href, params?: Params): void;
  /** Replaces the top entry of the active stack. */
  replace(href: Href, params?: Params): void;
  /** Goes back one step in the deepest active stack. */
  back(): void;
  /** Whether a back navigation would change anything. */
  canGoBack(): boolean;
  /** Merges params into the currently focused route. */
  setParams(params: Params): void;
}

/**
 * Returns a stable imperative navigation API, equivalent to Expo Router's
 * `useRouter()`.
 */
export function useRouter(): RouterApi {
  const controller = useController();
  return useMemo<RouterApi>(
    () => ({
      navigate: (href, params) => controller.navigate(href, params),
      push: (href, params) => controller.push(href, params),
      replace: (href, params) => controller.replace(href, params),
      back: () => controller.back(),
      canGoBack: () => controller.canGoBack(),
      setParams: (params) => controller.setParams(params),
    }),
    [controller],
  );
}
