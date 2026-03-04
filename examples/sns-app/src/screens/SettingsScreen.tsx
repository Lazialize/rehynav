import { useNavigation } from 'rehynav';
import { useAuth } from '../auth';

export function SettingsScreen() {
  const navigation = useNavigation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigation.navigateToScreen('/login');
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <button type="button" onClick={() => navigation.goBack()}>
          ← Back
        </button>
        <h1>Settings</h1>
      </header>

      <div className="settings-list">
        <div className="settings-item">Notifications</div>
        <div className="settings-item">Privacy</div>
        <div className="settings-item">Account</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {/* popToRoot — jump back to the tab's root screen */}
        <button type="button" className="pop-root-button" onClick={() => navigation.popToRoot()}>
          Back to Profile (popToRoot)
        </button>

        <button
          type="button"
          style={{
            width: '100%',
            padding: 12,
            background: 'none',
            border: '1px solid #e74c3c',
            color: '#e74c3c',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
          }}
          onClick={handleLogout}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
