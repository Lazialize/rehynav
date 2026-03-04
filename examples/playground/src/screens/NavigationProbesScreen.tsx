import { Link, useNavigation, useOverlay, useRoute } from 'rehynav';

/**
 * Navigation probes screen — tests for known bug scenarios.
 * Each probe corresponds to a known issue and provides manual reproduction steps.
 *
 * Related: #21 (initialTab mismatch), #22 (basePath handling),
 *          #23 (Link prop forwarding), #24 (duplicate route keys)
 */
export function NavigationProbesScreen() {
  const navigation = useNavigation();
  const overlay = useOverlay();
  const route = useRoute();

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Probes</h1>
      </header>

      {/* Probe: Link prop forwarding (#23) */}
      <div className="probe-card">
        <div className="probe-title">#23 Link Prop Forwarding</div>
        <div className="probe-desc">
          Verify that native anchor props (className, data-*, aria-*) are forwarded to the rendered
          anchor element.
        </div>
        <ol className="probe-steps">
          <li>Inspect the link below in DevTools</li>
          <li>Verify className, data-testid, and aria-label are present on the anchor</li>
        </ol>
        <Link
          to="home/detail/:id"
          params={{ id: 'link-test' }}
          className="btn btn-sm"
          data-testid="probe-link"
          aria-label="Navigate to link test detail"
          style={{ display: 'inline-block', textDecoration: 'none' }}
        >
          Link with custom props
        </Link>
      </div>

      {/* Probe: Back behavior priority */}
      <div className="probe-card">
        <div className="probe-title">Back Behavior Priority</div>
        <div className="probe-desc">
          Verify: close overlay &gt; pop screen stack &gt; pop tab stack &gt; no-op at root.
        </div>
        <ol className="probe-steps">
          <li>Open an overlay below</li>
          <li>Call goBack() — overlay should close</li>
          <li>Push a detail screen, then goBack() — should pop stack</li>
          <li>At tab root, goBack() — should be no-op</li>
        </ol>
        <div className="action-list">
          <button type="button" className="btn btn-sm" onClick={() => overlay.open('confirm')}>
            1. Open overlay
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => navigation.push('home/detail/:id', { id: 'back-test' })}
          >
            2. Push detail screen
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => navigation.goBack()}
          >
            3. goBack()
          </button>
        </div>
      </div>

      {/* Probe: Screen layer switch */}
      <div className="probe-card">
        <div className="probe-title">Screen Layer Switch</div>
        <div className="probe-desc">
          Verify switching between tabs and screens layers works correctly.
        </div>
        <ol className="probe-steps">
          <li>Navigate to auth screen (screens layer)</li>
          <li>Navigate back to tabs</li>
          <li>Verify tab state is preserved</li>
        </ol>
        <div className="action-list">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => navigation.navigateToScreen('auth')}
          >
            Switch to screens layer
          </button>
        </div>
      </div>

      {/* Probe: Overlay stacking */}
      <div className="probe-card">
        <div className="probe-title">Overlay Stacking</div>
        <div className="probe-desc">
          Verify that multiple overlays can be stacked and closed in LIFO order.
        </div>
        <ol className="probe-steps">
          <li>Open confirm overlay</li>
          <li>From inside, open detail-overlay</li>
          <li>Close should dismiss top overlay first</li>
        </ol>
        <div className="action-list">
          <button type="button" className="btn btn-sm" onClick={() => overlay.open('confirm')}>
            Open first overlay
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => overlay.open('detail-overlay', { title: 'Stacked' })}
          >
            Open second overlay
          </button>
        </div>
      </div>

      {/* Current state display */}
      <div className="section" style={{ marginTop: 16 }}>
        <div className="section-title">Current State</div>
        <div className="info-row">
          <span className="info-label">Route</span>
          <span className="info-value">{route.name}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Overlay Open</span>
          <span className="info-value">{overlay.isOpen ? `Yes (${overlay.current})` : 'No'}</span>
        </div>
      </div>
    </div>
  );
}
