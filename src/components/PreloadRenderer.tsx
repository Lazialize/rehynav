import { Suspense } from 'react';
import { RouteContext, useScreenRegistry } from '../hooks/context.js';
import { usePreloadContext } from './PreloadContext.js';

export function PreloadRenderer(): React.ReactElement {
  const { entries } = usePreloadContext();
  const registry = useScreenRegistry();

  return (
    <>
      {entries.map((entry) => {
        const registration = registry.get(entry.route);
        if (!registration) return null;

        return (
          <div
            key={entry.id}
            data-rehynav-preload={entry.route}
            style={{ visibility: 'hidden', position: 'absolute', pointerEvents: 'none' }}
          >
            <RouteContext.Provider
              value={{ route: entry.route, params: entry.params, entryId: entry.id }}
            >
              <Suspense fallback={null}>
                <registration.component params={entry.params} />
              </Suspense>
            </RouteContext.Provider>
          </div>
        );
      })}
    </>
  );
}
