import { Suspense } from 'react';
import type { StackEntry } from '../core/types.js';
import { RouteContext, useScreenRegistry } from '../hooks/context.js';
import { useErrorFallback } from './ErrorFallbackContext.js';
import { RouteErrorBoundary } from './RouteErrorBoundary.js';
import { useSuspenseFallback } from './SuspenseFallbackContext.js';
import { UnregisteredScreenError } from './UnregisteredScreenError.js';

export interface ScreenRendererProps {
  screens: StackEntry[];
}

export function ScreenRenderer({ screens }: ScreenRendererProps): React.ReactElement {
  const registry = useScreenRegistry();
  const suspenseFallback = useSuspenseFallback();
  const errorFallback = useErrorFallback();

  return (
    <>
      {screens.map((entry, index) => {
        const isTop = index === screens.length - 1;
        const registration = registry.get(entry.route);

        return (
          <div
            key={entry.id}
            data-screen-index={index}
            data-route={entry.route}
            data-route-type="screen"
            style={{ display: isTop ? 'block' : 'none' }}
          >
            <RouteContext.Provider
              value={{ route: entry.route, params: entry.params, entryId: entry.id }}
            >
              <RouteErrorBoundary route={entry.route} fallback={errorFallback}>
                <Suspense fallback={suspenseFallback}>
                  {registration ? (
                    <registration.component params={entry.params} />
                  ) : (
                    <UnregisteredScreenError route={entry.route} registry={registry} />
                  )}
                </Suspense>
              </RouteErrorBoundary>
            </RouteContext.Provider>
          </div>
        );
      })}
    </>
  );
}
