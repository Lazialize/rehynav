import type React from 'react';
import { createContext, useContext } from 'react';
import type { ErrorFallbackProps } from '../types/props.js';

export const ErrorFallbackContext: React.Context<
  React.ComponentType<ErrorFallbackProps> | undefined
> = createContext<React.ComponentType<ErrorFallbackProps> | undefined>(undefined);

export function useErrorFallback(): React.ComponentType<ErrorFallbackProps> | undefined {
  return useContext(ErrorFallbackContext);
}
