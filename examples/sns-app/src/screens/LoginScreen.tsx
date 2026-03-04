import { useEffect } from 'react';
import { useNavigation } from 'rehynav';
import { useAuth } from '../auth';

export function LoginScreen() {
  const navigation = useNavigation();
  const { isAuthenticated, login } = useAuth();

  // Redirect to tabs if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigation.navigateToTabs();
    }
  }, [isAuthenticated, navigation]);

  const handleLogin = () => {
    login();
    navigation.navigateToTabs();
  };

  if (isAuthenticated) return null;

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Welcome</h1>
      </header>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          placeholder="Username"
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Password"
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
          onClick={handleLogin}
        >
          Log In
        </button>
        <button
          type="button"
          style={{
            padding: '10px 16px',
            background: 'transparent',
            color: '#4a90d9',
            border: '1px solid #4a90d9',
            borderRadius: 4,
            cursor: 'pointer',
          }}
          onClick={() => navigation.push('/login/signup')}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
