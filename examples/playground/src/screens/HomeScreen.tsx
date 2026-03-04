import { useNavigation, useOverlay, useRoute, useTab } from 'rehynav';

export function HomeScreen() {
  const navigation = useNavigation();
  const overlay = useOverlay();
  const tab = useTab();
  const route = useRoute();

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Playground Home</h1>
      </header>

      <div className="section">
        <div className="section-title">Current State</div>
        <div className="info-row">
          <span className="info-label">Route</span>
          <span className="info-value">{route.name}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Active Tab</span>
          <span className="info-value">{tab.activeTab}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Can Go Back</span>
          <span className="info-value">{navigation.canGoBack() ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Stack Navigation</div>
        <div className="action-list">
          <button
            type="button"
            className="btn"
            onClick={() => navigation.push('home/detail/:id', { id: '1' })}
          >
            push detail/1
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => navigation.push('home/detail/:id', { id: '2' })}
          >
            push detail/2
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => navigation.push('home/detail/:id', { id: 'nested' })}
          >
            push detail/nested (deep stack test)
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Tab Navigation</div>
        <div className="action-list">
          {tab.tabs.map((t) => (
            <button key={t} type="button" className="btn" onClick={() => tab.switchTab(t)}>
              switchTab({t})
            </button>
          ))}
          <button type="button" className="btn" onClick={() => tab.setBadge('probes', 3)}>
            setBadge(probes, 3)
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Overlays</div>
        <div className="action-list">
          <button type="button" className="btn" onClick={() => overlay.open('confirm')}>
            open confirm overlay
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => overlay.open('detail-overlay', { title: 'Test' })}
          >
            open detail overlay
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Screen Layer</div>
        <div className="action-list">
          <button type="button" className="btn" onClick={() => navigation.navigateToScreen('auth')}>
            navigateToScreen(auth)
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Back</div>
        <div className="action-list">
          <button type="button" className="btn btn-primary" onClick={() => navigation.goBack()}>
            goBack()
          </button>
        </div>
      </div>
    </div>
  );
}
