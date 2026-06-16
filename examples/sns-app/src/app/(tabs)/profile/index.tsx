import { Link } from 'rehynav';

export default function ProfileScreen() {
  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#1d9bf0',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 24,
          }}
        >
          Y
        </div>
        <div>
          <strong>@you</strong>
          <p style={{ color: '#888' }}>rehynav enthusiast</p>
        </div>
      </div>
      <Link href="/profile/settings">⚙️ Settings</Link>
    </div>
  );
}
