import type React from 'react';
import { useContext } from 'react';
import type { Serializable } from '../core/types.js';
import { RoutePatternsContext } from '../hooks/context.js';
import { useNavigation } from '../hooks/useNavigation.js';

export interface LinkProps {
  to: string;
  params?: Record<string, Serializable>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  replace?: boolean;
}

export function Link({
  to,
  params,
  children,
  className,
  style,
  replace: shouldReplace,
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
    e.preventDefault();
    if (shouldReplace) {
      navigation.replace(to, params);
    } else {
      navigation.push(to, params);
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className} style={style}>
      {children}
    </a>
  );
}
