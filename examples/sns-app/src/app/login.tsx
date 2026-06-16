import { Link, useRouter } from 'rehynav';
import { useAuth } from '../auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  return (
    <div className="screen">
      <h1>rehynav SNS</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>File-based navigation demo</p>
      <button
        type="button"
        onClick={() => {
          login();
          router.replace('/');
        }}
      >
        Log in
      </button>
      <p style={{ marginTop: 16 }}>
        No account? <Link href="/signup">Create one</Link>
      </p>
    </div>
  );
}
