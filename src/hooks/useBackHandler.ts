import { useBeforeNavigate } from './useBeforeNavigate.js';

export function useBackHandler(handler: () => boolean): void {
  useBeforeNavigate((_from, _to, direction) => {
    if (direction === 'back') return !handler();
    return true;
  });
}
