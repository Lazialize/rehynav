import { createContext, useContext } from 'react';

export const SuspenseFallbackContext: React.Context<React.ReactNode> =
  createContext<React.ReactNode>(null);

export function useSuspenseFallback(): React.ReactNode {
  return useContext(SuspenseFallbackContext);
}
