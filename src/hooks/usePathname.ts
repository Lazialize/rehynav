import { stripBasePath } from '../core/href.js';
import { getPathFromState } from '../core/matching.js';
import { useController, useRootState } from './internal.js';

/** Returns the current pathname (without the base path or query string). */
export function usePathname(): string {
  const state = useRootState();
  const controller = useController();
  const path = getPathFromState(state).split('?')[0];
  return stripBasePath(path, controller.config.basePath);
}
