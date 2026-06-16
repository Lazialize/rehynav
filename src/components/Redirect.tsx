import { useEffect } from 'react';
import type { Href } from '../core/href.js';
import { useController } from '../hooks/internal.js';

export interface RedirectProps {
  href: Href;
}

/**
 * Immediately replaces the current route with `href` on mount. Renders nothing.
 * Useful for redirects inside layouts (e.g. auth gating).
 */
export function Redirect({ href }: RedirectProps): null {
  const controller = useController();
  useEffect(() => {
    controller.replace(href);
  }, [controller, href]);
  return null;
}
