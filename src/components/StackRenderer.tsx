import type { StackEntry } from '../core/types.js';
import { RouteContext, useScreenRegistry } from '../hooks/context.js';
import { UnregisteredScreenError } from './UnregisteredScreenError.js';

export interface StackRendererProps {
  stack: StackEntry[];
}

export function StackRenderer({ stack }: StackRendererProps): React.ReactElement {
  const registry = useScreenRegistry();

  return (
    <>
      {stack.map((entry, index) => {
        const isTop = index === stack.length - 1;
        const registration = registry.get(entry.route);

        return (
          <div
            key={entry.id}
            data-stack-index={index}
            data-route={entry.route}
            data-route-type="stack"
            style={{ display: isTop ? 'block' : 'none' }}
          >
            <RouteContext.Provider value={{ route: entry.route, params: entry.params }}>
              {registration ? (
                <registration.component params={entry.params} />
              ) : (
                <UnregisteredScreenError route={entry.route} registry={registry} />
              )}
            </RouteContext.Provider>
          </div>
        );
      })}
    </>
  );
}
