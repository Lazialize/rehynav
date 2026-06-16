import { useRouter } from 'rehynav';
import { useAuth } from '../auth';

export default function SignupScreen() {
  const { login } = useAuth();
  const router = useRouter();

  return (
    <div className="screen">
      <h1>Create account</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Demo signup — no data is stored.</p>
      <button
        type="button"
        onClick={() => {
          login();
          router.replace('/');
        }}
      >
        Sign up &amp; continue
      </button>
      <p style={{ marginTop: 16 }}>
        <button type="button" onClick={() => router.back()}>
          Back to login
        </button>
      </p>
    </div>
  );
}
