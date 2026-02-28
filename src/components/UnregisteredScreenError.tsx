import { findClosestMatch } from '../core/route-utils.js';
import type { ScreenRegistryForHooks } from '../hooks/context.js';

export interface UnregisteredScreenErrorProps {
  route: string;
  registry: ScreenRegistryForHooks;
}

export function UnregisteredScreenError({
  route,
  registry,
}: UnregisteredScreenErrorProps): React.ReactElement | null {
  const registeredRoutes = Array.from(registry.screens.keys());

  if (process.env.NODE_ENV === 'production') {
    console.error(
      `[rehynav] No Screen registered for route "${route}". Registered: ${registeredRoutes.join(', ')}`,
    );
    return null;
  }

  const suggestion = findClosestMatch(route, registeredRoutes);

  return (
    <div
      style={{
        padding: 20,
        margin: 10,
        backgroundColor: '#fff0f0',
        border: '2px solid #ff4444',
        borderRadius: 8,
        fontFamily: 'monospace',
        color: '#cc0000',
      }}
    >
      <h3 style={{ margin: '0 0 8px 0' }}>No Screen registered for route</h3>
      <p style={{ margin: '0 0 8px 0' }}>
        Route: <strong>{route}</strong>
      </p>
      {suggestion && (
        <p style={{ margin: '0 0 8px 0' }}>
          Did you mean: <strong>{suggestion}</strong>?
        </p>
      )}
      <details>
        <summary>Registered screens ({registeredRoutes.length})</summary>
        <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
          {registeredRoutes.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
