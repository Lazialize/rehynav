import { useNavigation, useTab } from 'rehynav';

export function ProfileScreen() {
  const navigation = useNavigation();
  const tab = useTab();

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Profile</h1>
      </header>

      <div className="profile-card">
        <div className="avatar">You</div>
        <h2>@you</h2>
        <p>Mobile app developer</p>
      </div>

      <div className="action-list">
        {/* push — imperative stack navigation */}
        <button type="button" onClick={() => navigation.push('/profile/settings')}>
          Settings →
        </button>

        {/* setBadge — show a notification badge on the Home tab */}
        <button type="button" onClick={() => tab.setBadge('home', 3)}>
          Set Home badge to 3
        </button>
        <button type="button" onClick={() => tab.setBadge('home', undefined)}>
          Clear Home badge
        </button>
      </div>
    </div>
  );
}
