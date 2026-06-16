import { useRouter } from 'rehynav';
import { useAuth } from '../../../auth';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <div className="screen">
      <p style={{ marginBottom: 24 }}>Manage your account.</p>
      <button
        type="button"
        onClick={() => {
          logout();
          router.replace('/login');
        }}
      >
        Log out
      </button>
    </div>
  );
}
