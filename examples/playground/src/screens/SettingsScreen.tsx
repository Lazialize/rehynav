import { useRoute, useTab } from 'rehynav';

export function SettingsScreen() {
  const tab = useTab();
  const route = useRoute();

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Settings</h1>
      </header>

      <div className="section">
        <div className="section-title">Route Info</div>
        <div className="info-row">
          <span className="info-label">Route</span>
          <span className="info-value">{route.name}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Path</span>
          <span className="info-value">{route.path ?? 'N/A'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Active Tab</span>
          <span className="info-value">{tab.activeTab}</span>
        </div>
        <div className="info-row">
          <span className="info-label">URL</span>
          <span className="info-value">{window.location.pathname}</span>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Tab Actions</div>
        <div className="action-list">
          <button type="button" className="btn" onClick={() => tab.switchTabAndReset('home')}>
            switchTabAndReset(home)
          </button>
          <button type="button" className="btn" onClick={() => tab.setBadge('home', 'new')}>
            setBadge(home, 'new')
          </button>
          <button type="button" className="btn" onClick={() => tab.setBadge('home', undefined)}>
            clearBadge(home)
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">URL Sync Info (snapshot at render time)</div>
        <div className="log-area">
          {`location.pathname: ${window.location.pathname}\nlocation.search: ${window.location.search}\nlocation.hash: ${window.location.hash}`}
        </div>
      </div>
    </div>
  );
}
