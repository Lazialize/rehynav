import { useGlobalSearchParams, usePathname, useRootNavigationState, useSegments } from 'rehynav';

export default function Probes() {
  const pathname = usePathname();
  const segments = useSegments();
  const params = useGlobalSearchParams();
  const state = useRootNavigationState();

  return (
    <div className="screen" style={{ padding: 16 }}>
      <h1>Navigation probes</h1>
      <dl>
        <dt>usePathname()</dt>
        <dd>{pathname}</dd>
        <dt>useSegments()</dt>
        <dd>[{segments.join(', ')}]</dd>
        <dt>useGlobalSearchParams()</dt>
        <dd>{JSON.stringify(params)}</dd>
      </dl>
      <pre style={{ background: '#f5f5f5', padding: 12, overflow: 'auto', fontSize: 12 }}>
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
}
