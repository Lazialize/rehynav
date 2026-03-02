import type React from 'react';
import { useContext } from 'react';
import type { Serializable } from '../core/types.js';
import { RoutePatternsContext } from '../hooks/context.js';
import { useNavigation } from '../hooks/useNavigation.js';

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  params?: Record<string, Serializable>;
  replace?: boolean;
}

function shouldProcessLinkClick(event: React.MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}

export function Link({
  to,
  params,
  replace: shouldReplace,
  onClick,
  target,
  ...rest
}: LinkProps): React.ReactElement {
  const navigation = useNavigation();
  const routePatterns = useContext(RoutePatternsContext);

  let href: string;
  const pattern = routePatterns?.get(to);
  if (pattern && pattern.paramNames.length > 0 && params) {
    const pathParams: Record<string, string> = {};
    for (const name of pattern.paramNames) {
      if (params[name] !== undefined && params[name] !== null) {
        pathParams[name] = String(params[name]);
      }
    }
    href = `/${pattern.toPath(pathParams)}`;
  } else {
    href = `/${to}`;
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);

    if (e.defaultPrevented) return;
    if (!shouldProcessLinkClick(e)) return;
    if (target) return;

    e.preventDefault();
    if (shouldReplace) {
      navigation.replace(to, params);
    } else {
      navigation.push(to, params);
    }
  };

  return (
    <a href={href} onClick={handleClick} target={target} {...rest}>
      {rest.children}
    </a>
  );
}
