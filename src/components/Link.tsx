import type React from 'react';
import { useNavigation } from '../hooks/useNavigation.js';

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  replace?: boolean;
}

function shouldProcessLinkClick(event: React.MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}

export function Link({
  to,
  replace: shouldReplace,
  onClick,
  target,
  ...rest
}: LinkProps): React.ReactElement {
  const navigation = useNavigation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);

    if (e.defaultPrevented) return;
    if (!shouldProcessLinkClick(e)) return;
    if (target) return;

    e.preventDefault();
    if (shouldReplace) {
      navigation.replace(to);
    } else {
      navigation.push(to);
    }
  };

  return (
    <a {...rest} href={to} onClick={handleClick} target={target}>
      {rest.children}
    </a>
  );
}
