import { Suspense } from 'react';
import { RouteContext, useScreenRegistry } from '../hooks/context.js';
import { useNavigationSelector } from '../hooks/useNavigationSelector.js';
import { useErrorFallback } from './ErrorFallbackContext.js';
import { RouteErrorBoundary } from './RouteErrorBoundary.js';
import { useSuspenseFallback } from './SuspenseFallbackContext.js';
import { UnregisteredScreenError } from './UnregisteredScreenError.js';

export function OverlayRenderer(): React.ReactElement {
  const overlays = useNavigationSelector((s) => s.overlays);
  const registry = useScreenRegistry();
  const suspenseFallback = useSuspenseFallback();
  const errorFallback = useErrorFallback();

  return (
    <>
      {overlays.map((overlay) => {
        const registration = registry.get(overlay.route);

        return (
          <div key={overlay.id} data-route-type="overlay" className="rehynav-overlay">
            <RouteContext.Provider
              value={{ route: overlay.route, params: overlay.params, entryId: overlay.id }}
            >
              <RouteErrorBoundary route={overlay.route} fallback={errorFallback}>
                <Suspense fallback={suspenseFallback}>
                  {registration ? (
                    <registration.component params={overlay.params} />
                  ) : (
                    <UnregisteredScreenError route={overlay.route} registry={registry} />
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
