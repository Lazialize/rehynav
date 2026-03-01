import { useNavigation } from 'rehynav';
import { useAuth } from '../auth';

export function SignupScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();

  return (
    <div className="screen">
      <header className="screen-header">
        <button
          type="button"
          onClick={() => navigation.goBack()}
          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
        >
          &larr; Back
        </button>
        <h1>Sign Up</h1>
      </header>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          placeholder="Username"
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <input
          type="email"
          placeholder="Email"
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Password"
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <button
          type="button"
          style={{
            padding: '10px 16px',
            background: '#4a90d9',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
          onClick={() => {
            login();
            navigation.navigateToTabs();
          }}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
