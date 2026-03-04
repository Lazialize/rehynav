import { useNavigation } from 'rehynav';

export function AuthScreen() {
  const navigation = useNavigation();

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Auth (Screens Layer)</h1>
      </header>

      <div className="section">
        <div className="section-title">Info</div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
          This screen is in the <strong>screens</strong> layer, which replaces the tabs layer. Used
          for flows like login/signup that should be full-screen.
        </p>
      </div>

      <div className="section">
        <div className="section-title">Actions</div>
        <div className="action-list">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigation.navigateToTabs()}
          >
            navigateToTabs() — go to tabs layer
          </button>
          <button type="button" className="btn" onClick={() => navigation.navigateToTabs('probes')}>
            navigateToTabs('probes')
          </button>
        </div>
      </div>
    </div>
  );
}
