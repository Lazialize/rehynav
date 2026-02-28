import { RouteContext, useScreenRegistry } from '../hooks/context.js';
import { useNavigationSelector } from '../hooks/useNavigationSelector.js';
import { UnregisteredScreenError } from './UnregisteredScreenError.js';

export function OverlayRenderer(): React.ReactElement {
  const overlays = useNavigationSelector((s) => s.overlays);
  const registry = useScreenRegistry();

  return (
    <>
      {overlays.map((overlay) => {
        const registration = registry.get(overlay.route);

        return (
          <div key={overlay.id} data-route-type="overlay" className="rehynav-overlay">
            <RouteContext.Provider
              value={{ route: overlay.route, params: overlay.params, entryId: overlay.id }}
            >
              {registration ? (
                <registration.component params={overlay.params} />
              ) : (
                <UnregisteredScreenError route={overlay.route} registry={registry} />
              )}
            </RouteContext.Provider>
          </div>
        );
      })}
    </>
  );
}
