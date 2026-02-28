import type React from 'react';
import type { Serializable } from '../core/types.js';
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

  const href = `/${to}`;

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
