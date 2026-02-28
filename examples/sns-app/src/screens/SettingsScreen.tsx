import { useNavigation } from 'rehynav';

export function SettingsScreen() {
  const navigation = useNavigation();

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

      {/* popToRoot — jump back to the tab's root screen */}
      <button type="button" className="pop-root-button" onClick={() => navigation.popToRoot()}>
        Back to Profile (popToRoot)
      </button>
    </div>
  );
}
