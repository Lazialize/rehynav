import { type AnchorHTMLAttributes, type MouseEvent, type ReactElement, useMemo } from 'react';
import { type Href, resolveHref, withBasePath } from '../core/href.js';
import { useController } from '../hooks/internal.js';

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: Href;
  /** Replace the current entry instead of pushing a new one. */
  replace?: boolean;
  /** Always push a new entry, even for the same screen. */
  push?: boolean;
}

function isModifiedEvent(event: MouseEvent): boolean {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

/**
 * Declarative navigation link. Renders an `<a>` with a real `href` (for
 * accessibility and middle-click) and performs client-side navigation on click.
 */
export function Link({ href, replace, push, onClick, ...rest }: LinkProps): ReactElement {
  const controller = useController();
  const url = useMemo(
    () => withBasePath(resolveHref(href), controller.config.basePath),
    [href, controller.config.basePath],
  );

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || isModifiedEvent(event) || event.button !== 0) return;
    event.preventDefault();
    if (replace) controller.replace(href);
    else if (push) controller.push(href);
    else controller.navigate(href);
  };

  return <a href={url} onClick={handleClick} {...rest} />;
}
